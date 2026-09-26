// ============================================================
// Google Maps-Style Edit Stops Modal
// Allows adding, removing, and reordering intermediate stops
// with temporary staging, search autocomplete, and Done/Cancel controls
// ============================================================
import React, { useState } from 'react';
import {
  X,
  Plus,
  ArrowUp,
  ArrowDown,
  Search,
  MapPin,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { LocationInput } from '@/types/route';
import { geocodeSearch, GeocodeResult } from '@/services/geocodingService';

interface EditStopsModalProps {
  isOpen: boolean;
  startLocation: LocationInput;
  destination: LocationInput;
  currentStops: LocationInput[];
  pendingPlaceStop?: LocationInput | null;
  onClose: () => void;
  onSave: (newStops: LocationInput[]) => void;
}

export default function EditStopsModal({
  isOpen,
  startLocation,
  destination,
  currentStops,
  pendingPlaceStop,
  onClose,
  onSave,
}: EditStopsModalProps) {
  // Temporary staged stop list (isolated from main route state)
  const [stagedStops, setStagedStops] = useState<LocationInput[]>([...currentStops]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync staged stops when modal opens, including any newly added place stop
  React.useEffect(() => {
    if (isOpen) {
      let initialStops = [...currentStops];
      if (pendingPlaceStop) {
        const isDuplicate = initialStops.some(
          (s) =>
            (pendingPlaceStop.placeId && s.placeId === pendingPlaceStop.placeId) ||
            (Math.abs(s.lat - pendingPlaceStop.lat) < 0.0015 && Math.abs(s.lng - pendingPlaceStop.lng) < 0.0015),
        );
        if (!isDuplicate) {
          initialStops = [...initialStops, pendingPlaceStop];
        }
      }
      setStagedStops(initialStops);
      setIsAdding(false);
      setSearchQuery('');
      setDebouncedSearchQuery('');
      setErrorMessage(null);
    }
  }, [isOpen, currentStops, pendingPlaceStop]);

  // Debounce search query to prevent 429 rate limits
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Autocomplete query
  const searchQueryResult = useQuery({
    queryKey: ['geocode-stop', debouncedSearchQuery],
    queryFn: () => geocodeSearch(debouncedSearchQuery),
    enabled: debouncedSearchQuery.trim().length > 2,
    staleTime: 1000 * 30,
  });

  if (!isOpen) return null;

  const handleAddStop = (res: GeocodeResult) => {
    // Prevent duplicate stop
    const isDuplicate = stagedStops.some(
      (s) => Math.abs(s.lat - res.lat) < 0.001 && Math.abs(s.lng - res.lng) < 0.001,
    );
    if (isDuplicate) {
      setErrorMessage('This location is already in your stops list.');
      return;
    }

    const newStop: LocationInput = {
      name: res.name,
      lat: res.lat,
      lng: res.lng,
      placeId: res.placeId,
      formattedAddress: res.formattedAddress,
    };

    setStagedStops((prev) => [...prev, newStop]);
    setIsAdding(false);
    setSearchQuery('');
    setErrorMessage(null);
  };

  const handleRemoveStop = (index: number) => {
    setStagedStops((prev) => prev.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setStagedStops((prev) => {
      const next = [...prev];
      const temp = next[index - 1]!;
      next[index - 1] = next[index]!;
      next[index] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= stagedStops.length - 1) return;
    setStagedStops((prev) => {
      const next = [...prev];
      const temp = next[index + 1]!;
      next[index + 1] = next[index]!;
      next[index] = temp;
      return next;
    });
  };

  const handleDone = () => {
    onSave(stagedStops);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-white/15 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-brand-400" />
            <h2 className="text-lg font-semibold text-white">Edit Route Stops</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title="Cancel edits"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Fixed Start Point */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-black font-bold text-xs">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Start</p>
              <p className="text-sm font-medium text-white truncate">{startLocation.name}</p>
            </div>
          </div>

          {/* Staged Intermediate Stops */}
          <div className="space-y-2">
            {stagedStops.map((stop, index) => (
              <div
                key={`${stop.lat}-${stop.lng}-${index}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xs">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-white truncate">{stop.name}</p>
                    {stop.source === 'place' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30 uppercase tracking-wider shrink-0">
                        From Places
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 truncate">{stop.formattedAddress || 'Intermediate Stop'}</p>
                </div>

                {/* Reorder & Remove Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
                    title="Move up"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === stagedStops.length - 1}
                    className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
                    title="Move down"
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    onClick={() => handleRemoveStop(index)}
                    className="p-1 rounded text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
                    title="Remove stop"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Stop Input / Search Form */}
          {isAdding ? (
            <div className="p-4 rounded-xl bg-white/5 border border-brand-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">Search Stop Location</span>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setSearchQuery('');
                  }}
                  className="text-white/40 hover:text-white text-xs"
                >
                  Cancel
                </button>
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  autoFocus
                  className="input pl-10 text-sm"
                  placeholder="e.g. Mandya, Karnataka"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQueryResult.isLoading && (
                  <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 animate-spin" />
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {searchQueryResult.data?.results && searchQueryResult.data.results.length > 0 && (
                <div className="rounded-xl border border-white/10 overflow-hidden bg-black/40 max-h-48 overflow-y-auto">
                  {searchQueryResult.data.results.map((res) => (
                    <button
                      key={res.placeId}
                      onClick={() => handleAddStop(res)}
                      className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                    >
                      <div className="text-sm font-medium text-white">{res.name}</div>
                      <div className="text-xs text-white/40 truncate">{res.formattedAddress}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-2.5 px-4 rounded-xl border border-dashed border-white/20 hover:border-brand-400/50 hover:bg-white/5 flex items-center justify-center gap-2 text-sm text-brand-400 transition-all font-medium"
            >
              <Plus size={16} />
              Add a Stop
            </button>
          )}

          {/* Fixed Destination Point */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold text-xs">
              B
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Destination</p>
              <p className="text-sm font-medium text-white truncate">{destination.name}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="btn-primary px-5 py-2 text-sm flex items-center gap-2"
          >
            <Check size={16} />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
