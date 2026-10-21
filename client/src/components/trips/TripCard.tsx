// ============================================================
// BiCAST Trip Card Component
// Bento-styled interactive card displaying saved journey configuration,
// metrics, route visual pill, and action buttons.
// ============================================================
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  RefreshCw,
  Copy,
  Trash2,
  ExternalLink,
  Edit,
  Loader2,
} from 'lucide-react';
import { TripListItem } from '@/types/trip';
import {
  getTripStatusBadge,
  getFreshnessBadge,
  useDuplicateTrip,
  useRecalculateTrip,
} from '@/services/tripService';

interface TripCardProps {
  trip: TripListItem;
  onDeleteRequest: (id: string, name: string) => void;
}

export default function TripCard({ trip, onDeleteRequest }: TripCardProps) {
  const navigate = useNavigate();
  const statusBadge = getTripStatusBadge(trip.status);
  const freshnessBadge = getFreshnessBadge(trip.freshness);

  const duplicateMutation = useDuplicateTrip();
  const recalculateMutation = useRecalculateTrip();
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const copy = await duplicateMutation.mutateAsync({ id: trip.id });
      setActionSuccess('Duplicated!');
      setTimeout(() => setActionSuccess(null), 2000);
      navigate(`/trips/${copy.id}`);
    } catch (err) {
      console.error('Failed to duplicate:', err);
    }
  };

  const handleRecalculate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await recalculateMutation.mutateAsync({ id: trip.id });
      setActionSuccess('Recalculated!');
      setTimeout(() => setActionSuccess(null), 2000);
    } catch (err) {
      console.error('Failed to recalculate:', err);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/plan?editTripId=${trip.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteRequest(trip.id, trip.name);
  };

  return (
    <div className="bento-tile-interactive h-full flex flex-col justify-between group">
      <div className="space-y-3.5">
        {/* Top Badges & Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBadge.bgColor} ${statusBadge.textColor} ${statusBadge.borderColor}`}
            >
              {statusBadge.label}
            </span>

            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${freshnessBadge.bgColor} ${freshnessBadge.textColor} ${freshnessBadge.borderColor}`}
            >
              {freshnessBadge.label}
            </span>
          </div>

          {actionSuccess && (
            <span className="text-[10px] font-semibold text-emerald-400 animate-fade-in">
              {actionSuccess}
            </span>
          )}
        </div>

        {/* Trip Title */}
        <div>
          <Link
            to={`/trips/${trip.id}`}
            className="text-base font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-1 leading-snug"
            title={trip.name}
          >
            {trip.name}
          </Link>
        </div>

        {/* Styled Route Visual Pill */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-white">
            {/* Origin */}
            <span
              className="flex items-center gap-1.5 truncate max-w-[120px]"
              title={trip.startLocation.name}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-500/50" />
              <span className="truncate">{trip.startLocation.name.split(',')[0]}</span>
            </span>

            {/* Dashed connector line with optional +N stops badge */}
            <div className="flex-1 mx-2 relative flex items-center justify-center">
              <div className="w-full border-t border-dashed border-white/20" />
              {trip.stopsCount > 0 && (
                <span className="absolute bg-surface-800 border border-white/10 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-amber-300 shrink-0 shadow-sm">
                  +{trip.stopsCount}
                </span>
              )}
            </div>

            {/* Destination */}
            <span
              className="flex items-center gap-1.5 truncate max-w-[120px] justify-end"
              title={trip.destination.name}
            >
              <span className="truncate">{trip.destination.name.split(',')[0]}</span>
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 shadow-sm shadow-rose-500/50" />
            </span>
          </div>
        </div>

        {/* Schedule Row */}
        <div className="flex items-center gap-4 text-xs text-white/50 border-t border-b border-white/5 py-2">
          <span className="flex items-center gap-1.5">
            <Calendar size={13} className="text-brand-400" />
            <span>{trip.journeyDate}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-brand-400" />
            <span>{trip.departureTime}</span>
          </span>
        </div>

        {/* 3-Column Metrics Row */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {/* Distance */}
          <div className="bento-subtile p-2 rounded-xl space-y-0.5">
            <span className="text-[10px] text-white/40 block uppercase font-semibold">Distance</span>
            <span className="font-bold text-white text-xs block">
              {trip.distanceKm ? `${trip.distanceKm} km` : '—'}
            </span>
          </div>

          {/* Safety */}
          <div className="bento-subtile p-2 rounded-xl space-y-0.5">
            <span className="text-[10px] text-white/40 block uppercase font-semibold">Safety</span>
            <span
              className={`font-bold text-xs block ${
                trip.safetyScore != null
                  ? trip.safetyScore >= 80
                    ? 'text-emerald-400'
                    : trip.safetyScore >= 60
                    ? 'text-amber-400'
                    : 'text-rose-400'
                  : 'text-white/40'
              }`}
            >
              {trip.safetyScore != null ? `${trip.safetyScore}/100` : '—'}
            </span>
          </div>

          {/* Fuel */}
          <div className="bento-subtile p-2 rounded-xl space-y-0.5">
            <span className="text-[10px] text-white/40 block uppercase font-semibold">Fuel</span>
            <span className="font-bold text-brand-300 text-xs block">
              {trip.fuelRequiredLitres ? `${trip.fuelRequiredLitres.toFixed(1)} L` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-1.5 pt-3.5 mt-3 border-t border-white/5">
        <Link
          to={`/trips/${trip.id}`}
          className="bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 font-semibold transition-all shadow-sm group-hover:border-brand-500/50"
        >
          <ExternalLink size={13} />
          <span>View Details</span>
        </Link>

        <div className="flex items-center gap-1">
          {/* Recalculate */}
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalculateMutation.isPending}
            title="Recalculate route, weather & fuel"
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            {recalculateMutation.isPending ? (
              <Loader2 size={15} className="animate-spin text-brand-400" />
            ) : (
              <RefreshCw size={15} />
            )}
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={handleEdit}
            title="Edit stops & route in planner"
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Edit size={15} />
          </button>

          {/* Duplicate */}
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicateMutation.isPending}
            title="Duplicate trip"
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            {duplicateMutation.isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Copy size={15} />
            )}
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            title="Delete saved trip"
            className="p-1.5 rounded-lg text-white/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
