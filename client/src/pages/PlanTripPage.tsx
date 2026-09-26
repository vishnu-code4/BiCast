// ============================================================
// BiCAST Plan Trip Page
// Complete Route Engine: Start, Destination, Edit Stops,
// Multiple Alternatives, 15-30m Smart Checkpoints & Leaflet Map
// ============================================================
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  MapPin,
  Calendar,
  Clock,
  Search,
  Loader2,
  ChevronRight,
  Bike,
  PlusCircle,
  AlertCircle,
  Bookmark,
  Check,
} from 'lucide-react';
import { geocodeSearch, GeocodeResult } from '@/services/geocodingService';
import { planRoute, recalculateRouteETAsLocally } from '@/services/routeService';
import { fetchMultiRouteWeatherTimelines } from '@/services/weatherService';
import { fetchMultiRouteRisk } from '@/services/riskService';
import { fetchPlacesAlongRoute } from '@/services/placesService';
import { PlaceCategoryId } from '@/config/placeCategories';
import { LocationInput, PlannedRoute } from '@/types/route';
import { RouteWeatherTimeline } from '@/types/weather';
import { RouteRiskAnalysis } from '@/types/risk';
import { Place } from '@/types/places';
import { FuelInput, RouteFuelPlan, FuelStationRecommendation } from '@/types/fuel';
import { calculateMultiRouteFuel } from '@/services/fuelService';
import { fetchTripById, useCreateTrip, useUpdateTrip } from '@/services/tripService';
import RouteMap from '@/components/map/RouteMap';
import RouteSummaryCard from '@/components/route/RouteSummaryCard';
import EditStopsModal from '@/components/route/EditStopsModal';
import PlaceCategorySelector from '@/components/places/PlaceCategorySelector';
import FuelSettingsCard from '@/components/fuel/FuelSettingsCard';
import FuelSummaryCard from '@/components/fuel/FuelSummaryCard';
import FuelStationRecommendationCard from '@/components/fuel/FuelStationRecommendationCard';
import SaveTripModal from '@/components/trips/SaveTripModal';

export default function PlanTripPage() {
  const [searchParams] = useSearchParams();
  const editTripId = searchParams.get('editTripId');

  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [startLocation, setStartLocation] = useState<LocationInput | null>(null);
  const [endLocation, setEndLocation] = useState<LocationInput | null>(null);
  const [stops, setStops] = useState<LocationInput[]>([]);
  const [isEditStopsOpen, setIsEditStopsOpen] = useState(false);

  // Saved trip management states
  const [loadedTripName, setLoadedTripName] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const createTripMutation = useCreateTrip();
  const updateTripMutation = useUpdateTrip();

  // Journey parameters
  const [departureDate, setDepartureDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]!;
  });
  const [departureTime, setDepartureTime] = useState('06:30');

  // Route calculation states
  const [routes, setRoutes] = useState<PlannedRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);

  // Weather timeline & Risk states
  const [weatherTimelines, setWeatherTimelines] = useState<Record<string, RouteWeatherTimeline>>({});
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [riskAnalyses, setRiskAnalyses] = useState<Record<string, RouteRiskAnalysis>>({});
  const [isRiskLoading, setIsRiskLoading] = useState(false);

  // Places Along Route state
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategoryId | null>(null);
  const [pendingPlaceStop, setPendingPlaceStop] = useState<LocationInput | null>(null);

  // Fuel Planning state
  const [fuelInput, setFuelInput] = useState<FuelInput>({
    mileageKmPerLitre: 0,
    fuelPricePerLitre: 103,
    reserveLitres: 1.5,
  });
  const [fuelPlans, setFuelPlans] = useState<Record<string, RouteFuelPlan>>({});

  // Debounced search queries to avoid Nominatim 429 rate limit
  const [debouncedStartQuery, setDebouncedStartQuery] = useState('');
  const [debouncedEndQuery, setDebouncedEndQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedStartQuery(startQuery), 350);
    return () => clearTimeout(timer);
  }, [startQuery]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEndQuery(endQuery), 350);
    return () => clearTimeout(timer);
  }, [endQuery]);

  const startSearchQuery = useQuery({
    queryKey: ['geocode', debouncedStartQuery],
    queryFn: () => geocodeSearch(debouncedStartQuery),
    enabled: debouncedStartQuery.trim().length > 2 && activeField === 'start',
    staleTime: 1000 * 30,
  });

  const endSearchQuery = useQuery({
    queryKey: ['geocode', debouncedEndQuery],
    queryFn: () => geocodeSearch(debouncedEndQuery),
    enabled: debouncedEndQuery.trim().length > 2 && activeField === 'end',
    staleTime: 1000 * 30,
  });

  // Places Along Route query
  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const placesQuery = useQuery({
    queryKey: ['route-places', activeRoute?.id, selectedCategory],
    queryFn: () =>
      fetchPlacesAlongRoute({
        route: activeRoute!,
        category: selectedCategory!,
        limit: 30,
      }),
    enabled: !!activeRoute && !!selectedCategory,
    staleTime: 1000 * 60 * 10,
  });

  const loadWeatherAndRiskForRoutes = async (currentRoutes: PlannedRoute[]) => {
    if (currentRoutes.length === 0) return;
    setIsWeatherLoading(true);
    setIsRiskLoading(true);
    try {
      const timelines = await fetchMultiRouteWeatherTimelines(currentRoutes, 'Asia/Kolkata');
      setWeatherTimelines(timelines);
      try {
        const risks = await fetchMultiRouteRisk(currentRoutes, timelines, 'Asia/Kolkata');
        setRiskAnalyses(risks);
      } catch (rErr) {
        console.warn('Risk analysis fetch failed:', rErr);
      }
    } catch (err) {
      console.warn('Weather fetch failed:', err);
    } finally {
      setIsWeatherLoading(false);
      setIsRiskLoading(false);
    }
  };

  const loadFuelForRoutes = async (currentRoutes: PlannedRoute[], currentInput: FuelInput) => {
    if (currentRoutes.length === 0 || !currentInput.mileageKmPerLitre || currentInput.mileageKmPerLitre <= 0) {
      setFuelPlans({});
      return;
    }
    try {
      const plans = await calculateMultiRouteFuel(currentRoutes, currentInput);
      setFuelPlans(plans);
    } catch (err) {
      console.warn('Fuel calculation failed:', err);
    }
  };

  const handleFuelInputChange = (newInput: FuelInput) => {
    setFuelInput(newInput);
    if (routes.length > 0) {
      loadFuelForRoutes(routes, newInput);
    }
  };

  // Preload saved trip when editing
  useEffect(() => {
    if (!editTripId) return;
    (async () => {
      try {
        const trip = await fetchTripById(editTripId);
        if (trip) {
          setLoadedTripName(trip.name);
          setStartLocation({
            name: trip.startLocation.name,
            lat: trip.startLocation.latitude,
            lng: trip.startLocation.longitude,
            placeId: trip.startLocation.placeId,
          });
          setStartQuery(trip.startLocation.name);
          setEndLocation({
            name: trip.destination.name,
            lat: trip.destination.latitude,
            lng: trip.destination.longitude,
            placeId: trip.destination.placeId,
          });
          setEndQuery(trip.destination.name);
          setStops(
            trip.stops.map((s) => ({
              name: s.name,
              lat: s.latitude,
              lng: s.longitude,
              placeId: s.placeId,
            })),
          );
          setDepartureDate(trip.journeyDate);
          setDepartureTime(trip.departureTime);
          if (trip.fuelConfig) {
            setFuelInput((prev) => ({ ...prev, ...trip.fuelConfig }));
          }
          if (trip.snapshots?.route) {
            setRoutes(trip.snapshots.alternatives || [trip.snapshots.route]);
            setSelectedRouteId(trip.selectedRouteId || trip.snapshots.route.id);
            if (trip.snapshots.weatherTimeline) {
              setWeatherTimelines({ [trip.snapshots.route.id]: trip.snapshots.weatherTimeline });
            }
            if (trip.snapshots.riskAnalysis) {
              setRiskAnalyses({ [trip.snapshots.route.id]: trip.snapshots.riskAnalysis });
            }
            if (trip.snapshots.fuelPlan) {
              setFuelPlans({ [trip.snapshots.route.id]: trip.snapshots.fuelPlan });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load trip for editing:', err);
      }
    })();
  }, [editTripId]);

  const handleSaveTrip = async (name: string) => {
    if (!startLocation || !endLocation) return;
    const activeRt = routes.find((r) => r.id === selectedRouteId) || routes[0];

    const snapshot = activeRt
      ? {
          selectedRouteId: activeRt.id,
          route: activeRt,
          alternatives: routes,
          weatherTimeline: weatherTimelines[selectedRouteId],
          riskAnalysis: riskAnalyses[selectedRouteId],
          fuelPlan: fuelPlans[selectedRouteId],
        }
      : undefined;

    const startLoc = {
      name: startLocation.name,
      latitude: startLocation.lat,
      longitude: startLocation.lng,
      placeId: startLocation.placeId,
    };
    const destLoc = {
      name: endLocation.name,
      latitude: endLocation.lat,
      longitude: endLocation.lng,
      placeId: endLocation.placeId,
    };
    const stopsList = stops.map((s, idx) => ({
      sequence: idx + 1,
      name: s.name,
      latitude: s.lat,
      longitude: s.lng,
      placeId: s.placeId,
      userDefined: true,
      source: 'manual' as const,
    }));

    try {
      if (editTripId) {
        await updateTripMutation.mutateAsync({
          id: editTripId,
          payload: {
            name,
            startLocation: startLoc,
            destination: destLoc,
            stops: stopsList,
            journeyDate: departureDate,
            departureTime,
            fuelConfig: fuelInput,
            selectedRouteId,
          },
        });
        setSaveSuccessMessage(`Trip "${name}" updated successfully!`);
      } else {
        const created = await createTripMutation.mutateAsync({
          name,
          startLocation: startLoc,
          destination: destLoc,
          stops: stopsList,
          journeyDate: departureDate,
          departureTime,
          fuelConfig: fuelInput,
          initialSnapshot: snapshot,
        });
        setSaveSuccessMessage(`Trip "${created.name}" saved successfully!`);
      }
      setIsSaveModalOpen(false);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Save trip error:', err);
    }
  };

  // Route calculation mutation
  const planRouteMutation = useMutation({
    mutationFn: planRoute,
    onSuccess: (data) => {
      setRoutes(data);
      if (data.length > 0) {
        setSelectedRouteId(data[0]!.id);
        loadWeatherAndRiskForRoutes(data);
        loadFuelForRoutes(data, fuelInput);
      }
      setErrorMessage(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to plan route';
      setErrorMessage(msg);
    },
  });

  const isReady = startLocation && endLocation && departureDate && departureTime;

  const handleStartSelect = (result: GeocodeResult) => {
    setStartLocation({
      name: result.name,
      lat: result.lat,
      lng: result.lng,
      placeId: result.placeId,
      formattedAddress: result.formattedAddress,
    });
    setStartQuery(result.name);
    setActiveField(null);
  };

  const handleEndSelect = (result: GeocodeResult) => {
    setEndLocation({
      name: result.name,
      lat: result.lat,
      lng: result.lng,
      placeId: result.placeId,
      formattedAddress: result.formattedAddress,
    });
    setEndQuery(result.name);
    setActiveField(null);
  };

  const handleCalculateRoute = (updatedStops?: LocationInput[]) => {
    if (!startLocation || !endLocation) return;
    const currentStops = updatedStops ?? stops;

    planRouteMutation.mutate({
      start: startLocation,
      destination: endLocation,
      stops: currentStops,
      journeyDate: departureDate,
      departureTime,
      timezone: 'Asia/Kolkata',
      alternatives: true,
    });
  };

  const handleStopsSave = (newStops: LocationInput[]) => {
    setStops(newStops);
    setPendingPlaceStop(null);
    // If a route is already generated, automatically recalculate with new stops
    if (routes.length > 0 && startLocation && endLocation) {
      handleCalculateRoute(newStops);
    }
  };

  const handleAddPlaceAsStop = (place: Place) => {
    const newStop: LocationInput = {
      name: place.name,
      lat: place.latitude,
      lng: place.longitude,
      placeId: place.placeId,
      formattedAddress: place.address,
      source: 'place',
      category: place.category,
    };
    setPendingPlaceStop(newStop);
    setIsEditStopsOpen(true);
  };

  const handleAddStationAsStop = (station: FuelStationRecommendation) => {
    const newStop: LocationInput = {
      name: station.name,
      lat: station.latitude,
      lng: station.longitude,
      placeId: station.placeId,
      formattedAddress: station.address,
      source: 'place',
      category: 'fuel',
    };
    setPendingPlaceStop(newStop);
    setIsEditStopsOpen(true);
  };

  const handleCloseEditStops = () => {
    setIsEditStopsOpen(false);
    setPendingPlaceStop(null);
  };

  // When departure date or time changes, update all route ETAs instantaneously
  const handleDepartureChange = (newDate: string, newTime: string) => {
    setDepartureDate(newDate);
    setDepartureTime(newTime);

    if (routes.length > 0) {
      const updated = routes.map((r) =>
        recalculateRouteETAsLocally(r, newDate, newTime, '+05:30'),
      );
      setRoutes(updated);
      loadWeatherAndRiskForRoutes(updated);
      loadFuelForRoutes(updated, fuelInput);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="section-label mb-2">Route Planning Engine</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Plan Your Journey</h1>
        <p className="text-white/50 mt-1.5 text-sm sm:text-base">
          Multi-stop route alternatives with smart 15–30 min travel-time checkpoints.
        </p>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-white/40 hover:text-white text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Route Summaries (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Route Locations Form */}
          <div className="glass rounded-2xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2 text-base">
                <MapPin size={18} className="text-brand-400" />
                Route & Stops
              </h2>

              {startLocation && endLocation && (
                <button
                  onClick={() => setIsEditStopsOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 py-1 px-2.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 transition-all"
                >
                  <PlusCircle size={14} />
                  Edit Stops {stops.length > 0 && `(${stops.length})`}
                </button>
              )}
            </div>

            {/* Start Location Input */}
            <div className="space-y-1.5">
              <label htmlFor="start-input" className="section-label text-[11px]">
                Origin (A)
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  id="start-input"
                  type="text"
                  className="input pl-10 text-sm"
                  placeholder="e.g. Bangalore, Karnataka"
                  value={startQuery}
                  onChange={(e) => {
                    setStartQuery(e.target.value);
                    setStartLocation(null);
                    setActiveField('start');
                  }}
                  onFocus={() => setActiveField('start')}
                />
                {startSearchQuery.isLoading && (
                  <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 animate-spin" />
                )}
              </div>

              {activeField === 'start' && startSearchQuery.data?.results && startSearchQuery.data.results.length > 0 && (
                <div className="glass rounded-xl border border-white/15 overflow-hidden mt-1 z-20 relative max-h-48 overflow-y-auto">
                  {startSearchQuery.data.results.map((result) => (
                    <button
                      key={result.placeId}
                      onClick={() => handleStartSelect(result)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                    >
                      <div className="text-sm font-medium text-white">{result.name}</div>
                      <div className="text-xs text-white/40 truncate">{result.formattedAddress}</div>
                    </button>
                  ))}
                </div>
              )}

              {startLocation && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 pl-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="truncate">{startLocation.formattedAddress || startLocation.name}</span>
                </div>
              )}
            </div>

            {/* Intermediate Stops Summary Preview */}
            {stops.length > 0 && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span className="font-semibold uppercase text-[10px] tracking-wider text-amber-400">
                    {stops.length} Intermediate {stops.length === 1 ? 'Stop' : 'Stops'}
                  </span>
                  <button
                    onClick={() => setIsEditStopsOpen(true)}
                    className="text-xs text-brand-400 hover:underline"
                  >
                    Edit / Reorder
                  </button>
                </div>
                <div className="space-y-1">
                  {stops.map((stop, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-white/80">
                      <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="truncate">{stop.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Destination Input */}
            <div className="space-y-1.5">
              <label htmlFor="dest-input" className="section-label text-[11px]">
                Destination (B)
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  id="dest-input"
                  type="text"
                  className="input pl-10 text-sm"
                  placeholder="e.g. Mysore, Karnataka"
                  value={endQuery}
                  onChange={(e) => {
                    setEndQuery(e.target.value);
                    setEndLocation(null);
                    setActiveField('end');
                  }}
                  onFocus={() => setActiveField('end')}
                />
                {endSearchQuery.isLoading && (
                  <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 animate-spin" />
                )}
              </div>

              {activeField === 'end' && endSearchQuery.data?.results && endSearchQuery.data.results.length > 0 && (
                <div className="glass rounded-xl border border-white/15 overflow-hidden mt-1 z-20 relative max-h-48 overflow-y-auto">
                  {endSearchQuery.data.results.map((result) => (
                    <button
                      key={result.placeId}
                      onClick={() => handleEndSelect(result)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                    >
                      <div className="text-sm font-medium text-white">{result.name}</div>
                      <div className="text-xs text-white/40 truncate">{result.formattedAddress}</div>
                    </button>
                  ))}
                </div>
              )}

              {endLocation && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 pl-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span className="truncate">{endLocation.formattedAddress || endLocation.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Date & Departure Time */}
          <div className="glass rounded-2xl p-5 border border-white/10 space-y-3">
            <h2 className="font-semibold text-white flex items-center gap-2 text-base">
              <Calendar size={18} className="text-brand-400" />
              Departure Timing
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="dep-date" className="section-label text-[11px]">Journey Date</label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  <input
                    id="dep-date"
                    type="date"
                    className="input pl-9 text-sm"
                    value={departureDate}
                    onChange={(e) => handleDepartureChange(e.target.value, departureTime)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="dep-time" className="section-label text-[11px]">Departure Time</label>
                <div className="relative">
                  <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  <input
                    id="dep-time"
                    type="time"
                    className="input pl-9 text-sm"
                    value={departureTime}
                    onChange={(e) => handleDepartureChange(departureDate, e.target.value)}
                  />
                </div>
              </div>
            </div>

            {routes.length > 0 && (
              <p className="text-[11px] text-white/40 pl-1">
                &bull; Modifying departure time updates all stop & checkpoint ETAs instantly.
              </p>
            )}
          </div>

          {/* Motorcycle Fuel & Range Settings */}
          <FuelSettingsCard
            fuelInput={fuelInput}
            onChangeFuelInput={handleFuelInputChange}
          />

          {/* Success Banner */}
          {saveSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <Check size={16} className="shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {/* Calculate & Save Trip Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              id="plan-route-btn"
              disabled={!isReady || planRouteMutation.isPending}
              onClick={() => handleCalculateRoute()}
              className="btn-primary flex-1 py-3.5 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg disabled:opacity-50"
            >
              {planRouteMutation.isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Calculating Routes & Checkpoints…
                </>
              ) : (
                <>
                  <Bike size={18} />
                  {routes.length > 0 ? 'Recalculate Route' : 'Find Best Routes'}
                  <ChevronRight size={16} />
                </>
              )}
            </button>

            {routes.length > 0 && (
              <button
                type="button"
                id="save-planned-trip-btn"
                onClick={() => setIsSaveModalOpen(true)}
                className="btn-secondary py-3.5 px-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-300 border-brand-500/30 hover:border-brand-500/60 shadow-lg shrink-0"
              >
                <Bookmark size={18} />
                <span>{editTripId ? 'Update' : 'Save Trip'}</span>
              </button>
            )}
          </div>

          {/* Route Summary Cards (when routes are available) */}
          {routes.length > 0 && (
            <>
              <RouteSummaryCard
                routes={routes}
                selectedRouteId={selectedRouteId}
                onSelectRoute={(id) => setSelectedRouteId(id)}
                weatherTimelines={weatherTimelines}
                isWeatherLoading={isWeatherLoading}
                riskAnalyses={riskAnalyses}
                isRiskLoading={isRiskLoading}
                fuelPlans={fuelPlans}
              />

              {/* Fuel Summary Card for Active Route */}
              {fuelPlans[selectedRouteId]?.calculation?.mileageKmPerLitre ? (
                <>
                  <FuelSummaryCard
                    calculation={fuelPlans[selectedRouteId]!.calculation}
                  />

                  {/* Recommended Fuel Stops */}
                  {fuelPlans[selectedRouteId]!.recommendations.length > 0 && (
                    <FuelStationRecommendationCard
                      recommendations={fuelPlans[selectedRouteId]!.recommendations}
                      currentStops={stops}
                      onAddStationAsStop={handleAddStationAsStop}
                    />
                  )}
                </>
              ) : null}
            </>
          )}
        </div>

        {/* Right Column: Leaflet Route Map & Places Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-3 sticky top-24">
          {/* Places along route category bar */}
          {routes.length > 0 && (
            <div className="glass rounded-2xl p-3 border border-white/10">
              <PlaceCategorySelector
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => setSelectedCategory(cat)}
                isLoading={placesQuery.isLoading}
                totalFound={placesQuery.data?.totalFound}
              />
            </div>
          )}

          <div className="h-[600px]">
            {routes.length > 0 && startLocation && endLocation ? (
              <RouteMap
                routes={routes}
                selectedRouteId={selectedRouteId}
                startLocation={startLocation}
                destination={endLocation}
                stops={stops}
                onSelectRoute={(id) => setSelectedRouteId(id)}
                weatherTimeline={weatherTimelines[selectedRouteId] ?? null}
                riskAnalysis={riskAnalyses[selectedRouteId] ?? null}
                places={placesQuery.data?.places}
                onAddPlaceAsStop={handleAddPlaceAsStop}
              />
            ) : (
              <div className="glass rounded-2xl overflow-hidden h-full flex flex-col items-center justify-center border-dashed border-white/20 p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <Bike size={28} className="text-brand-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Interactive Route Map</h3>
                <p className="text-white/40 text-xs sm:text-sm max-w-sm mt-1.5 leading-relaxed">
                  Select origin and destination to generate multiple motorcycle route alternatives with 15–30 min smart checkpoints.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Stops Modal */}
      {startLocation && endLocation && (
        <EditStopsModal
          isOpen={isEditStopsOpen}
          startLocation={startLocation}
          destination={endLocation}
          currentStops={stops}
          pendingPlaceStop={pendingPlaceStop}
          onClose={handleCloseEditStops}
          onSave={handleStopsSave}
        />
      )}

      {/* Save Planned Trip Modal */}
      {startLocation && endLocation && (
        <SaveTripModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={handleSaveTrip}
          defaultName={loadedTripName || `Trip to ${endLocation.name.split(',')[0]}`}
          originName={startLocation.name}
          destinationName={endLocation.name}
          stopsCount={stops.length}
          journeyDate={departureDate}
          departureTime={departureTime}
          isSaving={createTripMutation.isPending || updateTripMutation.isPending}
        />
      )}
    </div>
  );
}
