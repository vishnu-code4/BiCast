// ============================================================
// BiCAST Frontend Risk & Safety Service
// ============================================================
import { apiClient } from './api';
import { PlannedRoute } from '@/types/route';
import { RouteWeatherTimeline } from '@/types/weather';
import {
  RiskLevel,
  AlertSeverity,
  RouteRiskAnalysis,
  MultiRouteRiskAnalysis,
} from '@/types/risk';

interface SingleRiskResponse {
  riskAnalysis: RouteRiskAnalysis;
}

interface MultiRiskResponse {
  riskAnalyses: MultiRouteRiskAnalysis;
}

/**
 * Fetches risk analysis for a single route
 */
export async function fetchRouteRisk(
  route: PlannedRoute,
  timeline?: RouteWeatherTimeline,
  timezone: string = 'Asia/Kolkata',
): Promise<RouteRiskAnalysis> {
  const response = await apiClient.post<SingleRiskResponse>('/risk/route', {
    route,
    timeline,
    timezone,
  });
  return response.riskAnalysis;
}

/**
 * Fetches independent risk analysis for multiple route alternatives
 */
export async function fetchMultiRouteRisk(
  routes: PlannedRoute[],
  timelines?: Record<string, RouteWeatherTimeline>,
  timezone: string = 'Asia/Kolkata',
): Promise<MultiRouteRiskAnalysis> {
  const response = await apiClient.post<MultiRiskResponse>('/risk/multi-route', {
    routes,
    timelines,
    timezone,
  });
  return response.riskAnalyses;
}

/**
 * Accessible badges and color tokens for Risk Levels
 */
export function getRiskLevelBadge(level: RiskLevel): {
  label: string;
  symbol: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  ringClass: string;
} {
  switch (level) {
    case 'GREEN':
      return {
        label: 'Low Risk',
        symbol: '🟢',
        bgClass: 'bg-emerald-500/15',
        textClass: 'text-emerald-400',
        borderClass: 'border-emerald-500/30',
        ringClass: 'ring-emerald-500/20',
      };
    case 'YELLOW':
      return {
        label: 'Moderate Risk',
        symbol: '🟡',
        bgClass: 'bg-amber-500/15',
        textClass: 'text-amber-400',
        borderClass: 'border-amber-500/30',
        ringClass: 'ring-amber-500/20',
      };
    case 'ORANGE':
      return {
        label: 'High Risk',
        symbol: '🟠',
        bgClass: 'bg-orange-500/15',
        textClass: 'text-orange-400',
        borderClass: 'border-orange-500/30',
        ringClass: 'ring-orange-500/20',
      };
    case 'RED':
      return {
        label: 'Severe Hazard',
        symbol: '🔴',
        bgClass: 'bg-rose-500/15',
        textClass: 'text-rose-400',
        borderClass: 'border-rose-500/30',
        ringClass: 'ring-rose-500/20',
      };
  }
}

/**
 * Badges for Alert Severity
 */
export function getAlertSeverityBadge(severity: AlertSeverity): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  switch (severity) {
    case 'SEVERE':
      return {
        label: 'SEVERE WARNING',
        bgClass: 'bg-rose-500/20',
        textClass: 'text-rose-300',
        borderClass: 'border-rose-500/40',
      };
    case 'WARNING':
      return {
        label: 'WARNING',
        bgClass: 'bg-orange-500/20',
        textClass: 'text-orange-300',
        borderClass: 'border-orange-500/40',
      };
    case 'CAUTION':
      return {
        label: 'CAUTION',
        bgClass: 'bg-amber-500/20',
        textClass: 'text-amber-300',
        borderClass: 'border-amber-500/40',
      };
    case 'INFO':
    default:
      return {
        label: 'NOTICE',
        bgClass: 'bg-cyan-500/20',
        textClass: 'text-cyan-300',
        borderClass: 'border-cyan-500/40',
      };
  }
}
