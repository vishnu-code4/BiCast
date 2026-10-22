// ============================================================
// BiCAST Fuel Summary Card
// Compact dashboard presenting required fuel, cost, remaining fuel,
// and safe range progress bar with Bento styling
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
  embedded?: boolean;
  className?: string;
}

export default function FuelSummaryCard({
  calculation,
  embedded = false,
  className = '',
}: FuelSummaryCardProps) {
  const badge = getFuelStatusBadge(calculation.status);

  // Calculate percentage of route covered by usable range
  const usableRange = calculation.usableRangeKm ?? calculation.estimatedRangeKm ?? 0;
  const distance = calculation.distanceKm > 0 ? calculation.distanceKm : 1;
  const coveragePercent = Math.min(100, Math.round((usableRange / distance) * 100));

  return (
    <div className={embedded ? `space-y-3 ${className}` : `bento-tile space-y-4 ${className}`}>
      {/* Header & Status Badge */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Fuel size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Fuel & Trip Telemetry</h4>
            <p className="text-[10px] text-white/40">Consumption & range projection</p>
          </div>
        </div>

        <span
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
        >
          <span>{badge.icon}</span>
          <span>{badge.label}</span>
        </span>
      </div>

      {/* Primary Metrics Grid (3 Columns) */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* Fuel Required */}
        <div className="bento-subtile p-2.5 rounded-xl space-y-0.5">
          <span className="text-[10px] text-white/40 uppercase tracking-wider block font-semibold">
            Required
          </span>
          <p className="text-base font-bold text-white">
            {formatFuelLitres(calculation.fuelRequiredLitres)}
          </p>
          <span className="text-[10px] text-white/40">@{calculation.mileageKmPerLitre} km/L</span>
        </div>

        {/* Estimated Cost */}
        <div className="bento-subtile p-2.5 rounded-xl space-y-0.5">
          <span className="text-[10px] text-white/40 uppercase tracking-wider block font-semibold">
            Est. Cost
          </span>
          <p className="text-base font-bold text-brand-300">
            {formatFuelCost(calculation.estimatedCost)}
          </p>
          <span className="text-[10px] text-white/40">
            {calculation.fuelPricePerLitre ? `₹${calculation.fuelPricePerLitre}/L` : '—'}
          </span>
        </div>

        {/* Remaining Fuel on Arrival */}
        <div className="bento-subtile p-2.5 rounded-xl space-y-0.5">
          <span className="text-[10px] text-white/40 uppercase tracking-wider block font-semibold">
            Arrival Fuel
          </span>
          <p
            className={`text-base font-bold ${
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
        <div className="bento-subtile p-3 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/70 flex items-center gap-1.5 font-medium">
              <Gauge size={13} className="text-amber-400" />
              Usable Tank Range: <strong className="text-white">{calculation.usableRangeKm} km</strong>
            </span>
            <span className="text-white/40 text-[11px]">
              Trip: <strong className="text-white/90">{calculation.distanceKm} km</strong>
            </span>
          </div>

          {/* Bar indicator */}
          <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden relative">
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
        className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
          calculation.status === 'SUFFICIENT'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : calculation.status === 'LOW'
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            : calculation.status === 'REFUEL_RECOMMENDED'
            ? 'bg-orange-500/10 border-orange-500/20 text-orange-300'
            : calculation.status === 'REFUEL_REQUIRED'
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            : 'bg-white/5 border-white/10 text-white/60'
        }`}
      >
        {calculation.status === 'SUFFICIENT' ? (
          <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
        ) : (
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        )}
        <p className="leading-relaxed">{calculation.statusMessage}</p>
      </div>
    </div>
  );
}
