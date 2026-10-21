// ============================================================
// BiCAST Risk Factor Breakdown
// Transparent, explainable deduction drawer with Bento styling
// ============================================================
import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Layers,
  CloudRain,
  Wind,
  Eye,
  Flame,
  CloudLightning,
  ShieldCheck,
} from 'lucide-react';
import { CheckpointRisk, RiskFactor } from '@/types/risk';

interface RiskFactorBreakdownProps {
  checkpoints: CheckpointRisk[];
}

export default function RiskFactorBreakdown({ checkpoints }: RiskFactorBreakdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Collect all unique factors with penalties across route
  const allFactors: { factor: RiskFactor; location: string }[] = [];
  for (const cp of checkpoints) {
    for (const f of cp.factors) {
      if (f.penalty > 0) {
        allFactors.push({ factor: f, location: cp.locationName });
      }
    }
  }

  if (allFactors.length === 0) {
    return (
      <div className="bento-subtile border-emerald-500/25 bg-emerald-500/5 p-3 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-emerald-400" />
          <span>Zero weather deduction factors. Route conditions nominal.</span>
        </span>
      </div>
    );
  }

  const getFactorIcon = (type: string) => {
    switch (type) {
      case 'THUNDERSTORM':
        return <CloudLightning size={15} className="text-rose-400" />;
      case 'RAIN':
        return <CloudRain size={15} className="text-cyan-400" />;
      case 'WIND':
      case 'GUSTS':
        return <Wind size={15} className="text-teal-400" />;
      case 'VISIBILITY':
        return <Eye size={15} className="text-amber-400" />;
      case 'HEAT':
        return <Flame size={15} className="text-orange-400" />;
      default:
        return <Layers size={15} className="text-white/60" />;
    }
  };

  return (
    <div className="bento-subtile overflow-hidden text-xs transition-all">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-brand-400" />
          <span className="font-semibold text-white">Risk Penalty Breakdown</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {allFactors.length} {allFactors.length === 1 ? 'penalty' : 'penalties'}
          </span>
        </div>
        <span className="text-white/40 flex items-center gap-1 font-semibold text-[11px]">
          <span>{isOpen ? 'Hide' : 'Inspect'}</span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-white/10 space-y-2 bg-black/30 animate-fade-in max-h-64 overflow-y-auto pr-1">
          {allFactors.map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-start justify-between gap-3 hover:border-white/15 transition-all"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="mt-0.5 shrink-0">{getFactorIcon(item.factor.type)}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-xs">{item.factor.type}</span>
                    <span className="text-[10px] text-white/50 truncate">&bull; {item.location}</span>
                  </div>
                  <p className="text-[11px] text-white/80 mt-0.5 leading-relaxed">{item.factor.explanation}</p>
                  <p className="text-[10px] text-white/40 mt-1">
                    Telemetry: <span className="text-white/90 font-medium">{item.factor.value}</span> (Threshold: {item.factor.threshold})
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-xs font-black border border-rose-500/30">
                  -{item.factor.penalty}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
