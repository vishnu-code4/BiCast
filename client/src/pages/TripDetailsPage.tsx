// ============================================================
// BiCAST Trip Details Page (/trips/:tripId)
// Complete trip dashboard displaying persistent configuration,
// route metrics, weather risk, fuel plan, and recalculation pipeline.
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
  Fuel,
  Navigation,
  Loader2,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Loader2 size={36} className="animate-spin text-brand-400 mx-auto mb-4" />
        <p className="text-white/60 text-sm">Loading trip details…</p>
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in min-w-0">
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
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-300">
                {trip.freshness?.reason || 'Plan recalculation recommended'}
              </p>
              <p className="text-[11px] text-white/50 mt-0.5">
                Calculated weather forecasts become stale over time. Recalculate to fetch real-time forecasts.
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

      {/* Main Header Banner */}
      <div className="glass rounded-2xl p-6 border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
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

          <div className="flex items-center gap-2 text-sm text-white/70">
            <MapPin size={16} className="text-brand-400 shrink-0" />
            <span className="font-semibold text-white">
              {trip.startLocation.name.split(',')[0]}
            </span>
            <span className="text-white/40">→</span>
            <span className="font-semibold text-white">
              {trip.destination.name.split(',')[0]}
            </span>
            {trip.stops.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 text-white/80">
                +{trip.stops.length} stops
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {recalcSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
              <Check size={14} /> Recalculated!
            </span>
          )}

          {/* Recalculate */}
          <button
            type="button"
            id="trip-details-recalculate-btn"
            onClick={() => handleRecalculate()}
            disabled={recalculateMutation.isPending}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
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
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Edit size={14} />
            Edit Stops
          </button>

          {/* Duplicate */}
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicateMutation.isPending}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
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
            className="px-3 py-2 rounded-xl bg-surface-800 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
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
            className="p-2 rounded-xl text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Delete trip"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Persistent Configuration & Schedule (5 cols) */}
        <div className="lg:col-span-5 space-y-5 min-w-0">
          {/* Schedule & Timing Card */}
          <div className="glass rounded-2xl p-5 border border-white/10 space-y-3.5">
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
                className="text-[11px] text-brand-400 hover:underline"
              >
                {isScheduleEditing ? 'Cancel' : 'Change Time'}
              </button>
            </div>

            {isScheduleEditing ? (
              <div className="space-y-3 p-3 rounded-xl bg-surface-800/60 border border-white/10 text-xs">
                <div>
                  <label className="block text-white/50 mb-1">Journey Date</label>
                  <input
                    type="date"
                    value={newJourneyDate}
                    onChange={(e) => setNewJourneyDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-900 border border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Departure Time</label>
                  <input
                    type="time"
                    value={newDepartureTime}
                    onChange={(e) => setNewDepartureTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-900 border border-white/10 text-white text-xs"
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
                  className="btn-primary w-full py-1.5 text-xs font-semibold"
                >
                  Save & Recalculate
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-white/40 block text-[10px]">Journey Date</span>
                  <span className="font-semibold text-white mt-0.5 block">{trip.journeyDate}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-white/40 block text-[10px]">Departure Time</span>
                  <span className="font-semibold text-white mt-0.5 block">
                    {trip.departureTime} ({trip.timezone})
                  </span>
                </div>
              </div>
            )}

            {activeRoute && (
              <div className="pt-2 border-t border-white/5 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-white/40 block">Distance</span>
                  <span className="font-bold text-white">
                    {(activeRoute.distanceMeters / 1000).toFixed(1)} km
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 block">Duration</span>
                  <span className="font-bold text-white">
                    {Math.floor(activeRoute.durationSeconds / 3600)}h{' '}
                    {Math.round((activeRoute.durationSeconds % 3600) / 60)}m
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 block">Est. Arrival</span>
                  <span className="font-bold text-brand-300">
                    {activeRoute.arrivalTime ? new Date(activeRoute.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* User Stops List */}
          <div className="glass rounded-2xl p-5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={16} className="text-brand-400" />
                Itinerary Stops
              </h3>
              <span className="text-xs text-white/40">{trip.stops.length} user stops</span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Origin */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  A
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-white block truncate">{trip.startLocation.name}</span>
                  <span className="text-[10px] text-white/40">Journey Origin</span>
                </div>
              </div>

              {/* Stops */}
              {trip.stops.map((s, idx) => (
                <div
                  key={s.id || idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface-800/60 border border-white/5"
                >
                  <div className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-white block truncate">{s.name}</span>
                    <span className="text-[10px] text-white/40">
                      Stop {s.sequence} {s.source === 'place' ? '• Added from Places' : ''}
                    </span>
                  </div>
                </div>
              ))}

              {/* Destination */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  B
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-white block truncate">{trip.destination.name}</span>
                  <span className="text-[10px] text-white/40">Final Destination</span>
                </div>
              </div>
            </div>
          </div>

          {/* Persistent Fuel Configuration Card */}
          <div className="glass rounded-2xl p-5 border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Fuel size={16} className="text-brand-400" />
              Bike & Fuel Details
            </h3>

            {trip.fuelConfig?.mileageKmPerLitre ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-white/40 text-[10px] block">Mileage</span>
                  <span className="font-bold text-white">{trip.fuelConfig.mileageKmPerLitre} km/L</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-white/40 text-[10px] block">Fuel Price</span>
                  <span className="font-bold text-white">
                    {trip.fuelConfig.fuelPricePerLitre ? `₹${trip.fuelConfig.fuelPricePerLitre}/L` : '—'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-white/40 text-[10px] block">Current Fuel</span>
                  <span className="font-bold text-white">
                    {trip.fuelConfig.currentFuelLitres != null ? `${trip.fuelConfig.currentFuelLitres} L` : '—'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-white/40 text-[10px] block">Safety Reserve</span>
                  <span className="font-bold text-white">{trip.fuelConfig.reserveLitres ?? 1.5} L</span>
                </div>
                {fuelPlan?.calculation && (
                  <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20">
                      <span className="text-white/40 text-[10px] block">Fuel Required</span>
                      <span className="font-bold text-brand-300">
                        {fuelPlan.calculation.fuelRequiredLitres} L
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20">
                      <span className="text-white/40 text-[10px] block">Estimated Cost</span>
                      <span className="font-bold text-brand-300">
                        ₹{fuelPlan.calculation.estimatedCost?.toLocaleString('en-IN') ?? '—'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-white/40">No motorcycle fuel configuration saved for this ride.</p>
            )}
          </div>
        </div>

        {/* Right Column: Calculated Snapshots (Weather, Risk, Checkpoints) (7 cols) */}
        <div className="lg:col-span-7 space-y-5 min-w-0">
          {/* Weather & Safety Risk Snapshot */}
          <div className="glass rounded-2xl p-5 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={16} className="text-brand-400" />
              Route Safety & Risk Assessment
            </h3>

            {riskAnalysis ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider block">
                      Safety Score
                    </span>
                    <span
                      className={`text-xl font-black ${
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
                    <span className="text-[10px] text-white/40 uppercase tracking-wider block">
                      Risk Level
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      {riskAnalysis.overallLevel}
                    </span>
                  </div>
                </div>

                {riskAnalysis.primaryConcerns && riskAnalysis.primaryConcerns.length > 0 && (
                  <p className="text-xs text-white/80 bg-surface-800/80 p-3 rounded-xl border border-white/5">
                    <span className="text-brand-400 font-semibold">Rider Advisory:</span>{' '}
                    {riskAnalysis.primaryConcerns.join(' • ')}
                  </p>
                )}

                {/* Weather Alerts if any */}
                {riskAnalysis.alerts && riskAnalysis.alerts.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider block">
                      Active Weather Alerts ({riskAnalysis.alerts.length})
                    </span>
                    {riskAnalysis.alerts.map((alt: any, i: number) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300"
                      >
                        <p className="font-semibold">{alt.title}</p>
                        <p className="text-[11px] text-white/60 mt-0.5">{alt.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-white/40">
                No risk snapshot available. Click "Recalculate" to evaluate current weather.
              </p>
            )}
          </div>

          {/* Checkpoints & Weather Progression Timeline */}
          {activeRoute?.checkpoints && activeRoute.checkpoints.length > 0 && (
            <div className="glass rounded-2xl p-5 border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Navigation size={16} className="text-brand-400" />
                Smart Checkpoints & Progress
              </h3>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {activeRoute.checkpoints.map((cp: any) => (
                  <div
                    key={cp.id}
                    className="p-3 rounded-xl bg-surface-800/60 border border-white/5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-white block truncate">{cp.name}</span>
                      <span className="text-[10px] text-white/40">
                        {(cp.distanceFromStartMeters / 1000).toFixed(1)} km from start
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-white font-medium block">
                        {cp.estimatedArrivalTime
                          ? new Date(cp.estimatedArrivalTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>
                      <span className="text-[10px] text-brand-300">Checkpoint {cp.sequence}</span>
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
