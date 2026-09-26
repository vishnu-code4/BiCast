// ============================================================
// BiCAST Trip Repository
// Dual-mode persistence: Prisma (PostgreSQL) when connected,
// with resilient JSON file fallback for offline/development environments.
// ============================================================
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  SavedTrip,
  TripListItem,
  CreateTripInput,
  UpdateTripInput,
  TripQueryOptions,
  TripStatus,
} from '../types/trip';
import { evaluateTripFreshness, generateDefaultTripName } from '../config/tripRules';
import { logger } from '../utils/logger';

export class TripRepository {
  private prisma: PrismaClient;
  private isPostgresConnected: boolean | null = null;
  private fallbackFilePath: string;
  private memoryStore: Map<string, SavedTrip> = new Map();
  private isInitialized = false;

  constructor() {
    this.prisma = new PrismaClient();
    this.fallbackFilePath = path.join(__dirname, '../../data/trips.json');
  }

  /**
   * Probes database connectivity on startup.
   */
  private async checkDatabaseConnection(): Promise<boolean> {
    if (this.isPostgresConnected !== null) {
      return this.isPostgresConnected;
    }

    try {
      // 1-second timeout probe
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 1000)),
      ]);
      this.isPostgresConnected = true;
      logger.info('Connected to PostgreSQL database via Prisma.');
      return true;
    } catch {
      this.isPostgresConnected = false;
      logger.info('PostgreSQL unavailable — using resilient local file storage for trips.');
      this.initFallbackStore();
      return false;
    }
  }

  /**
   * Initializes local fallback JSON file storage.
   */
  private initFallbackStore(): void {
    if (this.isInitialized) return;
    try {
      const dir = path.dirname(this.fallbackFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.fallbackFilePath)) {
        const raw = fs.readFileSync(this.fallbackFilePath, 'utf-8');
        const list: SavedTrip[] = JSON.parse(raw);
        for (const t of list) {
          this.memoryStore.set(t.id, t);
        }
      }
      this.isInitialized = true;
    } catch (err) {
      logger.warn(`Could not initialize fallback trip storage: ${err}`);
      this.isInitialized = true;
    }
  }

  private persistFallbackStore(): void {
    try {
      const list = Array.from(this.memoryStore.values());
      fs.writeFileSync(this.fallbackFilePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      logger.error(`Failed persisting fallback trip storage: ${err}`);
    }
  }

  /**
   * Finds trips matching query options with pagination and freshness evaluation.
   */
  async findMany(options: TripQueryOptions): Promise<{ trips: TripListItem[]; total: number }> {
    const isDbAvailable = await this.checkDatabaseConnection();

    if (isDbAvailable) {
      try {
        const where: any = {};
        if (options.status && options.status !== 'ALL') {
          where.status = options.status;
        }
        if (options.search) {
          where.OR = [
            { name: { contains: options.search, mode: 'insensitive' } },
            { startName: { contains: options.search, mode: 'insensitive' } },
            { endName: { contains: options.search, mode: 'insensitive' } },
          ];
        }

        const orderBy: any = {};
        if (options.sort === 'newest') orderBy.createdAt = 'desc';
        else if (options.sort === 'oldest') orderBy.createdAt = 'asc';
        else if (options.sort === 'journeyDate') orderBy.departureDate = 'asc';

        const [dbTrips, total] = await Promise.all([
          this.prisma.trip.findMany({
            where,
            orderBy,
            skip: (options.page - 1) * options.limit,
            take: options.limit,
            include: { stops: true },
          }),
          this.prisma.trip.count({ where }),
        ]);

        const trips = dbTrips.map((t) => this.mapDbTripToListItem(t));
        return { trips, total };
      } catch (err) {
        logger.warn(`Prisma findMany error, falling back to local store: ${err}`);
      }
    }

    // Local file / in-memory fallback
    this.initFallbackStore();
    let all = Array.from(this.memoryStore.values());

    if (options.status && options.status !== 'ALL') {
      all = all.filter((t) => t.status === options.status);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      all = all.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.startLocation.name.toLowerCase().includes(q) ||
          t.destination.name.toLowerCase().includes(q),
      );
    }

    if (options.sort === 'newest') {
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (options.sort === 'oldest') {
      all.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (options.sort === 'journeyDate') {
      all.sort((a, b) => `${a.journeyDate} ${a.departureTime}`.localeCompare(`${b.journeyDate} ${b.departureTime}`));
    }

    const total = all.length;
    const paginated = all.slice((options.page - 1) * options.limit, options.page * options.limit);
    const trips = paginated.map((t) => this.mapSavedTripToListItem(t));

    return { trips, total };
  }

  /**
   * Retrieves a single trip by ID.
   */
  async findById(id: string): Promise<SavedTrip | null> {
    const isDbAvailable = await this.checkDatabaseConnection();

    if (isDbAvailable) {
      try {
        const t = await this.prisma.trip.findUnique({
          where: { id },
          include: { stops: { orderBy: { sequence: 'asc' } } },
        });
        if (t) return this.mapDbTripToSavedTrip(t);
      } catch (err) {
        logger.warn(`Prisma findById error, falling back to local store: ${err}`);
      }
    }

    this.initFallbackStore();
    const trip = this.memoryStore.get(id);
    if (!trip) return null;

    // Attach evaluated freshness
    return {
      ...trip,
      freshness: evaluateTripFreshness(trip),
    };
  }

  /**
   * Creates a new trip with independent stops and initial snapshot if provided.
   */
  async create(input: CreateTripInput): Promise<SavedTrip> {
    const name = input.name?.trim() || generateDefaultTripName(input.destination.name);
    const tripId = `trip_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();

    const snapshot = input.initialSnapshot;
    const isDbAvailable = await this.checkDatabaseConnection();

    if (isDbAvailable) {
      try {
        const departureIso = new Date(`${input.journeyDate}T${input.departureTime}:00Z`);

        const created = await this.prisma.$transaction(async (tx) => {
          const trip = await tx.trip.create({
            data: {
              id: tripId,
              name,
              status: input.status,
              startName: input.startLocation.name,
              startLat: input.startLocation.latitude,
              startLng: input.startLocation.longitude,
              endName: input.destination.name,
              endLat: input.destination.latitude,
              endLng: input.destination.longitude,
              departureDate: departureIso,
              departureTime: input.departureTime,
              timezone: input.timezone,
              // Fuel config
              mileageKmPerLitre: input.fuelConfig?.mileageKmPerLitre,
              fuelPricePerLitre: input.fuelConfig?.fuelPricePerLitre,
              currentFuelLitres: input.fuelConfig?.currentFuelLitres,
              fuelTankCapacityLitres: input.fuelConfig?.fuelTankCapacityLitres,
              reserveLitres: input.fuelConfig?.reserveLitres,
              // Initial snapshot
              lastCalculatedAt: snapshot ? new Date() : null,
              selectedRouteId: snapshot?.selectedRouteId,
              distanceMeters: snapshot?.route?.distanceMeters,
              durationSeconds: snapshot?.route?.durationSeconds,
              routePolyline: snapshot?.route?.geometry ? JSON.stringify(snapshot.route.geometry) : null,
              safetyScore: snapshot?.riskAnalysis?.overallScore,
              riskLevel: snapshot?.riskAnalysis?.overallLevel as any,
              riskSummary: snapshot?.riskAnalysis?.primaryConcern,
              routeSnapshot: snapshot?.route ? (snapshot.route as any) : undefined,
              weatherSnapshotSummary: snapshot?.weatherTimeline ? (snapshot.weatherTimeline as any) : undefined,
              riskSnapshot: snapshot?.riskAnalysis ? (snapshot.riskAnalysis as any) : undefined,
              fuelSnapshot: snapshot?.fuelPlan ? (snapshot.fuelPlan as any) : undefined,
            },
          });

          // Insert stops
          if (input.stops.length > 0) {
            await tx.tripStop.createMany({
              data: input.stops.map((s, idx) => ({
                id: s.id || `stop_${crypto.randomUUID().slice(0, 10)}`,
                tripId: trip.id,
                sequence: s.sequence ?? idx + 1,
                name: s.name,
                lat: s.latitude,
                lng: s.longitude,
                placeId: s.placeId,
                userDefined: s.userDefined ?? true,
                source: s.source ?? 'manual',
              })),
            });
          }

          return tx.trip.findUnique({
            where: { id: trip.id },
            include: { stops: { orderBy: { sequence: 'asc' } } },
          });
        });

        if (created) return this.mapDbTripToSavedTrip(created);
      } catch (err) {
        logger.warn(`Prisma transaction failed, using local store: ${err}`);
      }
    }

    // Fallback store
    this.initFallbackStore();

    const savedTrip: SavedTrip = {
      id: tripId,
      userId: null,
      name,
      status: input.status,
      startLocation: input.startLocation,
      destination: input.destination,
      stops: input.stops.map((s, idx) => ({
        id: s.id || `stop_${crypto.randomUUID().slice(0, 10)}`,
        sequence: s.sequence ?? idx + 1,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        placeId: s.placeId,
        userDefined: s.userDefined ?? true,
        source: s.source ?? 'manual',
      })),
      journeyDate: input.journeyDate,
      departureTime: input.departureTime,
      timezone: input.timezone,
      fuelConfig: input.fuelConfig,
      lastCalculatedAt: snapshot ? now : null,
      selectedRouteId: snapshot?.selectedRouteId,
      distanceMeters: snapshot?.route?.distanceMeters,
      durationSeconds: snapshot?.route?.durationSeconds,
      estimatedArrival: snapshot?.route?.arrivalTime,
      routePolyline: snapshot?.route?.geometry ? JSON.stringify(snapshot.route.geometry) : null,
      safetyScore: snapshot?.riskAnalysis?.overallScore,
      riskLevel: snapshot?.riskAnalysis?.overallLevel,
      riskSummary: snapshot?.riskAnalysis?.primaryConcern,
      snapshots: snapshot
        ? {
            lastCalculatedAt: now,
            selectedRouteId: snapshot.selectedRouteId,
            route: snapshot.route,
            alternatives: snapshot.alternatives,
            weatherTimeline: snapshot.weatherTimeline,
            riskAnalysis: snapshot.riskAnalysis,
            fuelPlan: snapshot.fuelPlan,
          }
        : undefined,
      createdAt: now,
      updatedAt: now,
    };

    savedTrip.freshness = evaluateTripFreshness(savedTrip);
    this.memoryStore.set(tripId, savedTrip);
    this.persistFallbackStore();
    return savedTrip;
  }

  /**
   * Updates an existing trip's configuration.
   */
  async update(id: string, input: UpdateTripInput): Promise<SavedTrip | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const isDbAvailable = await this.checkDatabaseConnection();
    const now = new Date().toISOString();

    if (isDbAvailable) {
      try {
        const updateData: any = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.status !== undefined) updateData.status = input.status;
        if (input.status === 'COMPLETED') updateData.completedAt = new Date();
        if (input.startLocation) {
          updateData.startName = input.startLocation.name;
          updateData.startLat = input.startLocation.latitude;
          updateData.startLng = input.startLocation.longitude;
        }
        if (input.destination) {
          updateData.endName = input.destination.name;
          updateData.endLat = input.destination.latitude;
          updateData.endLng = input.destination.longitude;
        }
        if (input.journeyDate && input.departureTime) {
          updateData.departureDate = new Date(`${input.journeyDate}T${input.departureTime}:00Z`);
          updateData.departureTime = input.departureTime;
        } else if (input.departureTime) {
          updateData.departureTime = input.departureTime;
        }
        if (input.timezone) updateData.timezone = input.timezone;
        if (input.fuelConfig) {
          updateData.mileageKmPerLitre = input.fuelConfig.mileageKmPerLitre;
          updateData.fuelPricePerLitre = input.fuelConfig.fuelPricePerLitre;
          updateData.currentFuelLitres = input.fuelConfig.currentFuelLitres;
          updateData.fuelTankCapacityLitres = input.fuelConfig.fuelTankCapacityLitres;
          updateData.reserveLitres = input.fuelConfig.reserveLitres;
        }

        const updated = await this.prisma.$transaction(async (tx) => {
          if (input.stops) {
            // Replace stops
            await tx.tripStop.deleteMany({ where: { tripId: id } });
            if (input.stops.length > 0) {
              await tx.tripStop.createMany({
                data: input.stops.map((s, idx) => ({
                  id: s.id || `stop_${crypto.randomUUID().slice(0, 10)}`,
                  tripId: id,
                  sequence: s.sequence ?? idx + 1,
                  name: s.name,
                  lat: s.latitude,
                  lng: s.longitude,
                  placeId: s.placeId,
                  userDefined: s.userDefined ?? true,
                  source: s.source ?? 'manual',
                })),
              });
            }
          }

          return tx.trip.update({
            where: { id },
            data: updateData,
            include: { stops: { orderBy: { sequence: 'asc' } } },
          });
        });

        return this.mapDbTripToSavedTrip(updated);
      } catch (err) {
        logger.warn(`Prisma update failed, using local store: ${err}`);
      }
    }

    // Fallback store update
    this.initFallbackStore();
    const current = this.memoryStore.get(id);
    if (!current) return null;

    if (input.name !== undefined) current.name = input.name;
    if (input.status !== undefined) current.status = input.status;
    if (input.status === 'COMPLETED') current.completedAt = now;
    if (input.startLocation) current.startLocation = input.startLocation;
    if (input.destination) current.destination = input.destination;
    if (input.journeyDate) current.journeyDate = input.journeyDate;
    if (input.departureTime) current.departureTime = input.departureTime;
    if (input.timezone) current.timezone = input.timezone;
    if (input.fuelConfig) current.fuelConfig = { ...current.fuelConfig, ...input.fuelConfig };
    if (input.stops) {
      current.stops = input.stops.map((s, idx) => ({
        id: s.id || `stop_${crypto.randomUUID().slice(0, 10)}`,
        sequence: s.sequence ?? idx + 1,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        placeId: s.placeId,
        userDefined: s.userDefined ?? true,
        source: s.source ?? 'manual',
      }));
    }
    current.updatedAt = now;
    current.freshness = evaluateTripFreshness(current);

    this.memoryStore.set(id, current);
    this.persistFallbackStore();
    return current;
  }

  /**
   * Updates calculated snapshots after recalculation.
   */
  async updateSnapshots(
    id: string,
    snapshotData: {
      selectedRouteId: string;
      route: any;
      alternatives?: any[];
      weatherTimeline?: any;
      riskAnalysis?: any;
      fuelPlan?: any;
    },
  ): Promise<SavedTrip | null> {
    const isDbAvailable = await this.checkDatabaseConnection();
    const now = new Date().toISOString();

    if (isDbAvailable) {
      try {
        const updated = await this.prisma.trip.update({
          where: { id },
          data: {
            lastCalculatedAt: new Date(),
            selectedRouteId: snapshotData.selectedRouteId,
            distanceMeters: snapshotData.route.distanceMeters,
            durationSeconds: snapshotData.route.durationSeconds,
            estimatedArrival: snapshotData.route.arrivalTime ? new Date(snapshotData.route.arrivalTime) : null,
            routePolyline: JSON.stringify(snapshotData.route.geometry),
            safetyScore: snapshotData.riskAnalysis?.overallScore,
            riskLevel: snapshotData.riskAnalysis?.overallLevel as any,
            riskSummary: snapshotData.riskAnalysis?.primaryConcern,
            routeSnapshot: snapshotData.route,
            weatherSnapshotSummary: snapshotData.weatherTimeline,
            riskSnapshot: snapshotData.riskAnalysis,
            fuelSnapshot: snapshotData.fuelPlan,
          },
          include: { stops: { orderBy: { sequence: 'asc' } } },
        });

        return this.mapDbTripToSavedTrip(updated);
      } catch (err) {
        logger.warn(`Prisma updateSnapshots failed, using local store: ${err}`);
      }
    }

    this.initFallbackStore();
    const trip = this.memoryStore.get(id);
    if (!trip) return null;

    trip.lastCalculatedAt = now;
    trip.selectedRouteId = snapshotData.selectedRouteId;
    trip.distanceMeters = snapshotData.route.distanceMeters;
    trip.durationSeconds = snapshotData.route.durationSeconds;
    trip.estimatedArrival = snapshotData.route.arrivalTime;
    trip.routePolyline = JSON.stringify(snapshotData.route.geometry);
    trip.safetyScore = snapshotData.riskAnalysis?.overallScore;
    trip.riskLevel = snapshotData.riskAnalysis?.overallLevel;
    trip.riskSummary = snapshotData.riskAnalysis?.primaryConcern;
    trip.snapshots = {
      lastCalculatedAt: now,
      selectedRouteId: snapshotData.selectedRouteId,
      route: snapshotData.route,
      alternatives: snapshotData.alternatives,
      weatherTimeline: snapshotData.weatherTimeline,
      riskAnalysis: snapshotData.riskAnalysis,
      fuelPlan: snapshotData.fuelPlan,
    };
    trip.updatedAt = now;
    trip.freshness = evaluateTripFreshness(trip);

    this.memoryStore.set(id, trip);
    this.persistFallbackStore();
    return trip;
  }

  /**
   * Duplicates an existing trip with a new ID, independent stops copy, and copied configuration.
   */
  async duplicate(id: string, newName?: string): Promise<SavedTrip | null> {
    const source = await this.findById(id);
    if (!source) return null;

    const copyName = newName?.trim() || `${source.name} Copy`;
    const newId = `trip_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();

    const isDbAvailable = await this.checkDatabaseConnection();

    if (isDbAvailable) {
      try {
        const departureIso = new Date(`${source.journeyDate}T${source.departureTime}:00Z`);

        const created = await this.prisma.$transaction(async (tx) => {
          const trip = await tx.trip.create({
            data: {
              id: newId,
              name: copyName,
              status: 'PLANNED',
              startName: source.startLocation.name,
              startLat: source.startLocation.latitude,
              startLng: source.startLocation.longitude,
              endName: source.destination.name,
              endLat: source.destination.latitude,
              endLng: source.destination.longitude,
              departureDate: departureIso,
              departureTime: source.departureTime,
              timezone: source.timezone,
              mileageKmPerLitre: source.fuelConfig?.mileageKmPerLitre,
              fuelPricePerLitre: source.fuelConfig?.fuelPricePerLitre,
              currentFuelLitres: source.fuelConfig?.currentFuelLitres,
              fuelTankCapacityLitres: source.fuelConfig?.fuelTankCapacityLitres,
              reserveLitres: source.fuelConfig?.reserveLitres,
              // Copy snapshot if valid
              lastCalculatedAt: source.lastCalculatedAt ? new Date(source.lastCalculatedAt) : null,
              selectedRouteId: source.selectedRouteId,
              distanceMeters: source.distanceMeters,
              durationSeconds: source.durationSeconds,
              routePolyline: source.routePolyline,
              safetyScore: source.safetyScore,
              riskLevel: source.riskLevel as any,
              riskSummary: source.riskSummary,
            },
          });

          // Independent copies of stops
          if (source.stops.length > 0) {
            await tx.tripStop.createMany({
              data: source.stops.map((s) => ({
                id: `stop_${crypto.randomUUID().slice(0, 10)}`,
                tripId: trip.id,
                sequence: s.sequence,
                name: s.name,
                lat: s.latitude,
                lng: s.longitude,
                placeId: s.placeId,
                userDefined: s.userDefined ?? true,
                source: s.source ?? 'manual',
              })),
            });
          }

          return tx.trip.findUnique({
            where: { id: trip.id },
            include: { stops: { orderBy: { sequence: 'asc' } } },
          });
        });

        if (created) return this.mapDbTripToSavedTrip(created);
      } catch (err) {
        logger.warn(`Prisma duplicate transaction failed, using local store: ${err}`);
      }
    }

    // Local fallback copy
    this.initFallbackStore();

    const clonedTrip: SavedTrip = {
      ...source,
      id: newId,
      name: copyName,
      status: 'PLANNED',
      stops: source.stops.map((s) => ({
        ...s,
        id: `stop_${crypto.randomUUID().slice(0, 10)}`,
      })),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    clonedTrip.freshness = evaluateTripFreshness(clonedTrip);

    this.memoryStore.set(newId, clonedTrip);
    this.persistFallbackStore();
    return clonedTrip;
  }

  /**
   * Destructively deletes a trip and cascades stop/snapshot deletion.
   */
  async delete(id: string): Promise<boolean> {
    const isDbAvailable = await this.checkDatabaseConnection();

    if (isDbAvailable) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.tripStop.deleteMany({ where: { tripId: id } });
          await tx.weatherAlert.deleteMany({ where: { tripId: id } });
          await tx.weatherSnapshot.deleteMany({ where: { tripId: id } });
          await tx.trip.delete({ where: { id } });
        });
        return true;
      } catch (err) {
        logger.warn(`Prisma delete failed, using local store: ${err}`);
      }
    }

    this.initFallbackStore();
    const existed = this.memoryStore.delete(id);
    if (existed) {
      this.persistFallbackStore();
    }
    return existed;
  }

  // --- Mappers ---

  private mapDbTripToSavedTrip(t: any): SavedTrip {
    const journeyDate = t.departureDate instanceof Date ? t.departureDate.toISOString().slice(0, 10) : String(t.departureDate).slice(0, 10);

    const trip: SavedTrip = {
      id: t.id,
      userId: t.userId,
      name: t.name,
      status: t.status as TripStatus,
      startLocation: {
        name: t.startName,
        latitude: t.startLat,
        longitude: t.startLng,
      },
      destination: {
        name: t.endName,
        latitude: t.endLat,
        longitude: t.endLng,
      },
      stops: (t.stops || []).map((s: any) => ({
        id: s.id,
        sequence: s.sequence,
        name: s.name,
        latitude: s.lat,
        longitude: s.lng,
        placeId: s.placeId || undefined,
        userDefined: s.userDefined ?? true,
        source: s.source || 'manual',
        distanceFromStart: s.distanceFromStart || undefined,
      })),
      journeyDate,
      departureTime: t.departureTime,
      timezone: t.timezone,
      fuelConfig:
        t.mileageKmPerLitre != null
          ? {
              mileageKmPerLitre: t.mileageKmPerLitre,
              fuelPricePerLitre: t.fuelPricePerLitre || undefined,
              currentFuelLitres: t.currentFuelLitres || undefined,
              fuelTankCapacityLitres: t.fuelTankCapacityLitres || undefined,
              reserveLitres: t.reserveLitres || undefined,
            }
          : undefined,
      lastCalculatedAt: t.lastCalculatedAt ? new Date(t.lastCalculatedAt).toISOString() : null,
      selectedRouteId: t.selectedRouteId,
      distanceMeters: t.distanceMeters,
      durationSeconds: t.durationSeconds,
      estimatedArrival: t.estimatedArrival ? new Date(t.estimatedArrival).toISOString() : null,
      routePolyline: t.routePolyline,
      safetyScore: t.safetyScore,
      riskLevel: t.riskLevel,
      riskSummary: t.riskSummary,
      snapshots: {
        lastCalculatedAt: t.lastCalculatedAt ? new Date(t.lastCalculatedAt).toISOString() : undefined,
        selectedRouteId: t.selectedRouteId || undefined,
        route: t.routeSnapshot || undefined,
        weatherTimeline: t.weatherSnapshotSummary || undefined,
        riskAnalysis: t.riskSnapshot || undefined,
        fuelPlan: t.fuelSnapshot || undefined,
      },
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date().toISOString(),
      completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : null,
    };

    trip.freshness = evaluateTripFreshness(trip);
    return trip;
  }

  private mapDbTripToListItem(t: any): TripListItem {
    const saved = this.mapDbTripToSavedTrip(t);
    return this.mapSavedTripToListItem(saved);
  }

  private mapSavedTripToListItem(t: SavedTrip): TripListItem {
    const fuelPlan = t.snapshots?.fuelPlan;
    return {
      id: t.id,
      name: t.name,
      status: t.status,
      startLocation: t.startLocation,
      destination: t.destination,
      stopsCount: t.stops.length,
      journeyDate: t.journeyDate,
      departureTime: t.departureTime,
      timezone: t.timezone,
      distanceKm: t.distanceMeters ? Number((t.distanceMeters / 1000).toFixed(1)) : undefined,
      durationMinutes: t.durationSeconds ? Math.round(t.durationSeconds / 60) : undefined,
      safetyScore: t.safetyScore ?? undefined,
      riskLevel: t.riskLevel ?? undefined,
      fuelRequiredLitres: fuelPlan?.calculation?.fuelRequiredLitres,
      fuelEstimatedCost: fuelPlan?.calculation?.estimatedCost,
      lastCalculatedAt: t.lastCalculatedAt,
      freshness: t.freshness || evaluateTripFreshness(t),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}

export const tripRepository = new TripRepository();
