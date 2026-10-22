// ============================================================
// BiCAST Trip Details Page (/trips/:tripId)
// Complete trip dashboard displaying persistent configuration,
// route metrics, weather risk, fuel plan, and recalculation pipeline.
// Responsive 12-Column Bento Dashboard System
// ============================================================
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  RefreshCw,
  Edit,
  Copy,
  Trash2,
  AlertTriangle,
  Check,
  ShieldAlert,
  ShieldCheck,
  Fuel,
  Navigation,
  Loader2,
  Route,
  Bell,
  Sparkles,
} from 'lucide-react';
import {
  useTrip,
  useRecalculateTrip,
  useDuplicateTrip,
  useDeleteTrip,
  useUpdateTrip,
  getTripStatusBadge,
  getFreshnessBadge,
} from '@/services/tripService';
import { getRiskLevelBadge } from '@/services/riskService';
import DeleteTripModal from '@/components/trips/DeleteTripModal';
import { TripStatus } from '@/types/trip';

export default function TripDetailsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  const { data: trip, isLoading, isError } = useTrip(tripId);
  const recalculateMutation = useRecalculateTrip();
  const duplicateMutation = useDuplicateTrip();
  const deleteMutation = useDeleteTrip();
  const updateMutation = useUpdateTrip();

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [recalcSuccess, setRecalcSuccess] = useState(false);

  // Edit departure schedule state for inline update
  const [isScheduleEditing, setIsScheduleEditing] = useState(false);
  const [newDepartureTime, setNewDepartureTime] = useState('');
  const [newJourneyDate, setNewJourneyDate] = useState('');

  if (isLoading) {
    return (
      <div className="page-container py-16 text-center">
        <Loader2 size={36} className="animate-spin text-brand-400 mx-auto mb-4" />
        <p className="text-white/60 text-sm">Loading trip details…</p>
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <div className="page-container py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-bold text-white">Trip Not Found</h2>
        <p className="text-white/40 text-xs sm:text-sm max-w-sm mx-auto">
          The trip you are looking for does not exist or has been deleted.
        </p>
        <Link to="/saved-trips" className="btn-secondary inline-flex items-center gap-2 text-xs py-2 px-4">
          <ArrowLeft size={14} />
          Back to Saved Trips
        </Link>
      </div>
    );
  }

  const statusBadge = getTripStatusBadge(trip.status);
  const freshnessBadge = getFreshnessBadge(trip.freshness);

  const handleRecalculate = async (customSchedule?: { departureTime?: string; journeyDate?: string }) => {
    try {
      await recalculateMutation.mutateAsync({
        id: trip.id,
        schedule: customSchedule,
      });
      setRecalcSuccess(true);
      setIsScheduleEditing(false);
      setTimeout(() => setRecalcSuccess(false), 3000);
    } catch (err) {
      console.error('Recalculation error:', err);
    }
  };

  const handleDuplicate = async () => {
    try {
      const copy = await duplicateMutation.mutateAsync({ id: trip.id });
      navigate(`/trips/${copy.id}`);
    } catch (err) {
      console.error('Duplicate error:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteMutation.mutateAsync(trip.id);
      navigate('/saved-trips');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleStatusChange = async (newStatus: TripStatus) => {
    await updateMutation.mutateAsync({
      id: trip.id,
      payload: { status: newStatus },
    });
  };

  const snapshots = trip.snapshots;
  const activeRoute = snapshots?.route;
  const riskAnalysis = snapshots?.riskAnalysis;
  const fuelPlan = snapshots?.fuelPlan;
  const riskBadge = riskAnalysis ? getRiskLevelBadge(riskAnalysis.overallLevel) : null;

  return (
    <div className="page-container py-6 sm:py-8 space-y-6 animate-fade-in min-w-0">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-white/40">
        <Link to="/saved-trips" className="hover:text-white transition-colors flex items-center gap-1">
          <ArrowLeft size={14} /> Saved Trips
        </Link>
        <span>/</span>
        <span className="text-white/70 truncate max-w-xs">{trip.name}</span>
      </div>

      {/* Freshness Banner (if stale, expired, or unprocessed) */}
      {!freshnessBadge.isFresh && (
        <div className="bento-subtile border-amber-500/30 bg-amber-500/10 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-300">
                {trip.freshness?.reason || 'Plan recalculation recommended'}
              </p>
              <p className="text-[11px] text-white/50 mt-0.5">
                Saved weather forecasts become stale over time. Recalculate to synchronize with live atmospheric models.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="banner-recalculate-btn"
            onClick={() => handleRecalculate()}
            disabled={recalculateMutation.isPending}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-md"
          >
            {recalculateMutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Recalculating…
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Recalculate Now
              </>
            )}
          </button>
        </div>
      )}

      {/* ============================================================
          2. Hero Header Tile (.bento-tile)
          ============================================================ */}
      <div className="bento-tile flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2.5 min-w-0 flex-1">
          {/* Trip Name & Status Pills */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
              {trip.name}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${statusBadge.bgColor} ${statusBadge.textColor} ${statusBadge.borderColor}`}
            >
              {statusBadge.label}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${freshnessBadge.bgColor} ${freshnessBadge.textColor} ${freshnessBadge.borderColor}`}
            >
              {freshnessBadge.label}
            </span>
          </div>

          {/* Visual Route Summary Bar */}
          <div className="flex items-center gap-2 text-sm text-white/80 flex-wrap">
            <span className="flex items-center gap-1.5 font-semibold text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-glow-blue" />
              {trip.startLocation.name.split(',')[0]}
            </span>
            <span className="text-white/30">&rarr;</span>
            {trip.stops.length > 0 && (
              <>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                  +{trip.stops.length} {trip.stops.length === 1 ? 'stop' : 'stops'}
                </span>
                <span className="text-white/30">&rarr;</span>
              </>
            )}
            <span className="flex items-center gap-1.5 font-semibold text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-glow-orange" />
              {trip.destination.name.split(',')[0]}
            </span>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {recalcSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 animate-fade-in">
              <Check size={14} /> Recalculated!
            </span>
          )}

          {/* Recalculate */}
          <button
            type="button"
            id="trip-details-recalculate-btn"
            onClick={() => handleRecalculate()}
            disabled={recalculateMutation.isPending}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
          >
            {recalculateMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Recalculate
          </button>

          {/* Edit in Planner */}
          <button
            type="button"
            id="trip-details-edit-btn"
            onClick={() => navigate(`/plan?editTripId=${trip.id}`)}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 shadow-sm"
          >
            <Edit size={14} />
            Edit Stops
          </button>

          {/* Duplicate */}
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicateMutation.isPending}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 shadow-sm"
          >
            {duplicateMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Copy size={14} />
            )}
            Duplicate
          </button>

          {/* Status Dropdown */}
          <select
            value={trip.status}
            onChange={(e) => handleStatusChange(e.target.value as TripStatus)}
            className="px-3 py-2 rounded-xl bg-surface-800 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500 cursor-pointer shadow-sm"
          >
            <option value="PLANNED">Status: Planned</option>
            <option value="IN_PROGRESS">Status: In Progress</option>
            <option value="COMPLETED">Status: Completed</option>
            <option value="CANCELLED">Status: Cancelled</option>
            <option value="DRAFT">Status: Draft</option>
          </select>

          {/* Delete */}
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="p-2 rounded-xl text-white/40 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
            title="Delete trip"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* ============================================================
          3. Top KPI Bento Strip (4 Columns)
          ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Distance & Duration */}
        <div className="bento-subtile p-4 rounded-2xl flex flex-col justify-between space-y-2 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Corridor Distance
            </span>
            <Route size={15} className="text-brand-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-white tracking-tight">
              {activeRoute ? (activeRoute.distanceMeters / 1000).toFixed(1) : '—'}
              <span className="text-xs font-normal text-white/60 ml-1">km</span>
            </p>
            <p className="text-xs text-white/60 mt-0.5">
              {activeRoute
                ? `${Math.floor(activeRoute.durationSeconds / 3600)}h ${Math.round((activeRoute.durationSeconds % 3600) / 60)}m moving time`
                : 'Duration pending'}
            </p>
          </div>
          <p className="text-[10px] text-emerald-400 font-mono">
            {activeRoute?.arrivalTime
              ? `Est. Arrival: ${new Date(activeRoute.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : '—'}
          </p>
        </div>

        {/* Metric 2: Safety Score & Risk Level */}
        <div className="bento-subtile p-4 rounded-2xl flex flex-col justify-between space-y-2 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Safety Score
            </span>
            <ShieldCheck size={15} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-white tracking-tight">
              {riskAnalysis ? `${riskAnalysis.overallScore}` : '—'}
              <span className="text-xs font-normal text-white/60 ml-1">/ 100</span>
            </p>
            <p className="text-xs text-white/60 mt-0.5">
              {riskBadge ? (
                <span className={`inline-flex items-center gap-1 font-bold ${riskBadge.textClass}`}>
                  <span>{riskBadge.symbol}</span>
                  <span>{riskAnalysis?.overallLevel} Risk Tier</span>
                </span>
              ) : (
                'Risk analysis pending'
              )}
            </p>
          </div>
          <p className="text-[10px] text-white/50 truncate">
            {riskAnalysis?.severeSegments?.length ? 'Severe zone detected' : 'Real-time weather checked'}
          </p>
        </div>

        {/* Metric 3: Fuel & Estimated Cost */}
        <div className="bento-subtile p-4 rounded-2xl flex flex-col justify-between space-y-2 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Fuel Required
            </span>
            <Fuel size={15} className="text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-amber-300 tracking-tight">
              {fuelPlan?.calculation?.fuelRequiredLitres != null
                ? `${fuelPlan.calculation.fuelRequiredLitres}`
                : trip.fuelConfig?.mileageKmPerLitre
                ? 'Calc'
                : '—'}
              <span className="text-xs font-normal text-white/60 ml-1">L</span>
            </p>
            <p className="text-xs text-white/60 mt-0.5">
              {fuelPlan?.calculation?.estimatedCost != null
                ? `₹${fuelPlan.calculation.estimatedCost.toLocaleString('en-IN')} est. cost`
                : 'Trip cost uncalculated'}
            </p>
          </div>
          <p className="text-[10px] text-white/50">
            {trip.fuelConfig?.mileageKmPerLitre
              ? `@${trip.fuelConfig.mileageKmPerLitre} km/L configuration`
              : 'Mileage not configured'}
          </p>
        </div>

        {/* Metric 4: Checkpoints & Stops Count */}
        <div className="bento-subtile p-4 rounded-2xl flex flex-col justify-between space-y-2 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Checkpoints & Stops
            </span>
            <MapPin size={15} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-cyan-300 tracking-tight">
              {activeRoute?.checkpoints?.length ?? 0}
              <span className="text-xs font-normal text-white/60 ml-1">checkpoints</span>
            </p>
            <p className="text-xs text-white/60 mt-0.5">
              {trip.stops.length} {trip.stops.length === 1 ? 'intermediate stop' : 'intermediate stops'}
            </p>
          </div>
          <p className="text-[10px] text-white/50">15–30 min travel intervals</p>
        </div>
      </div>

      {/* ============================================================
          4. Main 12-Column Bento Content Grid
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Left Column (5 cols): Schedule, Stops Timeline, Fuel Details */}
        <div className="lg:col-span-5 space-y-5 min-w-0">
          {/* Schedule & Timing Tile */}
          <div className="bento-tile space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={16} className="text-brand-400" />
                Schedule & Timing
              </h3>
              <button
                type="button"
                onClick={() => {
                  setNewDepartureTime(trip.departureTime);
                  setNewJourneyDate(trip.journeyDate);
                  setIsScheduleEditing(!isScheduleEditing);
                }}
                className="text-xs font-semibold text-brand-400 hover:text-brand-300 hover:underline"
              >
                {isScheduleEditing ? 'Cancel' : 'Change Time'}
              </button>
            </div>

            {isScheduleEditing ? (
              <div className="space-y-3 p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs animate-fade-in">
                <div>
                  <label className="block text-white/50 text-[11px] mb-1 font-semibold uppercase">Journey Date</label>
                  <input
                    type="date"
                    value={newJourneyDate}
                    onChange={(e) => setNewJourneyDate(e.target.value)}
                    className="input py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-[11px] mb-1 font-semibold uppercase">Departure Time</label>
                  <input
                    type="time"
                    value={newDepartureTime}
                    onChange={(e) => setNewDepartureTime(e.target.value)}
                    className="input py-2 text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleRecalculate({
                      departureTime: newDepartureTime,
                      journeyDate: newJourneyDate,
                    })
                  }
                  className="btn-primary w-full py-2 text-xs font-semibold shadow-md"
                >
                  Save & Recalculate
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bento-subtile p-3 rounded-xl">
                  <span className="text-white/40 block text-[10px] uppercase font-semibold">Journey Date</span>
                  <span className="font-bold text-white mt-1 block text-sm">{trip.journeyDate}</span>
                </div>
                <div className="bento-subtile p-3 rounded-xl">
                  <span className="text-white/40 block text-[10px] uppercase font-semibold">Departure Time</span>
                  <span className="font-bold text-white mt-1 block text-sm">
                    {trip.departureTime} <span className="text-[10px] text-white/50 font-normal">({trip.timezone})</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Itinerary Stops Vertical Timeline Tile with Connected Track Line */}
          <div className="bento-tile space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={16} className="text-brand-400" />
                Itinerary Stops
              </h3>
              <span className="text-xs text-white/50">
                {trip.stops.length + 2} total locations
              </span>
            </div>

            {/* Vertical timeline spine */}
            <div className="relative pl-6 space-y-3">
              {/* Origin A */}
              <div className="relative flex items-start gap-3 bento-subtile p-3 rounded-xl border-white/5">
                {/* Visual Connector Spine Line to Next Stop */}
                <div
                  className="absolute -left-4 top-3 -bottom-3 w-0.5 bg-gradient-to-b from-emerald-400 to-amber-400 rounded-full opacity-60"
                  aria-hidden="true"
                />

                <div className="absolute -left-6 top-3 w-4 h-4 rounded-full bg-surface-900 border-2 border-emerald-400 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-white text-xs truncate">{trip.startLocation.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                      Origin A
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40 mt-0.5 block">0.0 km &bull; Start point</span>
                </div>
              </div>

              {/* Intermediate User Stops */}
              {trip.stops.map((s, idx) => (
                <div
                  key={s.id || idx}
                  className="relative flex items-start gap-3 bento-subtile p-3 rounded-xl border-white/5"
                >
                  {/* Visual Connector Spine Line */}
                  <div
                    className="absolute -left-4 top-0 -bottom-3 w-0.5 bg-gradient-to-b from-amber-400 via-amber-400 to-rose-400 rounded-full opacity-60"
                    aria-hidden="true"
                  />

                  <div className="absolute -left-6 top-3 w-4 h-4 rounded-full bg-surface-900 border-2 border-amber-400 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-white text-xs truncate">{s.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase">
                        Stop #{s.sequence}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/40 mt-0.5 block">
                      {s.source === 'place' ? 'Added from Places along route' : 'User waypoint'}
                    </span>
                  </div>
                </div>
              ))}

              {/* Destination B */}
              <div className="relative flex items-start gap-3 bento-subtile p-3 rounded-xl border-rose-500/20">
                {/* Visual Connector Spine Line terminating at Destination */}
                <div
                  className="absolute -left-4 top-0 h-5 w-0.5 bg-rose-400 rounded-full opacity-60"
                  aria-hidden="true"
                />

                <div className="absolute -left-6 top-3 w-4 h-4 rounded-full bg-surface-900 border-2 border-rose-400 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-white text-xs truncate">{trip.destination.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold uppercase">
                      Dest B
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40 mt-0.5 block">
                    {activeRoute ? `${(activeRoute.distanceMeters / 1000).toFixed(1)} km total` : 'Destination'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bike & Fuel Configuration Tile */}
          <div className="bento-tile space-y-3.5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Fuel size={16} className="text-brand-400" />
              Bike & Fuel Details
            </h3>

            {trip.fuelConfig?.mileageKmPerLitre ? (
              <div className="space-y-3 text-xs">
                {/* 2x2 Metric Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bento-subtile p-3 rounded-xl">
                    <span className="text-white/40 text-[10px] block uppercase font-semibold">Mileage</span>
                    <span className="font-bold text-white text-sm mt-0.5 block">{trip.fuelConfig.mileageKmPerLitre} km/L</span>
                  </div>
                  <div className="bento-subtile p-3 rounded-xl">
                    <span className="text-white/40 text-[10px] block uppercase font-semibold">Fuel Price</span>
                    <span className="font-bold text-white text-sm mt-0.5 block">
                      {trip.fuelConfig.fuelPricePerLitre ? `₹${trip.fuelConfig.fuelPricePerLitre}/L` : '—'}
                    </span>
                  </div>
                  <div className="bento-subtile p-3 rounded-xl">
                    <span className="text-white/40 text-[10px] block uppercase font-semibold">Current Fuel</span>
                    <span className="font-bold text-white text-sm mt-0.5 block">
                      {trip.fuelConfig.currentFuelLitres != null ? `${trip.fuelConfig.currentFuelLitres} L` : '—'}
                    </span>
                  </div>
                  <div className="bento-subtile p-3 rounded-xl">
                    <span className="text-white/40 text-[10px] block uppercase font-semibold">Safety Reserve</span>
                    <span className="font-bold text-white text-sm mt-0.5 block">{trip.fuelConfig.reserveLitres ?? 1.5} L</span>
                  </div>
                </div>

                {/* Subgrid for calculation */}
                {fuelPlan?.calculation && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <span className="text-white/40 text-[10px] block uppercase font-semibold">Fuel Required</span>
                      <span className="font-bold text-amber-300 text-sm mt-0.5 block">
                        {fuelPlan.calculation.fuelRequiredLitres} L
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <span className="text-white/40 text-[10px] block uppercase font-semibold">Estimated Cost</span>
                      <span className="font-bold text-amber-300 text-sm mt-0.5 block">
                        ₹{fuelPlan.calculation.estimatedCost?.toLocaleString('en-IN') ?? '—'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bento-subtile p-4 rounded-xl text-center">
                <p className="text-xs text-white/50 leading-relaxed">
                  No motorcycle fuel configuration saved for this ride. Configure in Planner to unlock fuel telemetry.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Safety & Weather Alerts, Smart Checkpoints Grid */}
        <div className="lg:col-span-7 space-y-5 min-w-0">
          {/* Route Safety & Weather Alerts Tile */}
          <div className="bento-tile space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-white/10">
              <ShieldAlert size={16} className="text-brand-400" />
              Route Safety & Weather Assessment
            </h3>

            {riskAnalysis ? (
              <div className="space-y-3.5">
                {/* Score Banner */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/10">
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider block font-semibold">
                      Safety Score
                    </span>
                    <span
                      className={`text-2xl font-black ${
                        riskAnalysis.overallScore >= 80
                          ? 'text-emerald-400'
                          : riskAnalysis.overallScore >= 60
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {riskAnalysis.overallScore} / 100
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider block font-semibold">
                      Risk Level
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                        riskBadge?.borderClass ?? 'border-white/20'
                      } ${riskBadge?.bgClass ?? 'bg-white/10'} ${riskBadge?.textClass ?? 'text-white'}`}
                    >
                      {riskAnalysis.overallLevel}
                    </span>
                  </div>
                </div>

                {/* Primary Concerns Chips */}
                {riskAnalysis.primaryConcerns && riskAnalysis.primaryConcerns.length > 0 && (
                  <div className="bento-subtile p-3 rounded-xl space-y-1.5">
                    <span className="text-brand-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={12} />
                      Rider Advisories
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {riskAnalysis.primaryConcerns.map((concern, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/90 text-xs"
                        >
                          {concern}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weather Alerts */}
                {riskAnalysis.alerts && riskAnalysis.alerts.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-white/50">
                      <Bell size={13} className="text-rose-400" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">
                        Active Weather Alerts ({riskAnalysis.alerts.length})
                      </span>
                    </div>
                    {riskAnalysis.alerts.map((alt: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-0.5"
                      >
                        <p className="font-bold text-white">{alt.title}</p>
                        <p className="text-[11px] text-white/70 leading-relaxed">{alt.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bento-subtile border-emerald-500/20 bg-emerald-500/5 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
                    <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                    <span>No active weather alerts. Safe riding conditions along this corridor.</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-white/40 py-2">
                No risk snapshot available. Click "Recalculate" to evaluate current weather.
              </p>
            )}
          </div>

          {/* Smart Checkpoints Progression Grid (Responsive 2-column card grid) */}
          {activeRoute?.checkpoints && activeRoute.checkpoints.length > 0 && (
            <div className="bento-tile space-y-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-white/10">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation size={16} className="text-brand-400" />
                  Smart Checkpoints Progression
                </h3>
                <span className="text-xs text-white/50">
                  {activeRoute.checkpoints.length} nodes
                </span>
              </div>

              {/* 2-column card grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                {activeRoute.checkpoints.map((cp: any) => (
                  <div
                    key={cp.id}
                    className="bento-subtile p-3 rounded-xl border flex items-start gap-2.5 hover:border-white/20 transition-all"
                  >
                    <div className="w-6 h-6 rounded-lg bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {cp.sequence}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-white text-xs truncate" title={cp.name}>
                          {cp.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        {(cp.distanceFromStartMeters / 1000).toFixed(1)} km from start
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono mt-1 font-semibold">
                        <Clock size={11} />
                        <span>
                          {cp.estimatedArrivalTime
                            ? new Date(cp.estimatedArrivalTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteTripModal
        isOpen={isDeleteOpen}
        tripName={trip.name}
        isDeleting={deleteMutation.isPending}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
