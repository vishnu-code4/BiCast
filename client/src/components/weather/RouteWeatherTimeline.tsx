// ============================================================
// BiCAST Route Weather Timeline Component
// Displays time-accurate weather along the route for every
// start, stop, checkpoint, and destination at expected arrival time
// Supports Dual Mode: Responsive Grid Cards View & Timeline List View
// ============================================================
import { useState } from 'react';
import {
  CloudRain,
  Wind,
  Droplets,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return 'grid';
    }
    return 'list';
  });
  const [expandedPointId, setExpandedPointId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bento-tile animate-pulse space-y-4">
        <div className="h-5 bg-white/10 rounded w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-white/5 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!timeline) return null;

  // Unavailable state (e.g. date too far in advance)
  if (timeline.status === 'unavailable') {
    return (
      <div className="bento-tile border-amber-500/30 bg-amber-500/5 space-y-3">
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
    <div className="bento-tile space-y-5">
      {/* Header & Factual Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h4 className="text-base font-bold text-white tracking-tight">
              Route Weather Forecast
            </h4>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${exposureBadge.bgClass} ${exposureBadge.textClass} ${exposureBadge.borderClass}`}
            >
              {exposureBadge.label}
            </span>
          </div>
          <p className="text-xs text-white/40 mt-1 flex items-center gap-1.5">
            <Clock size={12} />
            ETA-matched forecast checkpoints ({timeline.points.length} nodes)
          </p>
        </div>

        {/* View Switcher & Quick Metrics */}
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2.5 bento-subtile px-3 py-1.5 text-xs">
            <div>
              <span className="text-[10px] text-white/40 block">Temp</span>
              <span className="font-bold text-white">
                {timeline.summary.minTemperature}°–{timeline.summary.maxTemperature}°C
              </span>
            </div>
            <div className="w-px h-5 bg-white/10" />
            <div>
              <span className="text-[10px] text-white/40 block">Max Rain</span>
              <span
                className={`font-bold ${
                  timeline.summary.maxPrecipitationProbability > 40
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                }`}
              >
                {timeline.summary.maxPrecipitationProbability}%
              </span>
            </div>
          </div>

          {/* Grid vs Timeline View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'grid'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
              title="Cards Grid View"
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
              title="Timeline List View"
            >
              <List size={13} />
              <span className="hidden sm:inline">Timeline</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          VIEW 1: Responsive Bento Grid Cards View
          ============================================================ */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {timeline.points.map((point: RouteWeatherPoint) => {
            const isExpanded = expandedPointId === point.pointId;
            const emoji = getWeatherEmoji(point.weatherCode, point.thunderstorm);
            const hasRain = point.precipitationProbability >= 30 || point.rain > 0;
            const cpRisk = checkpointRisks?.find((r) => r.checkpointId === point.pointId);
            const rb = cpRisk ? getRiskLevelBadge(cpRisk.level) : null;
            const cpFuel = checkpointFuelEstimates?.find((f) => f.checkpointId === point.pointId);

            return (
              <div
                key={point.pointId}
                className={`bento-subtile p-3.5 rounded-2xl flex flex-col justify-between space-y-3 transition-all ${
                  isExpanded ? 'border-brand-500/40 ring-1 ring-brand-500/20 shadow-bento' : ''
                }`}
              >
                {/* Header: Node badge + Location name + ETA */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          point.pointType === 'START'
                            ? 'bg-emerald-500 text-black'
                            : point.pointType === 'DESTINATION'
                            ? 'bg-rose-500 text-white'
                            : point.pointType === 'STOP'
                            ? 'bg-amber-500 text-black'
                            : 'bg-cyan-400 text-black'
                        }`}
                      >
                        {point.sequence || (point.pointType === 'START' ? 'A' : 'B')}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate" title={point.locationName}>
                          {point.locationName}
                        </p>
                        <span className="text-[10px] text-white/40 uppercase font-semibold">
                          {point.pointType}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {formatTime(point.estimatedArrivalTime)}
                      </span>
                      <p className="text-[10px] text-white/40">ETA</p>
                    </div>
                  </div>

                  {/* Weather Telemetry Row */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-white/10 text-center">
                    {/* Temperature */}
                    <div className="p-2 rounded-xl bg-black/20 flex flex-col items-center justify-center">
                      <span className="text-lg leading-none">{emoji}</span>
                      <span className="text-xs font-bold text-white mt-1">
                        {Math.round(point.temperature)}°C
                      </span>
                    </div>

                    {/* Rain probability */}
                    <div className="p-2 rounded-xl bg-black/20 flex flex-col items-center justify-center">
                      <CloudRain
                        size={15}
                        className={hasRain ? 'text-rose-400' : 'text-white/40'}
                      />
                      <span
                        className={`text-xs font-bold mt-1 ${
                          hasRain ? 'text-rose-300' : 'text-white/70'
                        }`}
                      >
                        {point.precipitationProbability}%
                      </span>
                    </div>

                    {/* Wind */}
                    <div className="p-2 rounded-xl bg-black/20 flex flex-col items-center justify-center">
                      <Wind size={15} className="text-brand-400" />
                      <span className="text-xs font-bold text-white mt-1">
                        {Math.round(point.windSpeed)} <span className="text-[9px] font-normal text-white/50">km/h</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer: Safety badge & Toggle Details */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  {cpRisk && rb ? (
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${rb.borderClass} ${rb.bgClass} ${rb.textClass} flex items-center gap-1`}
                    >
                      <span>{rb.symbol}</span>
                      <span>Score: {cpRisk.score}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-white/40 truncate">
                      {point.weatherCondition}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleExpand(point.pointId)}
                    className="text-[11px] font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 ml-auto"
                  >
                    <span>{isExpanded ? 'Less' : 'Details'}</span>
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {/* Expanded Drawer in Card */}
                {isExpanded && (
                  <div className="pt-2 border-t border-white/10 space-y-2 text-[11px] animate-fade-in">
                    {/* 4-Metric Pill Grid */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="p-2 rounded-xl bg-black/30">
                        <span className="text-white/40 block text-[9px] uppercase font-semibold">Condition</span>
                        <span className="font-semibold text-white truncate block">
                          {point.weatherCondition}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/30">
                        <span className="text-white/40 block text-[9px] uppercase font-semibold">Feels Like</span>
                        <span className="font-semibold text-white">
                          {Math.round(point.apparentTemperature)}°C
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/30">
                        <span className="text-white/40 block text-[9px] uppercase font-semibold">Wind / Gusts</span>
                        <span className="font-semibold text-white">
                          {Math.round(point.windSpeed)} / {Math.round(point.windGusts)} km/h
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/30">
                        <span className="text-white/40 block text-[9px] uppercase font-semibold">Humidity / Vis</span>
                        <span className="font-semibold text-cyan-300">
                          {point.humidity}% &bull; {point.visibility} km
                        </span>
                      </div>
                    </div>

                    {/* Fuel remaining pill */}
                    {cpFuel && (
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-[10px]">
                        <span className="text-white/60">Consumed: {cpFuel.estimatedFuelConsumedLitres} L</span>
                        {cpFuel.estimatedRemainingFuelLitres != null && (
                          <span className="text-amber-300 font-semibold">
                            Remaining: ~{cpFuel.estimatedRemainingFuelLitres} L
                          </span>
                        )}
                      </div>
                    )}

                    {/* Penalties list if any */}
                    {cpRisk && cpRisk.factors.length > 0 && (
                      <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                        <span className="text-[10px] font-bold text-rose-300 uppercase block">Active Weather Penalties</span>
                        {cpRisk.factors.map((f, fIdx) => (
                          <div key={fIdx} className="flex items-center justify-between text-[10px] text-white/80">
                            <span className="truncate">&bull; {f.explanation}</span>
                            <span className="font-bold text-rose-400 shrink-0 ml-1">-{f.penalty} pts</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          VIEW 2: Vertical Timeline List View
          ============================================================ */}
      {viewMode === 'list' && (
        <div className="space-y-2 relative before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-[2px] before:bg-white/10">
          {timeline.points.map((point: RouteWeatherPoint) => {
            const isExpanded = expandedPointId === point.pointId;
            const emoji = getWeatherEmoji(point.weatherCode, point.thunderstorm);
            const hasRain = point.precipitationProbability >= 30 || point.rain > 0;
            const cpRisk = checkpointRisks?.find((r) => r.checkpointId === point.pointId);
            const rb = cpRisk ? getRiskLevelBadge(cpRisk.level) : null;
            const cpFuel = checkpointFuelEstimates?.find((f) => f.checkpointId === point.pointId);

            return (
              <div
                key={point.pointId}
                className={`relative pl-8 transition-all group ${
                  isExpanded ? 'bento-subtile rounded-2xl p-3.5 pl-8' : ''
                }`}
              >
                {/* Timeline node icon */}
                <div
                  className={`absolute left-3 top-2.5 w-3.5 h-3.5 rounded-full border-2 border-surface-900 transition-all ${
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
                    {cpRisk && rb && (
                      <span
                        className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${rb.borderClass} ${rb.bgClass} ${rb.textClass}`}
                        title={`Safety Score: ${cpRisk.score}/100`}
                      >
                        <span>{rb.symbol}</span>
                        <span>{cpRisk.score}</span>
                      </span>
                    )}

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

                {/* Expanded Weather Details Drawer in List View */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-white/10 space-y-2 text-[11px] animate-fade-in">
                    {/* 4-Metric Pill Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                        <span className="text-white/40 block text-[10px] uppercase font-semibold">Condition</span>
                        <span className="font-semibold text-white truncate block mt-0.5">
                          {point.weatherCondition}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                        <span className="text-white/40 block text-[10px] uppercase font-semibold">Feels Like</span>
                        <span className="font-semibold text-white mt-0.5 block">
                          {Math.round(point.apparentTemperature)}°C
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                        <span className="text-white/40 block text-[10px] uppercase font-semibold">Wind / Gusts</span>
                        <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
                          <Wind size={12} className="text-brand-400" />
                          {Math.round(point.windSpeed)} / {Math.round(point.windGusts)} km/h
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                        <span className="text-white/40 block text-[10px] uppercase font-semibold">Humidity / Visibility</span>
                        <span className="font-semibold text-cyan-300 flex items-center gap-1 mt-0.5">
                          <Droplets size={12} />
                          {point.humidity}% &bull; {point.visibility} km
                        </span>
                      </div>
                    </div>

                    {/* Checkpoint Safety Breakdown */}
                    {cpRisk && rb && (
                      <div className={`p-2.5 rounded-xl border ${rb.borderClass} ${rb.bgClass}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                            <span>{rb.symbol}</span>
                            <span>Checkpoint Safety: {cpRisk.score}/100</span>
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
                          <div className="mt-1.5 space-y-1 pt-1.5 border-t border-white/10">
                            {cpRisk.factors.map((f, fIdx) => (
                              <div key={fIdx} className="flex items-center justify-between text-[10px] text-white/80">
                                <span>&bull; {f.explanation}</span>
                                <span className="font-bold text-rose-400">-{f.penalty} pts</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fuel estimation at this checkpoint */}
                    {cpFuel && (
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="text-white/60 flex items-center gap-1.5">
                          <span>⛽</span>
                          <span>Distance: <strong className="text-white">{cpFuel.distanceFromStartKm} km</strong></span>
                        </span>
                        <div className="flex items-center gap-3 text-right flex-wrap">
                          <span className="text-white/60">Consumed: <strong className="text-white">{cpFuel.estimatedFuelConsumedLitres} L</strong></span>
                          {cpFuel.estimatedRemainingFuelLitres != null && (
                            <span className="text-amber-300 font-semibold">Remaining: ~{cpFuel.estimatedRemainingFuelLitres} L</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-white/40 flex items-center justify-between pt-1">
                      <span>&bull; Matched forecast hour: {formatTime(point.forecastTime)}</span>
                      <span>Rain volume: {point.precipitation} mm</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
