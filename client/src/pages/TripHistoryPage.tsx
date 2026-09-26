// ============================================================
// BiCAST Trip History Page (/history)
// Displays historical journeys, lifetime statistics, and status filters
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in space-y-8">
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

      {/* Statistics Highlights Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Bike size={20} />
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Total Trips</span>
              <span className="text-lg font-bold text-white">{stats.totalTrips}</span>
            </div>
          </div>

          <div className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Completed</span>
              <span className="text-lg font-bold text-emerald-400">{stats.completedTrips}</span>
            </div>
          </div>

          <div className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calendar size={20} />
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Planned</span>
              <span className="text-lg font-bold text-amber-400">{stats.plannedTrips}</span>
            </div>
          </div>

          <div className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <TrendingUp size={20} />
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Total Distance</span>
              <span className="text-lg font-bold text-blue-400">{stats.totalDistanceKm} km</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="glass rounded-2xl p-3 border border-white/10 flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-1.5">
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

      {/* History Grid */}
      {isLoading ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Loader2 size={32} className="animate-spin text-brand-400 mx-auto mb-3" />
          <p className="text-white/50 text-sm">Loading history…</p>
        </div>
      ) : isError ? (
        <div className="glass rounded-2xl p-12 text-center text-rose-400 text-sm">
          Failed to load trip history.
        </div>
      ) : data?.trips && data.trips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
        <div className="glass rounded-2xl p-16 text-center border-dashed border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-4 text-white/30">
            <Clock size={28} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No past journeys recorded</h3>
          <p className="text-white/40 text-xs sm:text-sm max-w-sm mx-auto mb-6">
            Completed, planned, and archived trips will appear here as your rider logbook grows.
          </p>
          <Link to="/plan" className="btn-primary inline-flex items-center gap-2 text-xs py-2 px-4">
            <Bike size={16} /> Plan a Ride
          </Link>
        </div>
      )}

      {/* Delete Modal */}
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
