// ============================================================
// BiCAST Place Category Selector
// Sleek, horizontal pill bar for motorcycle riders to discover
// essential services along their route corridor
// ============================================================
import { ALL_PLACE_CATEGORIES, PlaceCategoryId } from '@/config/placeCategories';
import { Loader2, X } from 'lucide-react';

interface PlaceCategorySelectorProps {
  selectedCategory: string | null;
  onSelectCategory: (category: PlaceCategoryId | null) => void;
  isLoading?: boolean;
  totalFound?: number;
}

export default function PlaceCategorySelector({
  selectedCategory,
  onSelectCategory,
  isLoading = false,
  totalFound,
}: PlaceCategorySelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-white/80 flex items-center gap-1.5">
          <span>Discover Along Route</span>
          {isLoading && <Loader2 size={12} className="animate-spin text-brand-400" />}
          {!isLoading && selectedCategory && totalFound != null && (
            <span className="px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-bold border border-brand-500/30">
              {totalFound} found
            </span>
          )}
        </span>

        {selectedCategory && (
          <button
            onClick={() => onSelectCategory(null)}
            className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white transition-colors"
            title="Clear category selection"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Pill buttons list */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-white/10">
        {ALL_PLACE_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isSelected ? null : cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                isSelected
                  ? 'bg-brand-500 text-black font-semibold shadow-lg shadow-brand-500/20 scale-[1.02]'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.shortName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
