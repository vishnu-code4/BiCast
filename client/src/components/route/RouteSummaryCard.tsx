import { useState } from 'react';
import {
  CheckCircle2,
  CloudSun,
  ListOrdered,
  AlertTriangle,
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
import { Fuel } from 'lucide-react';

interface RouteSummaryCardProps {
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
  const [activeTab, setActiveTab] = useState<'weather' | 'itinerary'>('weather');
  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const activeTimeline = weatherTimelines && activeRoute ? weatherTimelines[activeRoute.id] ?? null : null;
  const activeRisk = riskAnalyses && activeRoute ? riskAnalyses[activeRoute.id] ?? null : null;
  const activeFuel = fuelPlans && activeRoute ? fuelPlans[activeRoute.id] ?? null : null;

  if (!activeRoute) return null;

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    if (hours === 0) return `${mins} min`;
    return `${hours} hr ${mins} min`;
  };

  const formatTime = (isoString: string): string => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString: string): string => {
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Route Alternatives Selector Tabs */}
      {routes.length > 1 && (
        <div className="space-y-2">
          <p className="section-label text-xs">Route Alternatives ({routes.length})</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {routes.map((route) => {
              const isSelected = route.id === selectedRouteId;
              const routeRisk = riskAnalyses?.[route.id];
              const riskBadge = routeRisk ? getRiskLevelBadge(routeRisk.overallLevel) : null;
              const hasSevere = routeRisk && routeRisk.severeSegments.length > 0;

              return (
                <button
                  key={route.id}
                  onClick={() => onSelectRoute(route.id)}
                  className={`text-left p-3 rounded-xl border transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-brand-500/15 border-brand-500/50 shadow-md ring-1 ring-brand-500/30'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                      {route.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {routeRisk?.tags?.isSafest && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Safest
                        </span>
                      )}
                      {routeRisk?.tags?.isFastest && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Fastest
                        </span>
                      )}
                      {fuelPlans?.[route.id]?.isMostFuelEfficient && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Fuel Saver
                        </span>
                      )}
                      {isSelected && (
                        <span className="flex items-center gap-0.5 text-[10px] text-brand-400 font-bold uppercase ml-1">
                          <CheckCircle2 size={11} />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 mt-1.5 text-xs text-white/70">
                    <span className="font-medium">{(route.distanceMeters / 1000).toFixed(0)} km</span>
                    <span>&bull;</span>
                    <span>{formatDuration(route.durationSeconds)}</span>
                    {fuelPlans?.[route.id]?.calculation?.mileageKmPerLitre ? (
                      <>
                        <span>&bull;</span>
                        <span className="text-amber-300 font-medium">
                          {fuelPlans[route.id]!.calculation.fuelRequiredLitres} L
                        </span>
                      </>
                    ) : null}
                  </div>

                  {routeRisk && riskBadge && (
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/5 text-[11px]">
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
                        <span className="text-white/50 text-[10px]">
                          {routeRisk.overallLevel}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Prominent Safety Score Badge & Overall Risk Banner */}
      <SafetyScoreBadge analysis={activeRisk} isLoading={isRiskLoading} />

      {/* Consolidated Weather Alerts */}
      {activeRisk && activeRisk.alerts.length > 0 && (
        <WeatherAlertsBanner alerts={activeRisk.alerts} />
      )}

      {/* Main Active Route Summary Card */}
      <div className="glass rounded-2xl p-5 border border-white/15 space-y-4">
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <span className="text-[11px] font-bold text-brand-400 uppercase tracking-wider">
              {routes.length > 1 && routes[0]?.id === activeRoute.id ? 'Recommended Route' : 'Selected Route'}
            </span>
            <h3 className="text-xl font-bold text-white mt-0.5">{activeRoute.name}</h3>
            {activeRoute.summary && (
              <p className="text-xs text-white/50 mt-0.5">{activeRoute.summary}</p>
            )}
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-brand-400">
              {(activeRoute.distanceMeters / 1000).toFixed(0)}
              <span className="text-sm font-normal text-white/60 ml-1">km</span>
            </span>
            <p className="text-[11px] text-white/50">{formatDate(activeRoute.departureTime)}</p>
          </div>

          <div className="text-right">
            <p className="text-white/40 uppercase tracking-wider text-[10px]">Estimated Arrival</p>
            <p className="text-base font-bold text-emerald-400 mt-0.5">
              {formatTime(activeRoute.arrivalTime)}
            </p>
            <p className="text-[11px] text-white/50">{formatDate(activeRoute.arrivalTime)}</p>
          </div>
        </div>

        {/* Stats Grid: Stops, Checkpoints, and Fuel */}
        <div className={`grid gap-3 text-xs ${activeFuel && activeFuel.calculation.mileageKmPerLitre > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-400 font-semibold">
              {activeRoute.stops.length} {activeRoute.stops.length === 1 ? 'User Stop' : 'User Stops'}
            </p>
            <p className="text-white/40 text-[11px] mt-0.5">
              {activeRoute.stops.length > 0 ? 'Custom planned halts' : 'Direct ride'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-cyan-400 font-semibold">
              {activeRoute.checkpoints.length} Smart Checkpoints
            </p>
            <p className="text-white/40 text-[11px] mt-0.5">Every 15–30 min travel time</p>
          </div>

          {activeFuel && activeFuel.calculation.mileageKmPerLitre > 0 && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-emerald-400 font-semibold flex items-center gap-1">
                <Fuel size={13} />
                <span>{activeFuel.calculation.fuelRequiredLitres} L Fuel</span>
              </p>
              <p className="text-white/40 text-[11px] mt-0.5">
                {activeFuel.calculation.estimatedCost != null ? `Est. ₹${activeFuel.calculation.estimatedCost}` : `${activeFuel.calculation.mileageKmPerLitre} km/L`}
              </p>
            </div>
          )}
        </div>

        {/* Rider Recommendations */}
        {activeRisk && activeRisk.recommendations.length > 0 && (
          <RiderRecommendationsCard recommendations={activeRisk.recommendations} />
        )}

        {/* Risk Factor Deductions */}
        {activeRisk && activeRisk.checkpoints.length > 0 && (
          <RiskFactorBreakdown checkpoints={activeRisk.checkpoints} />
        )}

        {/* View Switcher: Weather Timeline vs Itinerary */}
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('weather')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'weather'
                ? 'bg-brand-500 text-black shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <CloudSun size={14} />
            Route Weather Timeline
          </button>
          <button
            onClick={() => setActiveTab('itinerary')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'itinerary'
                ? 'bg-brand-500 text-black shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <ListOrdered size={14} />
            Itinerary & Stops
          </button>
        </div>

        {/* Tab 1: Route Weather Timeline with Checkpoint Risk Badges */}
        {activeTab === 'weather' && (
          <RouteWeatherTimeline
            timeline={activeTimeline}
            isLoading={isWeatherLoading}
            checkpointRisks={activeRisk?.checkpoints}
            checkpointFuelEstimates={activeFuel?.checkpointEstimates}
          />
        )}

        {/* Tab 2: Itinerary Timeline */}
        {activeTab === 'itinerary' && (
          <div className="pt-2 border-t border-white/10 space-y-3 max-h-72 overflow-y-auto pr-1">
            {/* Start point */}
            <div className="flex items-start gap-3 text-xs">
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-black font-bold text-[10px] shrink-0 mt-0.5">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">Start &bull; {activeRoute.legs[0]?.startLocation.name}</p>
                <p className="text-[11px] text-emerald-400 font-mono">
                  {formatTime(activeRoute.departureTime)}
                </p>
              </div>
            </div>

            {/* Checkpoints & User Stops in order of distance */}
            {activeRoute.checkpoints.map((cp) => (
              <div key={cp.id} className="flex items-start gap-3 text-xs pl-0.5">
                <div className="w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center text-black font-bold text-[9px] shrink-0 mt-0.5 ml-0.5">
                  {cp.sequence}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-white truncate">{cp.name}</p>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/60">
                      {cp.locationType}
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-300 font-mono">
                    {formatTime(cp.estimatedArrivalTime)} &bull; {(cp.distanceFromStartMeters / 1000).toFixed(0)} km &bull; ~{Math.round(cp.elapsedTravelTimeSeconds / 60)}m
                  </p>
                </div>
              </div>
            ))}

            {/* Destination point */}
            <div className="flex items-start gap-3 text-xs">
              <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold text-[10px] shrink-0 mt-0.5">
                B
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  Destination &bull; {activeRoute.legs[activeRoute.legs.length - 1]?.endLocation.name}
                </p>
                <p className="text-[11px] text-rose-400 font-mono">
                  {formatTime(activeRoute.arrivalTime)} &bull; {(activeRoute.distanceMeters / 1000).toFixed(0)} km total
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
