// ============================================================
// BiCAST Trip History Page (/history)
// Displays historical journeys, lifetime statistics, and status filters
// Responsive Bento Grid Layout System
// ============================================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Bike,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Loader2,
  MapPin,
} from 'lucide-react';
import TripCard from '@/components/trips/TripCard';
import DeleteTripModal from '@/components/trips/DeleteTripModal';
import { useTripHistory, useDeleteTrip } from '@/services/tripService';
import { TripStatus } from '@/types/trip';

export default function TripHistoryPage() {
  const [filterStatus, setFilterStatus] = useState<'ALL' | TripStatus>('ALL');
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  }>({
    isOpen: false,
    id: '',
    name: '',
  });

  const deleteMutation = useDeleteTrip();

  const { data, isLoading, isError } = useTripHistory({
    status: filterStatus,
    sort: 'newest',
    page: 1,
    limit: 50,
  });

  const handleDeleteRequest = (id: string, name: string) => {
    setDeleteModalState({ isOpen: true, id, name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalState.id) return;
    try {
      await deleteMutation.mutateAsync(deleteModalState.id);
      setDeleteModalState({ isOpen: false, id: '', name: '' });
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const stats = data?.stats;

  return (
    <div className="page-container py-8 sm:py-10 animate-fade-in space-y-8 min-w-0">
      {/* Header */}
      <div>
        <p className="section-label mb-1.5 flex items-center gap-1.5">
          <Clock size={14} className="text-brand-400" />
          Rider Logbook
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Trip History & Logbook
        </h1>
        <p className="text-white/50 text-xs sm:text-sm mt-1">
          Review previous journeys, completed rides, and motorcycle route history.
        </p>
      </div>

      {/* Upgraded 4 Statistics Highlights Tiles with Watermark & Bento Styling */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Trips */}
          <div className="bento-tile-interactive p-4 sm:p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
            {/* Background Icon Watermark */}
            <div className="absolute -right-3 -bottom-3 text-white/[0.04] group-hover:text-brand-500/[0.08] transition-colors pointer-events-none">
              <Bike size={80} />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-semibold">
                Total Trips
              </span>
              <div className="w-8 h-8 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <Bike size={16} />
              </div>
            </div>
            <div className="mt-3 relative z-10">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {stats.totalTrips}
              </span>
              <span className="text-[11px] text-white/40 block mt-0.5">Rider logbook entries</span>
            </div>
          </div>

          {/* Completed */}
          <div className="bento-tile-interactive p-4 sm:p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-3 -bottom-3 text-white/[0.04] group-hover:text-emerald-500/[0.08] transition-colors pointer-events-none">
              <CheckCircle2 size={80} />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-semibold">
                Completed
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-3 relative z-10">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
                {stats.completedTrips}
              </span>
              <span className="text-[11px] text-white/40 block mt-0.5">Finished journeys</span>
            </div>
          </div>

          {/* Planned */}
          <div className="bento-tile-interactive p-4 sm:p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-3 -bottom-3 text-white/[0.04] group-hover:text-amber-500/[0.08] transition-colors pointer-events-none">
              <Calendar size={80} />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-semibold">
                Planned
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Calendar size={16} />
              </div>
            </div>
            <div className="mt-3 relative z-10">
              <span className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight">
                {stats.plannedTrips}
              </span>
              <span className="text-[11px] text-white/40 block mt-0.5">Upcoming rides</span>
            </div>
          </div>

          {/* Total Distance */}
          <div className="bento-tile-interactive p-4 sm:p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-3 -bottom-3 text-white/[0.04] group-hover:text-cyan-500/[0.08] transition-colors pointer-events-none">
              <TrendingUp size={80} />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-semibold">
                Total Distance
              </span>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="mt-3 relative z-10">
              <span className="text-xl sm:text-2xl font-black text-cyan-300 tracking-tight">
                {stats.totalDistanceKm} <span className="text-xs font-normal text-white/50">km</span>
              </span>
              <span className="text-[11px] text-white/40 block mt-0.5">Cumulative kilometers</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bento-tile p-3 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max">
          {(['ALL', 'COMPLETED', 'PLANNED', 'CANCELLED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === st
                  ? 'bg-brand-500 text-white shadow-glow-orange'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {st === 'ALL' ? 'All Journeys' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* History Grid (Responsive 4-column Bento grid with uniform heights) */}
      {isLoading ? (
        <div className="bento-tile p-16 text-center">
          <Loader2 size={32} className="animate-spin text-brand-400 mx-auto mb-3" />
          <p className="text-white/50 text-sm">Loading history…</p>
        </div>
      ) : isError ? (
        <div className="bento-tile p-12 text-center text-rose-400 text-sm border-rose-500/20">
          Failed to load trip history.
        </div>
      ) : data?.trips && data.trips.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 items-stretch">
          {data.trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onDeleteRequest={handleDeleteRequest}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bento-tile p-16 text-center border-dashed border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-4 text-brand-400">
            <Clock size={28} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No past journeys recorded</h3>
          <p className="text-white/40 text-xs sm:text-sm max-w-sm mx-auto mb-6 leading-relaxed">
            As you plan, complete, or archive rides in BiCAST, they will automatically appear in your rider logbook.
          </p>
          <Link
            to="/plan"
            id="empty-history-plan-cta"
            className="btn-primary inline-flex items-center gap-2 py-2.5 px-5 text-xs font-semibold shadow-bento"
          >
            <Bike size={16} />
            Plan a Journey
            <MapPin size={14} />
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteTripModal
        isOpen={deleteModalState.isOpen}
        tripName={deleteModalState.name}
        isDeleting={deleteMutation.isPending}
        onClose={() => setDeleteModalState({ isOpen: false, id: '', name: '' })}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
