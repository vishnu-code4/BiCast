// ============================================================
// BiCAST Safety Score Badge & Overall Risk Indicator
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
      <div className="glass rounded-2xl p-4 border border-white/10 animate-pulse flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-white/10 rounded w-24"></div>
          <div className="h-6 bg-white/10 rounded w-32"></div>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-white/10"></div>
      </div>
    );
  }

  if (!analysis) return null;

  const badge = getRiskLevelBadge(analysis.overallLevel);
  const isSevere = analysis.severeSegments.length > 0;

  return (
    <div className={`glass rounded-2xl p-4 sm:p-5 border ${badge.borderClass} ${badge.bgClass} relative overflow-hidden transition-all shadow-lg`}>
      {/* Background glow accent */}
      <div
        className={`absolute -right-12 -top-12 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none ${
          analysis.overallLevel === 'GREEN'
            ? 'bg-emerald-500'
            : analysis.overallLevel === 'YELLOW'
            ? 'bg-amber-500'
            : analysis.overallLevel === 'ORANGE'
            ? 'bg-orange-500'
            : 'bg-rose-500'
        }`}
      />

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

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {analysis.overallScore}
            </span>
            <span className="text-white/40 text-sm font-semibold">/ 100</span>
            <span
              className={`ml-2 px-2.5 py-0.5 rounded-lg text-xs font-extrabold uppercase tracking-wide border ${badge.borderClass} ${badge.textClass} bg-black/40`}
            >
              {badge.symbol} {badge.label}
            </span>
          </div>

          {analysis.primaryConcerns.length > 0 && (
            <div className="mt-2 text-xs text-white/80 flex flex-wrap items-center gap-1.5">
              <span className="text-white/40 text-[11px]">Primary Concerns:</span>
              {analysis.primaryConcerns.slice(0, 2).map((c, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-white/10 text-white/90 text-[11px] font-medium"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Big visual score icon ring */}
        <div
          className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 shrink-0 ${badge.borderClass} bg-black/40 shadow-inner`}
        >
          {analysis.overallLevel === 'GREEN' ? (
            <ShieldCheck size={32} className="text-emerald-400" />
          ) : analysis.overallLevel === 'YELLOW' ? (
            <ShieldAlert size={32} className="text-amber-400" />
          ) : analysis.overallLevel === 'ORANGE' ? (
            <AlertTriangle size={32} className="text-orange-400" />
          ) : (
            <Flame size={32} className="text-rose-400 animate-bounce" />
          )}
        </div>
      </div>

      {/* Severe weather segment alert banner if short hazardous zone detected */}
      {isSevere && (
        <div className="mt-3 pt-3 border-t border-white/10 flex items-start gap-2 text-xs text-rose-300">
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-400" />
          <span className="font-semibold">
            ⚠ Severe Weather Segment Detected:{' '}
            <span className="font-normal text-white/90">
              {analysis.severeSegments[0]?.severeEventDescription || 'Intense weather pocket along route segment.'}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
