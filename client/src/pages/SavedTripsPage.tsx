// ============================================================
// BiCAST Saved Trips Page (/saved-trips)
// Displays persistent ride plans with filtering, search, and trip actions
// ============================================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  Bike,
  MapPin,
  Search,
  Plus,
  Loader2,
} from 'lucide-react';
import TripCard from '@/components/trips/TripCard';
import DeleteTripModal from '@/components/trips/DeleteTripModal';
import { useTrips, useDeleteTrip } from '@/services/tripService';
import { TripStatus } from '@/types/trip';

export default function SavedTripsPage() {
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | TripStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'journeyDate'>('newest');

  // Delete modal state
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

  const { data, isLoading, isError } = useTrips({
    status: selectedStatus,
    search: searchQuery.trim() || undefined,
    sort: sortBy,
    page: 1,
    limit: 50,
  });

  const handleDeleteRequest = (id: string, name: string) => {
    setDeleteModalState({
      isOpen: true,
      id,
      name,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalState.id) return;
    try {
      await deleteMutation.mutateAsync(deleteModalState.id);
      setDeleteModalState({ isOpen: false, id: '', name: '' });
    } catch (err) {
      console.error('Failed to delete trip:', err);
    }
  };

  const tabs: { key: 'ALL' | TripStatus; label: string }[] = [
    { key: 'ALL', label: 'All Trips' },
    { key: 'PLANNED', label: 'Planned' },
    { key: 'DRAFT', label: 'Drafts' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="section-label mb-1.5 flex items-center gap-1.5">
            <Bookmark size={14} className="text-brand-400" />
            Saved Itineraries
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Saved Trips
          </h1>
          <p className="text-white/50 text-xs sm:text-sm mt-1">
            Manage your persistent ride routes, checkpoints, and fuel plans.
          </p>
        </div>

        <Link
          to="/plan"
          id="saved-trips-plan-new-btn"
          className="btn-primary py-2.5 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 self-start sm:self-auto shadow-lg"
        >
          <Plus size={16} />
          Plan New Ride
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedStatus(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === tab.key
                  ? 'bg-brand-500 text-white shadow-glow-orange'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-64">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destination, name…"
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-800 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-surface-800 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="journeyDate">Journey Date</option>
          </select>
        </div>
      </div>

      {/* Trips Content */}
      {isLoading ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Loader2 size={32} className="animate-spin text-brand-400 mx-auto mb-3" />
          <p className="text-white/50 text-sm">Loading your saved trips…</p>
        </div>
      ) : isError ? (
        <div className="glass rounded-2xl p-12 text-center border-rose-500/20">
          <p className="text-rose-400 text-sm font-semibold mb-2">
            Could not load saved trips.
          </p>
          <p className="text-white/40 text-xs max-w-sm mx-auto mb-4">
            An error occurred while fetching your trips. Please try again.
          </p>
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
          <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-4 text-brand-400">
            <Bookmark size={28} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {searchQuery ? 'No matching trips found' : 'No saved trips yet'}
          </h3>
          <p className="text-white/40 text-xs sm:text-sm max-w-sm mx-auto mb-6 leading-relaxed">
            {searchQuery
              ? `No trip matches "${searchQuery}". Try a different search term or filter.`
              : 'When you plan a ride in BiCAST, click "Save Trip" to store the route, stops, and fuel plan for later.'}
          </p>
          <Link
            to="/plan"
            id="empty-plan-trip-cta"
            className="btn-primary inline-flex items-center gap-2 py-2.5 px-5 text-xs font-semibold"
          >
            <Bike size={16} />
            Plan a Ride Now
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
