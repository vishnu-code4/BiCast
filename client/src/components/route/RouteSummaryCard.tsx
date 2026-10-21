// ============================================================
// BiCAST Route Summary & Bento Intelligence Deck
// Provides Modular Route Alternatives Strip, Metric Grid,
// Safety Breakdown, and Full-Width Weather & Itinerary Timeline
// ============================================================
import { useState } from 'react';
import {
  CheckCircle2,
  CloudSun,
  ListOrdered,
  AlertTriangle,
  Clock,
  Compass,
} from 'lucide-react';
import { PlannedRoute } from '@/types/route';
import { RouteWeatherTimeline as IRouteWeatherTimeline } from '@/types/weather';
import { RouteRiskAnalysis } from '@/types/risk';
import { RouteFuelPlan } from '@/types/fuel';
import RouteWeatherTimeline from '@/components/weather/RouteWeatherTimeline';
import { getRiskLevelBadge } from '@/services/riskService';
import SafetyScoreBadge from '@/components/risk/SafetyScoreBadge';
import WeatherAlertsBanner from '@/components/risk/WeatherAlertsBanner';
import RiderRecommendationsCard from '@/components/risk/RiderRecommendationsCard';
import RiskFactorBreakdown from '@/components/risk/RiskFactorBreakdown';

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${mins} min`;
  return `${hours} hr ${mins} min`;
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ------------------------------------------------------------
// 1. Route Alternatives Comparison Strip (Horizontal Grid)
// ------------------------------------------------------------
export interface RouteAlternativesStripProps {
  routes: PlannedRoute[];
  selectedRouteId: string;
  onSelectRoute: (id: string) => void;
  riskAnalyses?: Record<string, RouteRiskAnalysis> | null;
  fuelPlans?: Record<string, RouteFuelPlan> | null;
}

export function RouteAlternativesStrip({
  routes,
  selectedRouteId,
  onSelectRoute,
  riskAnalyses,
  fuelPlans,
}: RouteAlternativesStripProps) {
  if (routes.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-white/50 px-1">
        <span className="section-label text-[11px] font-bold text-brand-400">
          Route Alternatives ({routes.length})
        </span>
        <span className="text-[10px] text-white/40">Select route to compare map & telemetry</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {routes.map((route, index) => {
          const isSelected = route.id === selectedRouteId;
          const routeRisk = riskAnalyses?.[route.id];
          const riskBadge = routeRisk ? getRiskLevelBadge(routeRisk.overallLevel) : null;
          const hasSevere = routeRisk && routeRisk.severeSegments.length > 0;
          const routeFuel = fuelPlans?.[route.id];

          return (
            <button
              key={route.id}
              type="button"
              onClick={() => onSelectRoute(route.id)}
              className={`text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-brand-500/15 border-brand-500/60 shadow-bento ring-1 ring-brand-500/40 -translate-y-0.5'
                  : 'bento-subtile hover:border-white/20'
              }`}
            >
              {/* Top Row: Route Title & Badges */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70 shrink-0">
                      #{index + 1}
                    </span>
                    <span className="text-xs font-bold text-white truncate">
                      {route.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {routeRisk?.tags?.isSafest && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Safest
                      </span>
                    )}
                    {routeRisk?.tags?.isFastest && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Fastest
                      </span>
                    )}
                    {routeFuel?.isMostFuelEfficient && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Fuel Saver
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-brand-400 ml-0.5">
                        <CheckCircle2 size={14} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Distance, Duration & Fuel */}
                <div className="flex items-center gap-2 mt-2 text-xs text-white/80">
                  <span className="font-semibold text-white">
                    {(route.distanceMeters / 1000).toFixed(0)} km
                  </span>
                  <span className="text-white/30">&bull;</span>
                  <span>{formatDuration(route.durationSeconds)}</span>
                  {routeFuel?.calculation?.mileageKmPerLitre ? (
                    <>
                      <span className="text-white/30">&bull;</span>
                      <span className="text-amber-300 font-medium">
                        {routeFuel.calculation.fuelRequiredLitres} L
                      </span>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Bottom Row: Risk / Safety Score */}
              {routeRisk && riskBadge && (
                <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-white/10 text-[11px]">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${riskBadge.borderClass} ${riskBadge.bgClass} ${riskBadge.textClass} flex items-center gap-1`}
                  >
                    <span>{riskBadge.symbol}</span>
                    <span>Safety: {routeRisk.overallScore}/100</span>
                  </span>
                  {hasSevere ? (
                    <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-0.5">
                      <AlertTriangle size={11} /> Severe Zone
                    </span>
                  ) : (
                    <span className="text-white/50 text-[10px] capitalize">
                      {routeRisk.overallLevel.toLowerCase()} Risk
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// 2. Active Route Summary Metrics (2x3 Metric Pill Grid)
// ------------------------------------------------------------
export interface ActiveRouteSummaryMetricsProps {
  route: PlannedRoute;
  fuelPlan?: RouteFuelPlan | null;
}

export function ActiveRouteSummaryMetrics({
  route,
  fuelPlan,
}: ActiveRouteSummaryMetricsProps) {
  const hasFuel = fuelPlan && fuelPlan.calculation?.mileageKmPerLitre > 0;

  return (
    <div className="space-y-3 mt-3">
      {/* Route title & header */}
      <div className="flex items-start justify-between gap-3 pb-2 border-b border-white/10">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
            Active Corridor
          </p>
          <h4 className="text-base font-bold text-white truncate mt-0.5">{route.name}</h4>
          {route.summary && (
            <p className="text-xs text-white/50 truncate mt-0.5">{route.summary}</p>
          )}
        </div>
      </div>

      {/* 2x3 Metric Pill Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Distance */}
        <div className="bento-subtile space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Distance</p>
          <p className="text-base font-bold text-white">
            {(route.distanceMeters / 1000).toFixed(0)} <span className="text-xs font-normal text-white/60">km</span>
          </p>
          <p className="text-[10px] text-white/40 truncate">Road corridor</p>
        </div>

        {/* Duration */}
        <div className="bento-subtile space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Duration</p>
          <p className="text-base font-bold text-white">
            {formatDuration(route.durationSeconds)}
          </p>
          <p className="text-[10px] text-white/40 truncate">Moving time</p>
        </div>

        {/* Estimated Arrival */}
        <div className="bento-subtile space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80">Est. Arrival</p>
          <p className="text-base font-bold text-emerald-400">
            {formatTime(route.arrivalTime)}
          </p>
          <p className="text-[10px] text-white/40 truncate">{formatDate(route.arrivalTime)}</p>
        </div>

        {/* User Stops */}
        <div className="bento-subtile space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">Planned Stops</p>
          <p className="text-base font-bold text-amber-300">
            {route.stops.length} <span className="text-xs font-normal text-white/60">{route.stops.length === 1 ? 'Stop' : 'Stops'}</span>
          </p>
          <p className="text-[10px] text-white/40 truncate">
            {route.stops.length > 0 ? 'Custom halts' : 'Direct ride'}
          </p>
        </div>

        {/* Checkpoints */}
        <div className="bento-subtile space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">Checkpoints</p>
          <p className="text-base font-bold text-cyan-300">
            {route.checkpoints.length} <span className="text-xs font-normal text-white/60">Nodes</span>
          </p>
          <p className="text-[10px] text-white/40 truncate">15–30 min intervals</p>
        </div>

        {/* Fuel Required */}
        <div className="bento-subtile space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">Fuel Needed</p>
          {hasFuel ? (
            <>
              <p className="text-base font-bold text-amber-400">
                {fuelPlan.calculation.fuelRequiredLitres} <span className="text-xs font-normal text-white/60">L</span>
              </p>
              <p className="text-[10px] text-white/40 truncate">
                {fuelPlan.calculation.estimatedCost != null ? `₹${fuelPlan.calculation.estimatedCost}` : `@${fuelPlan.calculation.mileageKmPerLitre} km/L`}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-white/50">Optional</p>
              <p className="text-[10px] text-white/40 truncate">Set bike mileage</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// 3. Route Weather Timeline & Itinerary Switcher (Full Width)
// ------------------------------------------------------------
export interface RouteWeatherTimelineAndItineraryProps {
  route: PlannedRoute;
  timeline?: IRouteWeatherTimeline | null;
  isLoading?: boolean;
  riskAnalysis?: RouteRiskAnalysis | null;
  fuelPlan?: RouteFuelPlan | null;
}

export function RouteWeatherTimelineAndItinerary({
  route,
  timeline,
  isLoading,
  riskAnalysis,
  fuelPlan,
}: RouteWeatherTimelineAndItineraryProps) {
  const [activeTab, setActiveTab] = useState<'weather' | 'itinerary'>('weather');

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Compass size={20} className="text-brand-400" />
            Route Timeline & Journey Plan
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            Synchronized weather forecasts and waypoint itinerary for all 15–30 min intervals along {route.name}.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('weather')}
            className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'weather'
                ? 'bg-brand-500 text-white shadow-glow-orange'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <CloudSun size={15} />
            Weather Timeline
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('itinerary')}
            className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'itinerary'
                ? 'bg-brand-500 text-white shadow-glow-orange'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <ListOrdered size={15} />
            Itinerary & Stops ({route.checkpoints.length + 2})
          </button>
        </div>
      </div>

      {/* Tab 1: Route Weather Timeline */}
      {activeTab === 'weather' && (
        <RouteWeatherTimeline
          timeline={timeline ?? null}
          isLoading={isLoading}
          checkpointRisks={riskAnalysis?.checkpoints}
          checkpointFuelEstimates={fuelPlan?.checkpointEstimates}
        />
      )}

      {/* Tab 2: Full Itinerary Timeline */}
      {activeTab === 'itinerary' && (
        <div className="pt-2 space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {/* Start point */}
          <div className="bento-subtile flex items-start gap-3 p-3.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-black font-black text-xs shrink-0 mt-0.5 shadow-sm">
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-white text-sm truncate">
                  Start: {route.legs[0]?.startLocation.name}
                </p>
                <span className="text-xs text-emerald-400 font-mono font-semibold">
                  {formatTime(route.departureTime)}
                </span>
              </div>
              <p className="text-[11px] text-white/50 mt-0.5">
                Departure point &bull; 0.0 km
              </p>
            </div>
          </div>

          {/* Checkpoints & Stops in sequence */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {route.checkpoints.map((cp) => (
              <div
                key={cp.id}
                className="bento-subtile flex items-start gap-3 p-3 rounded-xl border border-white/5"
              >
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {cp.sequence}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="font-semibold text-white text-xs truncate">{cp.name}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 uppercase">
                      {cp.locationType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-cyan-300 font-mono">
                    <Clock size={11} />
                    <span>{formatTime(cp.estimatedArrivalTime)}</span>
                    <span className="text-white/30">&bull;</span>
                    <span>{(cp.distanceFromStartMeters / 1000).toFixed(0)} km</span>
                    <span className="text-white/30">&bull;</span>
                    <span>~{Math.round(cp.elapsedTravelTimeSeconds / 60)}m</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Destination point */}
          <div className="bento-subtile flex items-start gap-3 p-3.5 rounded-xl border-rose-500/30">
            <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-white font-black text-xs shrink-0 mt-0.5 shadow-sm">
              B
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-white text-sm truncate">
                  Destination: {route.legs[route.legs.length - 1]?.endLocation.name}
                </p>
                <span className="text-xs text-rose-400 font-mono font-semibold">
                  {formatTime(route.arrivalTime)}
                </span>
              </div>
              <p className="text-[11px] text-white/50 mt-0.5">
                Arrival point &bull; {(route.distanceMeters / 1000).toFixed(0)} km total distance
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// 4. Default Export: RouteSummaryCard
// Preserves backward compatibility for full unified rendering
// ------------------------------------------------------------
export interface RouteSummaryCardProps {
  routes: PlannedRoute[];
  selectedRouteId: string;
  onSelectRoute: (id: string) => void;
  weatherTimelines?: Record<string, IRouteWeatherTimeline> | null;
  isWeatherLoading?: boolean;
  riskAnalyses?: Record<string, RouteRiskAnalysis> | null;
  isRiskLoading?: boolean;
  fuelPlans?: Record<string, RouteFuelPlan> | null;
}

export default function RouteSummaryCard({
  routes,
  selectedRouteId,
  onSelectRoute,
  weatherTimelines,
  isWeatherLoading,
  riskAnalyses,
  isRiskLoading,
  fuelPlans,
}: RouteSummaryCardProps) {
  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const activeTimeline = weatherTimelines && activeRoute ? weatherTimelines[activeRoute.id] ?? null : null;
  const activeRisk = riskAnalyses && activeRoute ? riskAnalyses[activeRoute.id] ?? null : null;
  const activeFuel = fuelPlans && activeRoute ? fuelPlans[activeRoute.id] ?? null : null;

  if (!activeRoute) return null;

  return (
    <div className="space-y-5">
      {/* Route Alternatives */}
      {routes.length > 1 && (
        <RouteAlternativesStrip
          routes={routes}
          selectedRouteId={selectedRouteId}
          onSelectRoute={onSelectRoute}
          riskAnalyses={riskAnalyses}
          fuelPlans={fuelPlans}
        />
      )}

      {/* Safety Badge */}
      <SafetyScoreBadge analysis={activeRisk} isLoading={isRiskLoading} />

      {/* Weather Alerts */}
      {activeRisk && activeRisk.alerts.length > 0 && (
        <WeatherAlertsBanner alerts={activeRisk.alerts} />
      )}

      {/* Active Route Summary Metrics */}
      <div className="bento-tile">
        <ActiveRouteSummaryMetrics route={activeRoute} fuelPlan={activeFuel} />
      </div>

      {/* Rider Recommendations */}
      {activeRisk && activeRisk.recommendations.length > 0 && (
        <RiderRecommendationsCard recommendations={activeRisk.recommendations} />
      )}

      {/* Risk Factor Breakdown */}
      {activeRisk && activeRisk.checkpoints.length > 0 && (
        <RiskFactorBreakdown checkpoints={activeRisk.checkpoints} />
      )}

      {/* Weather Timeline & Itinerary */}
      <div className="bento-tile">
        <RouteWeatherTimelineAndItinerary
          route={activeRoute}
          timeline={activeTimeline}
          isLoading={isWeatherLoading}
          riskAnalysis={activeRisk}
          fuelPlan={activeFuel}
        />
      </div>
    </div>
  );
}
