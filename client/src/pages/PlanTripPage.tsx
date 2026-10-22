// ============================================================
// BiCAST Plan Trip Page
// Complete Route Engine: Start, Destination, Edit Stops,
// Multiple Alternatives, 15-30m Smart Checkpoints & Leaflet Map
// Two-Stage Responsive Bento-Grid Layout System
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  MapPin,
  Calendar,
  Clock,
  Search,
  Loader2,
  ChevronRight,
  ChevronDown,
  Bike,
  PlusCircle,
  AlertCircle,
  Bookmark,
  Check,
  ShieldCheck,
  Fuel,
  Sparkles,
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
import {
  RouteAlternativesStrip,
  ActiveRouteSummaryMetrics,
  RouteWeatherTimelineAndItinerary,
} from '@/components/route/RouteSummaryCard';
import SafetyScoreBadge from '@/components/risk/SafetyScoreBadge';
import WeatherAlertsBanner from '@/components/risk/WeatherAlertsBanner';
import RiderRecommendationsCard from '@/components/risk/RiderRecommendationsCard';
import RiskFactorBreakdown from '@/components/risk/RiskFactorBreakdown';
import EditStopsModal from '@/components/route/EditStopsModal';
import PlaceCategorySelector from '@/components/places/PlaceCategorySelector';
import FuelSettingsCard from '@/components/fuel/FuelSettingsCard';
import FuelSummaryCard from '@/components/fuel/FuelSummaryCard';
import FuelStationRecommendationCard from '@/components/fuel/FuelStationRecommendationCard';
import SaveTripModal from '@/components/trips/SaveTripModal';

function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getTimeOffsetString(offsetMinutes: number): string {
  const target = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const hours = String(target.getHours()).padStart(2, '0');
  const minutes = String(target.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatTo12Hour(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${mStr} ${suffix}`;
}

const BIKE_PRESETS = [
  { name: '125cc Commuter', mileage: 55, tank: 10, reserve: 1.2 },
  { name: '350cc Classic / Hunter', mileage: 35, tank: 13, reserve: 1.5 },
  { name: '450cc ADV / Tourer', mileage: 28, tank: 15, reserve: 2.0 },
  { name: '650cc Twin', mileage: 20, tank: 14, reserve: 2.0 },
];

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
  const [departureDate, setDepartureDate] = useState(() => getCurrentDateString());
  const [departureTime, setDepartureTime] = useState(() => getCurrentTimeString());
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const timeDropdownRef = useRef<HTMLDivElement>(null);

  // Route calculation states
  const [routes, setRoutes] = useState<PlannedRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search suggestion and time dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setActiveField(null);
      }
      if (
        timeDropdownRef.current &&
        !timeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTimeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    <div className="page-container py-6 sm:py-10 animate-fade-in min-w-0">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
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

      {/* ============================================================
          Stage 1: Top Workspace Grid (Control Deck & Interactive Map)
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
        {/* Left Control Deck (5 cols on lg, 4 cols on xl) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 min-w-0">
          {/* Tile 1: Route & Stops Tile with Visual Vertical Connector Spine */}
          <div ref={searchContainerRef} className="bento-tile !overflow-visible space-y-4 pb-5 relative z-30">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2 text-base">
                <MapPin size={18} className="text-brand-400" />
                Route & Stops
              </h2>

              {startLocation && endLocation && (
                <button
                  type="button"
                  onClick={() => setIsEditStopsOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 py-1 px-2.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 transition-all shadow-sm"
                >
                  <PlusCircle size={14} />
                  Edit Stops {stops.length > 0 && `(${stops.length})`}
                </button>
              )}
            </div>

            {/* Vertical Connector Spine & Locations */}
            <div className="relative pl-6 space-y-4">
              {/* Origin (A) with Emerald Dot */}
              <div className="relative space-y-1.5">
                {/* Visual Connector Spine Line to Next Stop */}
                <div
                  className="absolute -left-4 top-3 -bottom-4 w-0.5 bg-gradient-to-b from-emerald-400 to-amber-400 rounded-full opacity-60"
                  aria-hidden="true"
                />

                <div className="absolute -left-6 top-3 w-4 h-4 rounded-full bg-surface-900 border-2 border-emerald-400 flex items-center justify-center shadow-glow-blue">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <label htmlFor="start-input" className="section-label text-[11px] text-emerald-400 font-semibold flex items-center justify-between">
                  <span>Origin (A)</span>
                  {startLocation && <span className="text-[10px] text-emerald-400 font-normal">Selected</span>}
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
                  <div className="rounded-xl border border-white/20 bg-surface-800/98 backdrop-blur-2xl mt-1.5 z-50 absolute left-0 right-0 max-h-56 overflow-y-auto shadow-2xl ring-1 ring-black/50 divide-y divide-white/5">
                    {startSearchQuery.data.results.map((result) => (
                      <button
                        key={result.placeId}
                        type="button"
                        onClick={() => handleStartSelect(result)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-white/10 transition-colors flex items-start gap-2.5 group"
                      >
                        <Search size={14} className="text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">
                            {result.name}
                          </div>
                          <div className="text-xs text-white/50 truncate mt-0.5">{result.formattedAddress}</div>
                        </div>
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

              {/* Intermediate Stops Summary Preview / Amber Node */}
              <div className="relative">
                {/* Visual Connector Spine Line to Destination */}
                <div
                  className="absolute -left-4 top-0 -bottom-4 w-0.5 bg-gradient-to-b from-amber-400 via-amber-400 to-rose-400 rounded-full opacity-60"
                  aria-hidden="true"
                />

                <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-surface-900 border-2 border-amber-400 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </div>

                {stops.length > 0 ? (
                  <div className="bento-subtile space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold uppercase text-[10px] tracking-wider text-amber-400 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center">
                          {stops.length}
                        </span>
                        {stops.length === 1 ? 'Intermediate Stop' : 'Intermediate Stops'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditStopsOpen(true)}
                        className="text-xs text-brand-400 hover:text-brand-300 font-medium hover:underline"
                      >
                        Edit / Reorder
                      </button>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {stops.map((stop, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-white/80">
                          <span className="w-3.5 h-3.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[9px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{stop.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-1 text-xs text-white/40">
                    <span className="text-[11px] italic">Direct corridor &bull; no intermediate stops</span>
                    {startLocation && endLocation && (
                      <button
                        type="button"
                        onClick={() => setIsEditStopsOpen(true)}
                        className="text-[11px] text-brand-400 hover:text-brand-300 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <PlusCircle size={13} /> Add Stop
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Destination (B) with Rose Dot */}
              <div className="relative space-y-1.5 pb-1">
                {/* Visual Connector Spine Line terminating cleanly at Destination Dot */}
                <div
                  className="absolute -left-4 top-0 h-5 w-0.5 bg-rose-400 rounded-full opacity-60"
                  aria-hidden="true"
                />

                <div className="absolute -left-6 top-3 w-4 h-4 rounded-full bg-surface-900 border-2 border-rose-400 flex items-center justify-center shadow-glow-orange">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                </div>
                <label htmlFor="dest-input" className="section-label text-[11px] text-rose-400 font-semibold flex items-center justify-between">
                  <span>Destination (B)</span>
                  {endLocation && <span className="text-[10px] text-rose-400 font-normal">Selected</span>}
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
                  <div className="rounded-xl border border-white/20 bg-surface-800/98 backdrop-blur-2xl mt-1.5 z-50 absolute left-0 right-0 max-h-56 overflow-y-auto shadow-2xl ring-1 ring-black/50 divide-y divide-white/5">
                    {endSearchQuery.data.results.map((result) => (
                      <button
                        key={result.placeId}
                        type="button"
                        onClick={() => handleEndSelect(result)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-white/10 transition-colors flex items-start gap-2.5 group"
                      >
                        <MapPin size={14} className="text-rose-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white group-hover:text-rose-300 transition-colors truncate">
                            {result.name}
                          </div>
                          <div className="text-xs text-white/50 truncate mt-0.5">{result.formattedAddress}</div>
                        </div>
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
          </div>

          {/* Tile 2: Departure Timing, Fuel Settings & Anchored CTA Bar */}
          <div className="bento-tile !overflow-visible space-y-4 relative z-20">
            {/* Departure Timing */}
            <div className="space-y-3">
              <h2 className="font-semibold text-white flex items-center gap-2 text-base">
                <Calendar size={18} className="text-brand-400" />
                Departure Timing
              </h2>

              <div className="grid grid-cols-2 gap-3 items-start">
                <div className="space-y-1">
                  <div className="flex items-center justify-between h-5">
                    <label htmlFor="dep-date" className="section-label text-[11px]">Journey Date</label>
                  </div>
                  <div className="relative">
                    <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                    <input
                      id="dep-date"
                      type="date"
                      className="input pl-9 pr-3 text-sm h-10 py-2 w-full flex items-center"
                      value={departureDate}
                      onChange={(e) => handleDepartureChange(e.target.value, departureTime)}
                    />
                  </div>
                </div>

                <div className="space-y-1 relative" ref={timeDropdownRef}>
                  <div className="flex items-center justify-between h-5">
                    <label htmlFor="dep-time-trigger" className="section-label text-[11px]">Departure Time</label>
                    <button
                      type="button"
                      onClick={() => handleDepartureChange(departureDate, getCurrentTimeString())}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold uppercase tracking-wider transition-colors"
                      title="Set to current local time"
                    >
                      Now
                    </button>
                  </div>
                  <div className="relative">
                    <button
                      id="dep-time-trigger"
                      type="button"
                      onClick={() => setIsTimeDropdownOpen((prev) => !prev)}
                      className="input flex items-center justify-between text-left text-sm cursor-pointer hover:border-brand-500/50 hover:bg-white/[0.07] transition-all duration-200 group w-full pl-3 pr-2.5 h-10 py-2"
                      aria-expanded={isTimeDropdownOpen}
                      aria-haspopup="true"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock size={15} className="text-brand-400 group-hover:text-brand-300 shrink-0 transition-colors" />
                        <span className="font-semibold text-white tracking-wide truncate">{departureTime}</span>
                        <span className="text-[10px] text-white/40 hidden sm:inline font-normal">
                          {formatTo12Hour(departureTime).split(' ')[1]}
                        </span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-white/40 group-hover:text-white transition-transform duration-200 shrink-0 ml-1 ${
                          isTimeDropdownOpen ? 'rotate-180 text-brand-400' : ''
                        }`}
                      />
                    </button>

                    {/* Bento Time Dropdown */}
                    {isTimeDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-surface-800/98 backdrop-blur-2xl border border-white/20 p-3.5 shadow-2xl ring-1 ring-black/60 space-y-3 z-50 animate-fade-in">
                        {/* Header with Quick Presets relative to current time */}
                        <div>
                          <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>Quick Offsets (From Now)</span>
                            <span className="text-[10px] text-brand-400/80 font-mono">Now: {getCurrentTimeString()}</span>
                          </div>
                          <div className="grid grid-cols-5 gap-1">
                            {[
                              { label: 'Now', offset: 0 },
                              { label: '+15m', offset: 15 },
                              { label: '+30m', offset: 30 },
                              { label: '+1h', offset: 60 },
                              { label: '+2h', offset: 120 },
                            ].map((item) => {
                              const calculatedTime = getTimeOffsetString(item.offset);
                              const isSelected = departureTime === calculatedTime;
                              return (
                                <button
                                  key={item.label}
                                  type="button"
                                  onClick={() => {
                                    handleDepartureChange(departureDate, calculatedTime);
                                    setIsTimeDropdownOpen(false);
                                  }}
                                  className={`py-1.5 px-1 rounded-lg text-xs font-medium text-center transition-all ${
                                    isSelected
                                      ? 'bg-brand-500 text-black font-bold shadow-md shadow-brand-500/20'
                                      : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5'
                                  }`}
                                >
                                  {item.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Manual Exact Time Picker Row */}
                        <div className="pt-2 border-t border-white/10">
                          <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">
                            Custom Exact Time
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Clock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                              <input
                                type="time"
                                value={departureTime}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleDepartureChange(departureDate, e.target.value);
                                  }
                                }}
                                className="w-full bg-surface-900 border border-white/15 rounded-xl pl-8 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand-400 font-mono"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsTimeDropdownOpen(false)}
                              className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-black font-semibold text-xs shadow-md transition-all shrink-0"
                            >
                              Done
                            </button>
                          </div>
                        </div>

                        {/* Popular Ride Departure Times */}
                        <div className="pt-2 border-t border-white/10">
                          <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5">
                            Popular Ride Slots
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                            {[
                              { time: '05:00', label: 'Early Dawn' },
                              { time: '06:00', label: 'Dawn Ride' },
                              { time: '07:00', label: 'Morning' },
                              { time: '08:30', label: 'Mid-Morning' },
                              { time: '14:00', label: 'Afternoon' },
                              { time: '16:30', label: 'Sunset Ride' },
                            ].map((preset) => {
                              const isSelected = departureTime === preset.time;
                              return (
                                <button
                                  key={preset.time}
                                  type="button"
                                  onClick={() => {
                                    handleDepartureChange(departureDate, preset.time);
                                    setIsTimeDropdownOpen(false);
                                  }}
                                  className={`flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                                    isSelected
                                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                                      : 'bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/5'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold leading-none">{preset.time}</p>
                                    <p className="text-[10px] text-white/40 truncate mt-0.5">{preset.label}</p>
                                  </div>
                                  {isSelected && <Check size={13} className="text-brand-400 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {routes.length > 0 && (
                <p className="text-[11px] text-white/40 pl-0.5">
                  &bull; Departure changes update all checkpoint ETAs and weather instantaneously.
                </p>
              )}
            </div>

            {/* Motorcycle Fuel & Range Settings */}
            <FuelSettingsCard
              fuelInput={fuelInput}
              onChangeFuelInput={handleFuelInputChange}
            />

            {/* Save Trip Success Banner */}
            {saveSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <Check size={16} className="shrink-0" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}

            {/* Primary Action Buttons Bar */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                id="plan-route-btn"
                type="button"
                disabled={!isReady || planRouteMutation.isPending}
                onClick={() => handleCalculateRoute()}
                className="btn-primary flex-1 py-3.5 flex items-center justify-center gap-2 text-sm font-semibold shadow-bento hover:shadow-bento-hover disabled:opacity-50"
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
                  className="btn-secondary py-3.5 px-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-300 border-brand-500/30 hover:border-brand-500/60 shadow-bento shrink-0"
                >
                  <Bookmark size={18} />
                  <span>{editTripId ? 'Update' : 'Save Trip'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Interactive Map & Route Selector Deck (7 cols on lg, 8 cols on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4 min-w-0">
          {/* Route Alternatives Comparison Strip (Rendered directly above the map) */}
          {routes.length > 0 && (
            <RouteAlternativesStrip
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(id) => setSelectedRouteId(id)}
              riskAnalyses={riskAnalyses}
              fuelPlans={fuelPlans}
            />
          )}

          {/* Place Category Selector Toolbar */}
          {routes.length > 0 && (
            <div className="glass rounded-2xl p-2.5 sm:p-3 border border-white/10 shadow-sm">
              <PlaceCategorySelector
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => setSelectedCategory(cat)}
                isLoading={placesQuery.isLoading}
                totalFound={placesQuery.data?.totalFound}
              />
            </div>
          )}

          {/* Responsive Leaflet Map Container */}
          <div className="h-[340px] sm:h-[440px] lg:h-[520px] xl:h-[560px] flex-1 min-h-[340px] rounded-2xl overflow-hidden shadow-bento border border-white/10 relative">
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
              <div className="glass h-full flex flex-col items-center justify-center border-dashed border-white/20 p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4 text-brand-400 shadow-glow-orange">
                  <Bike size={32} />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">Interactive Motorcycle Route Map</h3>
                <p className="text-white/50 text-xs sm:text-sm max-w-md mt-2 leading-relaxed">
                  Specify your origin and destination in the left deck to compute optimized motorcycle routes with 15–30 min smart weather checkpoints.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          Stage 2: Post-Calculation Full-Width Bento Intelligence Dashboard
          ============================================================ */}
      {routes.length > 0 && activeRoute && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 lg:gap-6 mt-6 animate-slide-up items-start">
          {/* Bento Tile A: Safety Score Badge & Active Route Summary Metrics */}
          <div className="md:col-span-2 lg:col-span-4 bento-tile flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <ShieldCheck size={18} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Safety & Corridor Metrics
              </h3>
            </div>
            <SafetyScoreBadge
              analysis={riskAnalyses[selectedRouteId] ?? null}
              isLoading={isRiskLoading}
              embedded
            />
            <ActiveRouteSummaryMetrics
              route={activeRoute}
              fuelPlan={fuelPlans[selectedRouteId]}
            />
          </div>

          {/* Bento Tile B: Safety Advisories & Alerts Stack */}
          <div className="md:col-span-1 lg:col-span-4 bento-tile flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <ShieldCheck size={18} className="text-brand-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Safety & Risk Advisories
              </h3>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
              {riskAnalyses[selectedRouteId]?.alerts && riskAnalyses[selectedRouteId]!.alerts.length > 0 ? (
                <WeatherAlertsBanner alerts={riskAnalyses[selectedRouteId]!.alerts} />
              ) : (
                <div className="bento-subtile border-emerald-500/25 bg-emerald-500/5 p-4 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Clear Riding Conditions</p>
                    <p className="text-[11px] text-emerald-300/80 mt-0.5">
                      No severe weather hazards or active road warnings detected on this route. Safe riding!
                    </p>
                  </div>
                </div>
              )}

              {riskAnalyses[selectedRouteId]?.recommendations && riskAnalyses[selectedRouteId]!.recommendations.length > 0 && (
                <RiderRecommendationsCard
                  recommendations={riskAnalyses[selectedRouteId]!.recommendations}
                />
              )}

              {riskAnalyses[selectedRouteId]?.checkpoints && riskAnalyses[selectedRouteId]!.checkpoints.length > 0 && (
                <RiskFactorBreakdown
                  checkpoints={riskAnalyses[selectedRouteId]!.checkpoints}
                />
              )}
            </div>
          </div>

          {/* Bento Tile C: Fuel Intelligence Stack or Bike Preset Prompt */}
          <div className="md:col-span-1 lg:col-span-4 bento-tile flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Fuel size={18} className="text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Fuel & Refuelling Intelligence
              </h3>
            </div>

            {fuelPlans[selectedRouteId]?.calculation?.mileageKmPerLitre && fuelPlans[selectedRouteId]!.calculation.mileageKmPerLitre > 0 ? (
              <div className="space-y-3">
                <FuelSummaryCard
                  calculation={fuelPlans[selectedRouteId]!.calculation}
                  embedded
                />

                {fuelPlans[selectedRouteId]!.recommendations.length > 0 && (
                  <FuelStationRecommendationCard
                    recommendations={fuelPlans[selectedRouteId]!.recommendations}
                    currentStops={stops}
                    onAddStationAsStop={handleAddStationAsStop}
                    embedded
                  />
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/20">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 mb-2">
                    <Sparkles size={16} />
                    <h4 className="text-sm font-bold text-white">Unlock Fuel & Cost Telemetry</h4>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed mb-4">
                    Select your motorcycle type below to calculate required fuel litres, estimated petrol cost, and safe refuelling stops:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {BIKE_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() =>
                          handleFuelInputChange({
                            ...fuelInput,
                            mileageKmPerLitre: preset.mileage,
                            fuelTankCapacityLitres: preset.tank,
                            reserveLitres: preset.reserve,
                            currentFuelLitres: Math.round(preset.tank * 0.75 * 10) / 10,
                          })
                        }
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/35 text-left transition-all group"
                      >
                        <p className="text-xs font-semibold text-white group-hover:text-amber-300 truncate">
                          {preset.name}
                        </p>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          ~{preset.mileage} km/L &bull; {preset.tank}L tank
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-white/40 mt-4 text-center">
                  Or enter custom tank capacity in the left control deck.
                </p>
              </div>
            )}
          </div>

          {/* Bento Tile D: Route Weather Timeline & Itinerary Switcher */}
          <div className="md:col-span-2 lg:col-span-12 bento-tile">
            <RouteWeatherTimelineAndItinerary
              route={activeRoute}
              timeline={weatherTimelines[selectedRouteId] ?? null}
              isLoading={isWeatherLoading}
              riskAnalysis={riskAnalyses[selectedRouteId] ?? null}
              fuelPlan={fuelPlans[selectedRouteId] ?? null}
            />
          </div>
        </div>
      )}

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
