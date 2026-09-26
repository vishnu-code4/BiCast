// ============================================================
// BiCAST Frontend Weather Risk & Safety Engine Types
// ============================================================
import { PointType } from './weather';

export type RiskLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
export type AlertSeverity = 'INFO' | 'CAUTION' | 'WARNING' | 'SEVERE';
export type RiskFactorType = 'RAIN' | 'THUNDERSTORM' | 'WIND' | 'GUSTS' | 'VISIBILITY' | 'HEAT';
export type FactorSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type ScoreStatus = 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE';

export interface RiskFactor {
  type: RiskFactorType;
  severity: FactorSeverity;
  penalty: number;
  value: number | string;
  threshold: number | string;
  explanation: string;
}

export interface CheckpointRisk {
  checkpointId: string;
  pointType: PointType;
  sequence: number;
  locationName: string;
  estimatedArrivalTime: string; // ISO 8601
  forecastTime: string; // ISO 8601
  latitude: number;
  longitude: number;
  score: number; // 0–100 clamped
  level: RiskLevel;
  factors: RiskFactor[];
  primaryConcern: string | null;
  recommendations: string[];
}

export interface RouteSegmentRisk {
  segmentIndex: number;
  fromPointId: string;
  toPointId: string;
  fromLocationName: string;
  toLocationName: string;
  fromCoordinates: [number, number];
  toCoordinates: [number, number];
  score: number;
  level: RiskLevel;
  primaryConcern: string | null;
  isSevereEvent: boolean;
  severeEventDescription?: string;
  distanceMeters?: number;
  durationSeconds?: number;
}

export interface WeatherAlert {
  id: string;
  routeId: string;
  checkpointId?: string;
  severity: AlertSeverity;
  type: string;
  title: string;
  message: string;
  startTime: string; // ISO 8601
  endTime?: string; // ISO 8601
  latitude: number;
  longitude: number;
  affectedLocations: string[];
}

export interface RouteComparisonTags {
  isFastest?: boolean;
  isShortest?: boolean;
  isSafest?: boolean;
}

export interface RouteRiskAnalysis {
  routeId: string;
  generatedAt: string;
  overallScore: number;
  overallLevel: RiskLevel;
  scoreStatus: ScoreStatus;
  statusMessage?: string;
  primaryConcerns: string[];
  severeSegments: RouteSegmentRisk[];
  checkpoints: CheckpointRisk[];
  segments: RouteSegmentRisk[];
  alerts: WeatherAlert[];
  recommendations: string[];
  tags?: RouteComparisonTags;
}

export interface MultiRouteRiskAnalysis {
  [routeId: string]: RouteRiskAnalysis;
}
