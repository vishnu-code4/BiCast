import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';

interface HealthResponse {
  status: string;
  version: string;
  service: string;
  providers: {
    routing: string;
    weather: string;
    geocoding: string;
    places: string;
  };
}

export default function ApiStatusBadge() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.get<HealthResponse>('/health'),
    refetchInterval: 30_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-700 border border-white/10">
        <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
        <span className="text-xs text-white/40">Connecting…</span>
      </div>
    );
  }

  if (isError || data?.status !== 'ok') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20"
           title="Backend API is not responding">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
        <span className="text-xs text-red-400">API Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
         title={`API v${data.version} — Weather: ${data.providers.weather}`}>
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
      <span className="text-xs text-emerald-400">API Online</span>
    </div>
  );
}
