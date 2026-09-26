// ============================================================
// BiCAST Fuel Settings Card
// Collapsible rider input card for mileage, current fuel, tank size, and reserve
// ============================================================
import { useState } from 'react';
import { FuelInput } from '@/types/fuel';
import { Fuel, ChevronDown, ChevronUp, Gauge, Sparkles } from 'lucide-react';

interface FuelSettingsCardProps {
  fuelInput: FuelInput;
  onChangeFuelInput: (newInput: FuelInput) => void;
}

const BIKE_PRESETS: Array<{
  name: string;
  mileage: number;
  tank: number;
  reserve: number;
}> = [
  { name: '125cc Commuter', mileage: 55, tank: 10, reserve: 1.2 },
  { name: '350cc Classic / Hunter', mileage: 35, tank: 13, reserve: 1.5 },
  { name: '450cc ADV / Tourer', mileage: 28, tank: 15, reserve: 2.0 },
  { name: '650cc Twin', mileage: 20, tank: 14, reserve: 2.0 },
];

export default function FuelSettingsCard({
  fuelInput,
  onChangeFuelInput,
}: FuelSettingsCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const applyPreset = (preset: (typeof BIKE_PRESETS)[0]) => {
    onChangeFuelInput({
      ...fuelInput,
      mileageKmPerLitre: preset.mileage,
      fuelTankCapacityLitres: preset.tank,
      reserveLitres: preset.reserve,
      // If current fuel is empty or exceeds new tank, set to 75% of tank
      currentFuelLitres:
        fuelInput.currentFuelLitres != null && fuelInput.currentFuelLitres <= preset.tank
          ? fuelInput.currentFuelLitres
          : Math.round(preset.tank * 0.75 * 10) / 10,
    });
  };

  return (
    <div className="glass rounded-2xl p-4 border border-white/10 space-y-3 transition-all">
      {/* Header Toggle */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Fuel size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <span>Motorcycle Fuel & Range</span>
              {fuelInput.mileageKmPerLitre > 0 ? (
                <span className="text-[11px] font-normal text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
                  {fuelInput.mileageKmPerLitre} km/L
                </span>
              ) : (
                <span className="text-[11px] font-normal text-white/40">Optional</span>
              )}
            </h3>
            <p className="text-[11px] text-white/40">
              {fuelInput.mileageKmPerLitre > 0
                ? 'Fuel usage, costs, and refuelling plan calculated'
                : 'Enter bike mileage to estimate fuel cost and safe range'}
            </p>
          </div>
        </div>

        <div className="p-1 rounded-lg text-white/40 group-hover:text-white transition-colors">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expandable Form */}
      {isOpen && (
        <div className="pt-3 border-t border-white/10 space-y-4 animate-fade-in">
          {/* Quick Presets */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 flex items-center gap-1 mb-1.5">
              <Sparkles size={11} className="text-amber-400" />
              Quick Bike Presets
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {BIKE_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-left transition-all"
                >
                  <p className="text-[11px] font-medium text-white truncate">{p.name}</p>
                  <p className="text-[10px] text-white/40">{p.mileage} km/L</p>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Mileage */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-white/70 flex items-center gap-1">
                <Gauge size={12} className="text-brand-400" />
                Bike Mileage (km/L) *
              </label>
              <input
                type="number"
                min="5"
                max="100"
                step="1"
                placeholder="e.g. 35"
                value={fuelInput.mileageKmPerLitre || ''}
                onChange={(e) =>
                  onChangeFuelInput({
                    ...fuelInput,
                    mileageKmPerLitre: parseFloat(e.target.value) || 0,
                  })
                }
                className="input text-xs py-2"
              />
            </div>

            {/* Fuel Price */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-white/70">
                Petrol Price (₹/L)
              </label>
              <input
                type="number"
                min="50"
                max="200"
                step="0.5"
                placeholder="e.g. 103"
                value={fuelInput.fuelPricePerLitre || ''}
                onChange={(e) =>
                  onChangeFuelInput({
                    ...fuelInput,
                    fuelPricePerLitre: parseFloat(e.target.value) || 0,
                  })
                }
                className="input text-xs py-2"
              />
            </div>

            {/* Current Fuel */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-white/70">
                Current Fuel Level (Litres)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                placeholder="e.g. 8.0"
                value={fuelInput.currentFuelLitres ?? ''}
                onChange={(e) =>
                  onChangeFuelInput({
                    ...fuelInput,
                    currentFuelLitres:
                      e.target.value === '' ? undefined : parseFloat(e.target.value),
                  })
                }
                className="input text-xs py-2"
              />
            </div>

            {/* Tank Capacity & Reserve */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/70">
                  Tank Capacity (L)
                </label>
                <input
                  type="number"
                  min="3"
                  max="50"
                  step="0.5"
                  placeholder="e.g. 13"
                  value={fuelInput.fuelTankCapacityLitres ?? ''}
                  onChange={(e) =>
                    onChangeFuelInput({
                      ...fuelInput,
                      fuelTankCapacityLitres:
                        e.target.value === '' ? undefined : parseFloat(e.target.value),
                    })
                  }
                  className="input text-xs py-2"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/70">
                  Reserve (L)
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="5"
                  step="0.1"
                  placeholder="e.g. 1.5"
                  value={fuelInput.reserveLitres ?? ''}
                  onChange={(e) =>
                    onChangeFuelInput({
                      ...fuelInput,
                      reserveLitres:
                        e.target.value === '' ? undefined : parseFloat(e.target.value),
                    })
                  }
                  className="input text-xs py-2"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
