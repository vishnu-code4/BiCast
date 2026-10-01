// ============================================================
// BiCAST Fuel Station Recommendation Card
// Displays top-ranked reachable fuel stations along route corridor
// with "Add as Stop" action
// ============================================================
import { FuelStationRecommendation } from '@/types/fuel';
import { LocationInput } from '@/types/route';
import { Fuel, MapPin, Clock, Plus, Check, Star } from 'lucide-react';

interface FuelStationRecommendationCardProps {
  recommendations: FuelStationRecommendation[];
  currentStops?: LocationInput[];
  onAddStationAsStop: (station: FuelStationRecommendation) => void;
}

export default function FuelStationRecommendationCard({
  recommendations,
  currentStops = [],
  onAddStationAsStop,
}: FuelStationRecommendationCardProps) {
  if (!recommendations || recommendations.length === 0) return null;

  // Take top 2 recommended stations
  const topStations = recommendations.slice(0, 2);

  return (
    <div className="glass rounded-2xl p-4 border border-white/10 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Fuel size={15} />
          </div>
          <h4 className="text-sm font-semibold text-white">Recommended Fuel Stops</h4>
        </div>
        <span className="text-[10px] text-white/40">Reachable before reserve</span>
      </div>

      <div className="space-y-2.5">
        {topStations.map((station) => {
          const isAlreadyAdded = currentStops.some(
            (s) =>
              (station.placeId && s.placeId === station.placeId) ||
              (Math.abs(s.lat - station.latitude) < 0.0015 && Math.abs(s.lng - station.longitude) < 0.0015),
          );

          return (
            <div
              key={station.placeId}
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    <span className="text-amber-400">⛽</span>
                    <span>{station.name}</span>
                  </h5>
                  {station.address && (
                    <p className="text-[11px] text-white/40 truncate flex items-center gap-1 mt-0.5">
                      <MapPin size={10} className="shrink-0 text-white/30" />
                      <span>{station.address}</span>
                    </p>
                  )}
                </div>

                {station.rating != null && (
                  <div className="flex items-center gap-0.5 text-[11px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 shrink-0">
                    <Star size={10} className="fill-amber-400" />
                    <span>{station.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Station metrics */}
              <div className="grid grid-cols-3 gap-1.5 text-[10px] bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                <div>
                  <span className="text-white/40 block">From Start</span>
                  <span className="font-semibold text-white">{station.distanceFromStartKm} km</span>
                </div>
                <div>
                  <span className="text-white/40 block">ETA</span>
                  <span className="font-semibold text-white flex items-center justify-center gap-0.5">
                    <Clock size={9} className="text-white/40" />
                    {new Date(station.estimatedArrivalTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-white/40 block">Detour</span>
                  <span className="font-semibold text-brand-300">
                    {station.distanceFromRouteMeters < 1000
                      ? `${Math.round(station.distanceFromRouteMeters)}m`
                      : `${(station.distanceFromRouteMeters / 1000).toFixed(1)}km`}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onAddStationAsStop(station)}
                disabled={isAlreadyAdded}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                  isAlreadyAdded
                    ? 'bg-white/5 text-white/40 cursor-not-allowed border border-white/10'
                    : 'bg-brand-500 hover:bg-brand-400 text-black font-semibold'
                }`}
              >
                {isAlreadyAdded ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    Added as Stop
                  </>
                ) : (
                  <>
                    <Plus size={13} />
                    Add Fuel Station as Stop
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
