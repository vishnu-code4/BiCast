// ============================================================
// BiCAST Route Weather Timeline Component
// Displays time-accurate weather along the route for every
// start, stop, checkpoint, and destination at expected arrival time
// ============================================================
import React from 'react';
import {
  CloudRain,
  Wind,
  Droplets,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { RouteWeatherTimeline as IRouteWeatherTimeline, RouteWeatherPoint } from '@/types/weather';
import { CheckpointRisk } from '@/types/risk';
import { FuelCheckpointEstimate } from '@/types/fuel';
import { getWeatherEmoji, getRainExposureBadge } from '@/services/weatherService';
import { getRiskLevelBadge } from '@/services/riskService';

interface RouteWeatherTimelineProps {
  timeline: IRouteWeatherTimeline | null;
  isLoading?: boolean;
  checkpointRisks?: CheckpointRisk[];
  checkpointFuelEstimates?: FuelCheckpointEstimate[];
}

export default function RouteWeatherTimeline({
  timeline,
  isLoading,
  checkpointRisks,
  checkpointFuelEstimates,
}: RouteWeatherTimelineProps) {
  const [expandedPointId, setExpandedPointId] = React.useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-6 border border-white/15 animate-pulse space-y-4">
        <div className="h-5 bg-white/10 rounded w-1/3"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-white/5 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!timeline) return null;

  // Unavailable state (e.g. date too far in advance)
  if (timeline.status === 'unavailable') {
    return (
      <div className="glass rounded-2xl p-5 border border-amber-500/30 bg-amber-500/5 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
          <AlertTriangle size={18} />
          <span>Forecast Unavailable</span>
        </div>
        <p className="text-xs text-white/70 leading-relaxed">
          {timeline.statusMessage ||
            'Weather forecast is not available yet for this journey date (available up to 16 days ahead). Check again closer to departure.'}
        </p>
      </div>
    );
  }

  const formatTime = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const exposureBadge = getRainExposureBadge(timeline.summary.rainExposure);

  const toggleExpand = (id: string) => {
    setExpandedPointId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="glass rounded-2xl p-5 border border-white/15 space-y-4">
      {/* Header & Factual Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white tracking-wide uppercase">
              Route Weather Timeline
            </h4>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${exposureBadge.bgClass} ${exposureBadge.textClass} ${exposureBadge.borderClass}`}
            >
              {exposureBadge.label}
            </span>
          </div>
          <p className="text-[11px] text-white/40 mt-0.5 flex items-center gap-1">
            <Clock size={11} />
            Forecast matching ETA at each checkpoint ({timeline.points.length} points)
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="text-right">
            <span className="text-white/40 block text-[10px]">Temp Range</span>
            <span className="font-semibold text-white">
              {timeline.summary.minTemperature}° – {timeline.summary.maxTemperature}°C
            </span>
          </div>
          <div className="text-right pl-3 border-l border-white/10">
            <span className="text-white/40 block text-[10px]">Max Rain</span>
            <span className={`font-semibold ${timeline.summary.maxPrecipitationProbability > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {timeline.summary.maxPrecipitationProbability}%
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Items */}
      <div className="space-y-2 relative before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-[2px] before:bg-white/10">
        {timeline.points.map((point: RouteWeatherPoint) => {
          const isExpanded = expandedPointId === point.pointId;
          const emoji = getWeatherEmoji(point.weatherCode, point.thunderstorm);
          const hasRain = point.precipitationProbability >= 30 || point.rain > 0;

          return (
            <div
              key={point.pointId}
              className={`relative pl-8 transition-all group ${
                isExpanded ? 'bg-white/5 rounded-xl p-3 pl-8' : ''
              }`}
            >
              {/* Timeline marker node */}
              <div
                className={`absolute left-3 top-2 w-3.5 h-3.5 rounded-full border-2 border-surface-900 transition-all ${
                  point.pointType === 'START'
                    ? 'bg-emerald-500'
                    : point.pointType === 'DESTINATION'
                    ? 'bg-rose-500'
                    : point.pointType === 'STOP'
                    ? 'bg-amber-500'
                    : 'bg-cyan-400'
                }`}
              />

              <div
                onClick={() => toggleExpand(point.pointId)}
                className="cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors flex items-center justify-between gap-3"
              >
                {/* Left: Time & Location */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-tight">
                      {formatTime(point.estimatedArrivalTime)}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                        point.pointType === 'START'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : point.pointType === 'DESTINATION'
                          ? 'bg-rose-500/20 text-rose-400'
                          : point.pointType === 'STOP'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-cyan-500/20 text-cyan-400'
                      }`}
                    >
                      {point.pointType}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 font-medium truncate mt-0.5">
                    {point.locationName}
                  </p>
                </div>

                {/* Right: Weather Chips & Risk Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  {(() => {
                    const cpRisk = checkpointRisks?.find((r) => r.checkpointId === point.pointId);
                    if (!cpRisk) return null;
                    const rb = getRiskLevelBadge(cpRisk.level);
                    return (
                      <span
                        className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${rb.borderClass} ${rb.bgClass} ${rb.textClass}`}
                        title={`Safety Score: ${cpRisk.score}/100`}
                      >
                        <span>{rb.symbol}</span>
                        <span>{cpRisk.score}</span>
                      </span>
                    );
                  })()}

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-base leading-none">{emoji}</span>
                    <span className="text-xs font-bold text-white">
                      {Math.round(point.temperature)}°C
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                      hasRain
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        : 'bg-white/5 text-white/60'
                    }`}
                  >
                    <CloudRain size={13} className={hasRain ? 'text-rose-400' : 'text-white/40'} />
                    <span>{point.precipitationProbability}%</span>
                  </div>

                  <button className="text-white/30 hover:text-white transition-colors p-0.5">
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>
              </div>

              {/* Expanded Weather Details Drawer */}
              {isExpanded && (
                <div className="mt-2 pt-2 border-t border-white/10 space-y-2 text-[11px] animate-fade-in">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 rounded-lg bg-black/30">
                      <span className="text-white/40 block text-[10px]">Condition</span>
                      <span className="font-semibold text-white truncate block">
                        {point.weatherCondition}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-black/30">
                      <span className="text-white/40 block text-[10px]">Feels Like</span>
                      <span className="font-semibold text-white">
                        {Math.round(point.apparentTemperature)}°C
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-black/30">
                      <span className="text-white/40 block text-[10px]">Wind / Gusts</span>
                      <span className="font-semibold text-white flex items-center gap-1">
                        <Wind size={11} className="text-brand-400" />
                        {Math.round(point.windSpeed)} / {Math.round(point.windGusts)} km/h
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-black/30">
                      <span className="text-white/40 block text-[10px]">Humidity / Vis</span>
                      <span className="font-semibold text-white flex items-center gap-1">
                        <Droplets size={11} className="text-cyan-400" />
                        {point.humidity}% &bull; {point.visibility} km
                      </span>
                    </div>
                  </div>

                  {/* Risk breakdown for this specific checkpoint */}
                  {(() => {
                    const cpRisk = checkpointRisks?.find((r) => r.checkpointId === point.pointId);
                    if (!cpRisk) return null;
                    const rb = getRiskLevelBadge(cpRisk.level);
                    return (
                      <div className={`p-2.5 rounded-lg border ${rb.borderClass} ${rb.bgClass}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                            <span>{rb.symbol}</span>
                            <span>Checkpoint Safety Score: {cpRisk.score}/100</span>
                            <span className={`text-[10px] uppercase font-extrabold ${rb.textClass}`}>
                              ({cpRisk.level})
                            </span>
                          </span>
                          {cpRisk.primaryConcern && (
                            <span className="text-[10px] text-white/70 italic truncate max-w-[200px]">
                              {cpRisk.primaryConcern}
                            </span>
                          )}
                        </div>

                        {cpRisk.factors.length > 0 && (
                          <div className="mt-1.5 space-y-1 pt-1 border-t border-white/10">
                            {cpRisk.factors.map((f, fIdx) => (
                              <div key={fIdx} className="flex items-center justify-between text-[10px] text-white/80">
                                <span>&bull; {f.explanation}</span>
                                <span className="font-bold text-rose-400">-{f.penalty} pts</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Fuel estimation at this checkpoint */}
                  {(() => {
                    const cpFuel = checkpointFuelEstimates?.find((f) => f.checkpointId === point.pointId);
                    if (!cpFuel) return null;
                    return (
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between text-[11px]">
                        <span className="text-white/60 flex items-center gap-1.5">
                          <span>⛽</span>
                          <span>Distance: <strong className="text-white">{cpFuel.distanceFromStartKm} km</strong></span>
                        </span>
                        <div className="flex items-center gap-3 text-right">
                          <span className="text-white/60">Consumed: <strong className="text-white">{cpFuel.estimatedFuelConsumedLitres} L</strong></span>
                          {cpFuel.estimatedRemainingFuelLitres != null && (
                            <span className="text-amber-300 font-semibold">Remaining: ~{cpFuel.estimatedRemainingFuelLitres} L</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="col-span-2 sm:col-span-4 text-[10px] text-white/40 flex items-center justify-between pt-1">
                    <span>
                      &bull; Matched forecast hour: {formatTime(point.forecastTime)}
                    </span>
                    <span>
                      Rain volume: {point.precipitation} mm
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
