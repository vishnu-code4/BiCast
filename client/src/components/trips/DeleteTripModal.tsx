// ============================================================
// BiCAST Delete Trip Modal
// Destructive confirmation dialog before deleting a persistent trip
// ============================================================
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteTripModalProps {
  isOpen: boolean;
  tripName: string;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteTripModal({
  isOpen,
  tripName,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteTripModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-surface-900 border border-rose-500/20 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <AlertTriangle size={24} />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Delete Saved Trip?</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Are you sure you want to delete <span className="text-white font-semibold">"{tripName}"</span>?
              This will permanently remove the trip configuration, stops, and saved snapshots.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-delete-trip-btn"
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  Delete Trip
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
