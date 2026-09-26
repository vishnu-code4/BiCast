// ============================================================
// BiCAST Save Trip Modal
// Allows riders to provide a custom name or accept smart default,
// review journey configuration, and persist the planned trip.
// ============================================================
import { useState, useEffect } from 'react';
import { Bookmark, MapPin, Calendar, Clock, Loader2, X, Check } from 'lucide-react';

interface SaveTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  defaultName: string;
  originName: string;
  destinationName: string;
  stopsCount: number;
  journeyDate: string;
  departureTime: string;
  isSaving: boolean;
}

export default function SaveTripModal({
  isOpen,
  onClose,
  onSave,
  defaultName,
  originName,
  destinationName,
  stopsCount,
  journeyDate,
  departureTime,
  isSaving,
}: SaveTripModalProps) {
  const [tripName, setTripName] = useState(defaultName);

  useEffect(() => {
    if (isOpen) {
      setTripName(defaultName);
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(tripName.trim() || defaultName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-surface-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-surface-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Bookmark size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Save Planned Trip</h3>
              <p className="text-xs text-white/40">Persist your route, stops, and fuel plan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-1.5">
              Trip Name
            </label>
            <input
              type="text"
              id="save-trip-name-input"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="e.g. Kerala Weekend Ride"
              disabled={isSaving}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Journey Summary Box */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-white/80">
              <span className="text-white/40 flex items-center gap-1.5">
                <MapPin size={13} className="text-brand-400" /> Route:
              </span>
              <span className="font-medium text-right max-w-[200px] truncate">
                {originName.split(',')[0]} → {destinationName.split(',')[0]}
              </span>
            </div>

            {stopsCount > 0 && (
              <div className="flex items-center justify-between text-white/80">
                <span className="text-white/40">Intermediate Stops:</span>
                <span className="font-semibold text-brand-300">{stopsCount} stops</span>
              </div>
            )}

            <div className="flex items-center justify-between text-white/80">
              <span className="text-white/40 flex items-center gap-1.5">
                <Calendar size={13} /> Journey Date:
              </span>
              <span>{journeyDate}</span>
            </div>

            <div className="flex items-center justify-between text-white/80">
              <span className="text-white/40 flex items-center gap-1.5">
                <Clock size={13} /> Departure Time:
              </span>
              <span>{departureTime}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="confirm-save-trip-btn"
              disabled={isSaving}
              className="btn-primary px-5 py-2 text-xs font-semibold flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving Trip…
                </>
              ) : (
                <>
                  <Check size={14} />
                  Save Trip
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
