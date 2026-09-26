// ============================================================
// BiCAST Rider Recommendations Card
// Actionable, deterministic safety guidance for motorcycle riders
// ============================================================
import { Lightbulb, CheckCircle } from 'lucide-react';

interface RiderRecommendationsCardProps {
  recommendations: string[];
}

export default function RiderRecommendationsCard({ recommendations }: RiderRecommendationsCardProps) {
  if (recommendations.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4 border border-white/10 space-y-2.5">
      <div className="flex items-center gap-2">
        <Lightbulb size={15} className="text-brand-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">
          Rider Safety Recommendations
        </h4>
      </div>

      <ul className="space-y-2 text-xs">
        {recommendations.map((rec, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-white/80 leading-relaxed">
            <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>{rec}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
