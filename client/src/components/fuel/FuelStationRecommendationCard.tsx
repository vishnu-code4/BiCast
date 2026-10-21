// ============================================================
// BiCAST Fuel Station Recommendation Card
// Displays top-ranked reachable fuel stations along route corridor
// with aligned "Add as Stop" action in a responsive Bento grid
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

  // Take top recommended stations
  const topStations = recommendations.slice(0, 4);

  return (
    <div className="bento-tile space-y-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Fuel size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Recommended Fuel Stops</h4>
            <p className="text-[10px] text-white/40">Reachable before hitting fuel reserve</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
          {recommendations.length} {recommendations.length === 1 ? 'Station' : 'Stations'} Located
        </span>
      </div>

      {/* Responsive Grid with Aligned Bottom CTA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {topStations.map((station) => {
          const isAlreadyAdded = currentStops.some(
            (s) =>
              (station.placeId && s.placeId === station.placeId) ||
              (Math.abs(s.lat - station.latitude) < 0.0015 &&
                Math.abs(s.lng - station.longitude) < 0.0015),
          );

          return (
            <div
              key={station.placeId}
              className="bento-subtile p-3.5 rounded-2xl flex flex-col justify-between space-y-3 transition-all hover:border-white/20"
            >
              {/* Upper Details */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span className="text-amber-400">⛽</span>
                      <span className="truncate">{station.name}</span>
                    </h5>
                    {station.address && (
                      <p className="text-[11px] text-white/40 truncate flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="shrink-0 text-white/30" />
                        <span className="truncate">{station.address}</span>
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

                {/* Station metrics 3-col pill */}
                <div className="grid grid-cols-3 gap-1.5 text-[10px] bg-black/30 p-2 rounded-xl border border-white/5 text-center">
                  <div>
                    <span className="text-white/40 block">From Start</span>
                    <span className="font-bold text-white">{station.distanceFromStartKm} km</span>
                  </div>
                  <div>
                    <span className="text-white/40 block">ETA</span>
                    <span className="font-bold text-white flex items-center justify-center gap-0.5">
                      <Clock size={9} className="text-white/40" />
                      {new Date(station.estimatedArrivalTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Detour</span>
                    <span className="font-bold text-brand-300">
                      {station.distanceFromRouteMeters < 1000
                        ? `${Math.round(station.distanceFromRouteMeters)}m`
                        : `${(station.distanceFromRouteMeters / 1000).toFixed(1)}km`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button (Aligned at the bottom) */}
              <button
                type="button"
                onClick={() => onAddStationAsStop(station)}
                disabled={isAlreadyAdded}
                className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                  isAlreadyAdded
                    ? 'bg-white/5 text-white/40 cursor-not-allowed border border-white/10'
                    : 'bg-brand-500 hover:bg-brand-400 text-white font-bold shadow-glow-orange hover:shadow-lg active:scale-95'
                }`}
              >
                {isAlreadyAdded ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span>Added as Route Stop</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Add Fuel Station as Stop</span>
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
