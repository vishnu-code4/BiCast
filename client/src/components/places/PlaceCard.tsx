// ============================================================
// BiCAST Place Card Component
// Compact, transparent place details with deterministic route metrics
// and "Add as Stop" action
// ============================================================
import { Place } from '@/types/places';
import { getCategoryConfig } from '@/config/placeCategories';
import { formatDistanceFromRoute, formatDetourTime } from '@/services/placesService';
import { Star, MapPin, Plus, Check, Clock } from 'lucide-react';

interface PlaceCardProps {
  place: Place;
  isAlreadyStop?: boolean;
  onAddAsStop?: (place: Place) => void;
  compact?: boolean;
}

export default function PlaceCard({
  place,
  isAlreadyStop = false,
  onAddAsStop,
  compact = false,
}: PlaceCardProps) {
  const catConfig = getCategoryConfig(place.category);

  return (
    <div className={`text-slate-900 ${compact ? 'text-xs p-1' : 'p-3 text-sm'}`}>
      {/* Category & Open status */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
          <span>{catConfig?.icon ?? '📍'}</span>
          <span>{catConfig?.shortName ?? place.category}</span>
        </div>

        {place.openNow != null && (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              place.openNow
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {place.openNow ? 'Open Now' : 'Closed'}
          </span>
        )}
      </div>

      {/* Place Name */}
      <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
        {place.name}
      </h4>

      {/* Address */}
      {place.address && (
        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 flex items-start gap-1">
          <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" />
          <span>{place.address}</span>
        </p>
      )}

      {/* Ratings & Route Metrics */}
      <div className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-1.5">
        {/* Rating */}
        {place.rating != null && (
          <div className="flex items-center gap-1 text-xs">
            <div className="flex items-center text-amber-500 font-bold">
              <Star size={13} className="fill-amber-400 text-amber-500 mr-0.5" />
              <span>{place.rating.toFixed(1)}</span>
            </div>
            {place.userRatingCount != null && (
              <span className="text-slate-400 text-[11px]">
                ({place.userRatingCount.toLocaleString()} reviews)
              </span>
            )}
          </div>
        )}

        {/* Route Proximity & Detour */}
        <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-200/50">
          <div>
            <span className="block text-[9px] text-slate-400 uppercase tracking-wider">From Route</span>
            <span className="text-slate-800 font-semibold">
              {formatDistanceFromRoute(place.distanceFromRouteMeters)}
            </span>
          </div>

          <div>
            <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Est. Detour</span>
            <span className="text-slate-800 font-semibold flex items-center gap-1">
              <Clock size={10} className="text-slate-400" />
              {formatDetourTime(place.estimatedDetourSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Add as Stop Action */}
      {onAddAsStop && (
        <div className="mt-3">
          <button
            onClick={() => onAddAsStop(place)}
            disabled={isAlreadyStop}
            className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
              isAlreadyStop
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
            }`}
          >
            {isAlreadyStop ? (
              <>
                <Check size={14} className="text-emerald-600" />
                Already Added as Stop
              </>
            ) : (
              <>
                <Plus size={14} />
                Add as Stop
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
