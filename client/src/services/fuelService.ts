// ============================================================
// BiCAST Fuel Service (Client)
// API client for motorcycle fuel planning and UI token formatting
// ============================================================
import axios from 'axios';
import {
  FuelInput,
  FuelStatus,
  RouteFuelPlan,
} from '@/types/fuel';
import { PlannedRoute } from '@/types/route';

const API_BASE = '/api';

/**
 * Calculates fuel consumption and station recommendations for a single route.
 */
export async function calculateRouteFuel(
  route: PlannedRoute,
  fuelInput: FuelInput,
): Promise<RouteFuelPlan> {
  const res = await axios.post<{ fuelPlan: RouteFuelPlan }>(
    `${API_BASE}/routes/${route.id}/fuel/calculate`,
    {
      route,
      fuelInput,
    },
  );
  return res.data.fuelPlan;
}

/**
 * Calculates fuel metrics and recommendations across multiple route alternatives.
 */
export async function calculateMultiRouteFuel(
  routes: PlannedRoute[],
  fuelInput: FuelInput,
): Promise<Record<string, RouteFuelPlan>> {
  const res = await axios.post<{ fuelPlans: Record<string, RouteFuelPlan> }>(
    `${API_BASE}/routes/fuel/calculate-multi`,
    {
      routes,
      fuelInput,
    },
  );
  return res.data.fuelPlans;
}

/**
 * Returns visual styling and accessibility metadata for fuel status levels.
 */
export function getFuelStatusBadge(status: FuelStatus): {
  label: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  icon: string;
} {
  switch (status) {
    case 'SUFFICIENT':
      return {
        label: 'Sufficient Fuel',
        textColor: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        icon: '✓',
      };
    case 'LOW':
      return {
        label: 'Low on Arrival',
        textColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        icon: '⚠',
      };
    case 'REFUEL_RECOMMENDED':
      return {
        label: 'Refuel Recommended',
        textColor: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        icon: '⛽',
      };
    case 'REFUEL_REQUIRED':
      return {
        label: 'Refuel Required',
        textColor: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/30',
        icon: '🚨',
      };
    case 'UNKNOWN':
    default:
      return {
        label: 'Enter Mileage',
        textColor: 'text-white/40',
        bgColor: 'bg-white/5',
        borderColor: 'border-white/10',
        icon: 'ℹ',
      };
  }
}

export function formatFuelLitres(litres?: number): string {
  if (litres == null || isNaN(litres)) return '— L';
  return `${litres.toFixed(1)} L`;
}

export function formatFuelCost(cost?: number): string {
  if (cost == null || isNaN(cost)) return '—';
  return `₹${cost.toLocaleString('en-IN')}`;
}
