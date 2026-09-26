// ============================================================
// BiCAST Weather Alerts Banner (Consolidated & Deduplicated)
// ============================================================
import { AlertOctagon, AlertTriangle, Info, Bell } from 'lucide-react';
import { WeatherAlert } from '@/types/risk';
import { getAlertSeverityBadge } from '@/services/riskService';

interface WeatherAlertsBannerProps {
  alerts: WeatherAlert[];
}

export default function WeatherAlertsBanner({ alerts }: WeatherAlertsBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Bell size={14} className="text-amber-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">
          Route Weather Alerts ({alerts.length})
        </h4>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => {
          const badge = getAlertSeverityBadge(alert.severity);

          return (
            <div
              key={alert.id}
              className={`p-3.5 rounded-xl border ${badge.borderClass} ${badge.bgClass} flex items-start gap-3 transition-all`}
            >
              <div className="mt-0.5 shrink-0">
                {alert.severity === 'SEVERE' ? (
                  <AlertOctagon size={18} className="text-rose-400" />
                ) : alert.severity === 'WARNING' ? (
                  <AlertTriangle size={18} className="text-orange-400" />
                ) : alert.severity === 'CAUTION' ? (
                  <AlertTriangle size={18} className="text-amber-400" />
                ) : (
                  <Info size={18} className="text-cyan-400" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${badge.textClass} bg-black/40`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-xs font-bold text-white truncate">{alert.title}</span>
                </div>
                <p className="text-xs text-white/80 mt-1 leading-relaxed">{alert.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
