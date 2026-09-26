// ============================================================
// BiCAST Fuel Summary Card
// Compact dashboard presenting required fuel, cost, remaining fuel,
// and safe range progress bar
// ============================================================
import { FuelCalculation } from '@/types/fuel';
import {
  getFuelStatusBadge,
  formatFuelLitres,
  formatFuelCost,
} from '@/services/fuelService';
import { Fuel, Gauge, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface FuelSummaryCardProps {
  calculation: FuelCalculation;
}

export default function FuelSummaryCard({ calculation }: FuelSummaryCardProps) {
  const badge = getFuelStatusBadge(calculation.status);

  // Calculate percentage of route covered by usable range
  const usableRange = calculation.usableRangeKm ?? calculation.estimatedRangeKm ?? 0;
  const distance = calculation.distanceKm > 0 ? calculation.distanceKm : 1;
  const coveragePercent = Math.min(100, Math.round((usableRange / distance) * 100));

  return (
    <div className="glass rounded-2xl p-4 border border-white/10 space-y-3.5">
      {/* Header & Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Fuel size={15} />
          </div>
          <h4 className="text-sm font-semibold text-white">Fuel & Trip Cost</h4>
        </div>

        <span
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
        >
          <span>{badge.icon}</span>
          <span>{badge.label}</span>
        </span>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-3 gap-2.5 text-center">
        {/* Fuel Required */}
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
          <span className="text-[10px] text-white/40 uppercase tracking-wider block">Required</span>
          <p className="text-sm font-bold text-white flex items-center justify-center gap-0.5">
            {formatFuelLitres(calculation.fuelRequiredLitres)}
          </p>
          <span className="text-[10px] text-white/40">@{calculation.mileageKmPerLitre} km/L</span>
        </div>

        {/* Estimated Cost */}
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
          <span className="text-[10px] text-white/40 uppercase tracking-wider block">Estimated Cost</span>
          <p className="text-sm font-bold text-brand-300 flex items-center justify-center gap-0.5">
            <span>{formatFuelCost(calculation.estimatedCost)}</span>
          </p>
          <span className="text-[10px] text-white/40">
            {calculation.fuelPricePerLitre ? `₹${calculation.fuelPricePerLitre}/L` : '—'}
          </span>
        </div>

        {/* Remaining Fuel on Arrival */}
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
          <span className="text-[10px] text-white/40 uppercase tracking-wider block">Arrival Fuel</span>
          <p
            className={`text-sm font-bold flex items-center justify-center gap-0.5 ${
              calculation.status === 'REFUEL_REQUIRED' || calculation.status === 'REFUEL_RECOMMENDED'
                ? 'text-rose-400'
                : 'text-white'
            }`}
          >
            {calculation.estimatedRemainingFuelLitres != null
              ? formatFuelLitres(calculation.estimatedRemainingFuelLitres)
              : '—'}
          </p>
          <span className="text-[10px] text-white/40">
            {calculation.reserveLitres ? `Reserve: ${calculation.reserveLitres}L` : '—'}
          </span>
        </div>
      </div>

      {/* Usable Range vs Route Distance Progress */}
      {calculation.usableRangeKm != null && calculation.usableRangeKm > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-white/60 flex items-center gap-1">
              <Gauge size={12} className="text-amber-400" />
              Usable Range: <strong className="text-white">{calculation.usableRangeKm} km</strong>
            </span>
            <span className="text-white/40">
              Trip Distance: <strong className="text-white">{calculation.distanceKm} km</strong>
            </span>
          </div>

          {/* Bar indicator */}
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                coveragePercent >= 100
                  ? 'bg-emerald-500'
                  : coveragePercent >= 75
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Explanation Message */}
      <div
        className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
          calculation.status === 'SUFFICIENT'
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
            : calculation.status === 'LOW'
            ? 'bg-amber-500/5 border-amber-500/20 text-amber-300'
            : calculation.status === 'REFUEL_RECOMMENDED'
            ? 'bg-orange-500/5 border-orange-500/20 text-orange-300'
            : calculation.status === 'REFUEL_REQUIRED'
            ? 'bg-rose-500/5 border-rose-500/20 text-rose-300'
            : 'bg-white/5 border-white/10 text-white/60'
        }`}
      >
        {calculation.status === 'SUFFICIENT' ? (
          <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-400" />
        ) : (
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
        )}
        <p className="leading-relaxed">{calculation.statusMessage}</p>
      </div>
    </div>
  );
}
