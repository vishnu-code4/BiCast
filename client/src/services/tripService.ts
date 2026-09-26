// ============================================================
// BiCAST Trip Service (Frontend)
// API client & TanStack Query hooks for persistent trips
// ============================================================
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SavedTrip,
  TripListItem,
  TripHistoryStats,
  CreateTripPayload,
  UpdateTripPayload,
  TripQueryParams,
  TripFreshness,
  TripStatus,
} from '@/types/trip';

const API_BASE = '/api/trips';

export async function fetchTrips(
  params?: TripQueryParams,
): Promise<{ trips: TripListItem[]; total: number; page: number; limit: number }> {
  const { data } = await axios.get(API_BASE, { params });
  return data;
}

export async function fetchTripHistory(
  params?: TripQueryParams,
): Promise<{
  trips: TripListItem[];
  total: number;
  page: number;
  limit: number;
  stats: TripHistoryStats;
}> {
  const { data } = await axios.get(`${API_BASE}/history`, { params });
  return data;
}

export async function fetchTripById(id: string): Promise<SavedTrip> {
  const { data } = await axios.get<{ trip: SavedTrip }>(`${API_BASE}/${id}`);
  return data.trip;
}

export async function createTrip(payload: CreateTripPayload): Promise<SavedTrip> {
  const { data } = await axios.post<{ message: string; trip: SavedTrip }>(API_BASE, payload);
  return data.trip;
}

export async function updateTrip(id: string, payload: UpdateTripPayload): Promise<SavedTrip> {
  const { data } = await axios.patch<{ message: string; trip: SavedTrip }>(`${API_BASE}/${id}`, payload);
  return data.trip;
}

export async function deleteTrip(id: string): Promise<boolean> {
  await axios.delete(`${API_BASE}/${id}`);
  return true;
}

export async function duplicateTrip(id: string, name?: string): Promise<SavedTrip> {
  const { data } = await axios.post<{ message: string; trip: SavedTrip }>(`${API_BASE}/${id}/duplicate`, { name });
  return data.trip;
}

export async function recalculateTrip(
  id: string,
  schedule?: { departureTime?: string; journeyDate?: string },
): Promise<SavedTrip> {
  const { data } = await axios.post<{ message: string; trip: SavedTrip }>(
    `${API_BASE}/${id}/recalculate`,
    schedule,
  );
  return data.trip;
}

// --- TanStack Query Hooks ---

export function useTrips(params?: TripQueryParams) {
  return useQuery({
    queryKey: ['trips', params],
    queryFn: () => fetchTrips(params),
    staleTime: 1000 * 30, // 30s
  });
}

export function useTripHistory(params?: TripQueryParams) {
  return useQuery({
    queryKey: ['trip-history', params],
    queryFn: () => fetchTripHistory(params),
    staleTime: 1000 * 30,
  });
}

export function useTrip(id: string | undefined) {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: () => fetchTripById(id!),
    enabled: !!id,
    staleTime: 1000 * 60,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip-history'] });
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTripPayload }) => updateTrip(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['trip-history'] });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip-history'] });
    },
  });
}

export function useDuplicateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) => duplicateTrip(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip-history'] });
    },
  });
}

export function useRecalculateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      schedule,
    }: {
      id: string;
      schedule?: { departureTime?: string; journeyDate?: string };
    }) => recalculateTrip(id, schedule),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['trip-history'] });
    },
  });
}

// --- UI Helpers ---

export function getTripStatusBadge(status: TripStatus) {
  switch (status) {
    case 'PLANNED':
      return {
        label: 'Planned',
        textColor: 'text-brand-400',
        bgColor: 'bg-brand-500/10',
        borderColor: 'border-brand-500/30',
      };
    case 'IN_PROGRESS':
      return {
        label: 'In Progress',
        textColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        textColor: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        textColor: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/30',
      };
    case 'DRAFT':
    default:
      return {
        label: 'Draft',
        textColor: 'text-white/40',
        bgColor: 'bg-white/5',
        borderColor: 'border-white/10',
      };
  }
}

export function getFreshnessBadge(freshness?: TripFreshness) {
  if (!freshness) {
    return {
      label: 'Unprocessed',
      textColor: 'text-white/40',
      bgColor: 'bg-white/5',
      borderColor: 'border-white/10',
      isFresh: false,
    };
  }

  switch (freshness.status) {
    case 'FRESH':
      return {
        label: 'Fresh Forecast',
        textColor: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        isFresh: true,
      };
    case 'STALE':
      return {
        label: 'Needs Refresh',
        textColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        isFresh: false,
      };
    case 'EXPIRED':
      return {
        label: 'Expired',
        textColor: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/30',
        isFresh: false,
      };
    case 'UNPROCESSED':
    default:
      return {
        label: 'Needs Calculation',
        textColor: 'text-white/40',
        bgColor: 'bg-white/5',
        borderColor: 'border-white/10',
        isFresh: false,
      };
  }
}
