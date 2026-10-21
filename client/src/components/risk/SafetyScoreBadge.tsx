// ============================================================
// BiCAST Safety Score Badge & Overall Risk Indicator
// Upgraded with Dynamic SVG Circular Progress Gauge & Bento Tile
// ============================================================
import { ShieldCheck, ShieldAlert, AlertTriangle, Flame } from 'lucide-react';
import { RouteRiskAnalysis } from '@/types/risk';
import { getRiskLevelBadge } from '@/services/riskService';

interface SafetyScoreBadgeProps {
  analysis: RouteRiskAnalysis | null;
  isLoading?: boolean;
}

export default function SafetyScoreBadge({ analysis, isLoading }: SafetyScoreBadgeProps) {
  if (isLoading) {
    return (
      <div className="bento-tile animate-pulse flex items-center justify-between h-full">
        <div className="space-y-2">
          <div className="h-4 bg-white/10 rounded w-24"></div>
          <div className="h-7 bg-white/10 rounded w-36"></div>
          <div className="h-4 bg-white/10 rounded w-28"></div>
        </div>
        <div className="w-16 h-16 rounded-full bg-white/10"></div>
      </div>
    );
  }

  if (!analysis) return null;

  const badge = getRiskLevelBadge(analysis.overallLevel);
  const isSevere = analysis.severeSegments.length > 0;

  // SVG Circular Gauge calculations
  const radius = 30;
  const circumference = 2 * Math.PI * radius; // ~188.5
  const scoreClamped = Math.min(100, Math.max(0, analysis.overallScore));
  const strokeDashoffset = circumference - (scoreClamped / 100) * circumference;

  const getRingColor = (level: string) => {
    switch (level) {
      case 'GREEN':
        return '#10b981'; // emerald-500
      case 'YELLOW':
        return '#f59e0b'; // amber-500
      case 'ORANGE':
        return '#f97316'; // orange-500 / brand
      case 'RED':
      default:
        return '#f43f5e'; // rose-500
    }
  };

  const ringColor = getRingColor(analysis.overallLevel);

  return (
    <div
      className={`bento-tile h-full flex flex-col justify-between border ${badge.borderClass} ${badge.bgClass} relative overflow-hidden transition-all shadow-bento`}
    >
      {/* Background glow accent */}
      <div
        className={`absolute -right-10 -top-10 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none ${
          analysis.overallLevel === 'GREEN'
            ? 'bg-emerald-500'
            : analysis.overallLevel === 'YELLOW'
            ? 'bg-amber-500'
            : analysis.overallLevel === 'ORANGE'
            ? 'bg-orange-500'
            : 'bg-rose-500'
        }`}
      />

      {/* Top Details & SVG Circular Progress Gauge */}
      <div className="flex items-center justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">
              BiCAST Safety Score
            </span>
            {analysis.tags?.isSafest && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Safest Option
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {analysis.overallScore}
            </span>
            <span className="text-white/40 text-sm font-semibold">/ 100</span>
            <span
              className={`ml-1.5 px-2.5 py-0.5 rounded-lg text-xs font-extrabold uppercase tracking-wide border ${badge.borderClass} ${badge.textClass} bg-black/40`}
            >
              {badge.symbol} {badge.label}
            </span>
          </div>

          {analysis.primaryConcerns.length > 0 && (
            <div className="mt-2 text-xs text-white/80 flex flex-wrap items-center gap-1.5">
              <span className="text-white/40 text-[10px] uppercase font-semibold">Concerns:</span>
              {analysis.primaryConcerns.slice(0, 2).map((c, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-white/10 text-white/90 text-[10px] font-medium"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic SVG Circular Progress Ring */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 72 72">
            {/* Background Track */}
            <circle
              cx="36"
              cy="36"
              r={radius}
              className="text-white/10"
              strokeWidth="5"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Progress Stroke */}
            <circle
              cx="36"
              cy="36"
              r={radius}
              stroke={ringColor}
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Centered Status Icon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {analysis.overallLevel === 'GREEN' ? (
              <ShieldCheck size={24} className="text-emerald-400" />
            ) : analysis.overallLevel === 'YELLOW' ? (
              <ShieldAlert size={24} className="text-amber-400" />
            ) : analysis.overallLevel === 'ORANGE' ? (
              <AlertTriangle size={24} className="text-orange-400" />
            ) : (
              <Flame size={24} className="text-rose-400 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Severe weather segment alert banner if short hazardous zone detected */}
      {isSevere && (
        <div className="mt-3 pt-3 border-t border-white/10 flex items-start gap-2 text-xs text-rose-300 relative z-10">
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-400" />
          <span className="font-semibold">
            ⚠ Severe Zone Detected:{' '}
            <span className="font-normal text-white/90">
              {analysis.severeSegments[0]?.severeEventDescription ||
                'Intense weather pocket along route segment.'}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
