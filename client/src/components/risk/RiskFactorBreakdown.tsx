// ============================================================
// BiCAST Risk Factor Breakdown
// Transparent, explainable deduction drawer
// ============================================================
import React from 'react';
import { ChevronDown, ChevronUp, Layers, CloudRain, Wind, Eye, Flame, CloudLightning } from 'lucide-react';
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
      <div className="glass rounded-xl p-3 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Layers size={13} />
          Zero weather penalty factors detected. Clean route conditions.
        </span>
      </div>
    );
  }

  const getFactorIcon = (type: string) => {
    switch (type) {
      case 'THUNDERSTORM':
        return <CloudLightning size={14} className="text-rose-400" />;
      case 'RAIN':
        return <CloudRain size={14} className="text-cyan-400" />;
      case 'WIND':
      case 'GUSTS':
        return <Wind size={14} className="text-teal-400" />;
      case 'VISIBILITY':
        return <Eye size={14} className="text-amber-400" />;
      case 'HEAT':
        return <Flame size={14} className="text-orange-400" />;
      default:
        return <Layers size={14} className="text-white/60" />;
    }
  };

  return (
    <div className="glass rounded-xl border border-white/10 overflow-hidden text-xs">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-brand-400" />
          <span className="font-semibold text-white">Transparent Factor Breakdown</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white/10 text-white/70">
            {allFactors.length} active penalties
          </span>
        </div>
        <span className="text-white/40 flex items-center gap-1">
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-white/10 space-y-2 bg-black/20 animate-fade-in">
          {allFactors.map((item, idx) => (
            <div
              key={idx}
              className="p-2 rounded-lg bg-white/5 border border-white/5 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2 min-w-0">
                <span className="mt-0.5">{getFactorIcon(item.factor.type)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{item.factor.type}</span>
                    <span className="text-[10px] text-white/40">&bull; {item.location}</span>
                  </div>
                  <p className="text-[11px] text-white/70 mt-0.5">{item.factor.explanation}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    Value: <span className="text-white/80">{item.factor.value}</span> (Threshold: {item.factor.threshold})
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className="text-xs font-bold text-rose-400">-{item.factor.penalty}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
