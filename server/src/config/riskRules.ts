// ============================================================
// BiCAST Weather Risk Rules Configuration
// Centralized, deterministic thresholds and penalties for motorcycle riders
// ============================================================

export interface RainRiskRule {
  drizzleMmPerHour: number;
  moderateMmPerHour: number;
  heavyMmPerHour: number;
  torrentialMmPerHour: number;
  lowProbThreshold: number;
  moderateProbThreshold: number;
  highProbThreshold: number;
  drizzlePenalty: number;
  moderatePenalty: number;
  heavyPenalty: number;
  torrentialPenalty: number;
}

export interface ThunderstormRiskRule {
  penalty: number;
}

export interface WindRiskRule {
  moderateWindSpeedKmh: number;
  strongWindSpeedKmh: number;
  galeWindSpeedKmh: number;
  moderateWindPenalty: number;
  strongWindPenalty: number;
  galeWindPenalty: number;
}

export interface WindGustRiskRule {
  moderateGustKmh: number;
  strongGustKmh: number;
  severeGustKmh: number;
  moderateGustPenalty: number;
  strongGustPenalty: number;
  severeGustPenalty: number;
}

export interface VisibilityRiskRule {
  moderateVisKm: number;
  poorVisKm: number;
  denseFogVisKm: number;
  moderateVisPenalty: number;
  poorVisPenalty: number;
  denseFogPenalty: number;
}

export interface HeatRiskRule {
  moderateHeatC: number;
  highHeatC: number;
  extremeHeatC: number;
  moderateHeatPenalty: number;
  highHeatPenalty: number;
  extremeHeatPenalty: number;
}

export interface RiskLevelThresholds {
  greenMin: number; // 80 - 100
  yellowMin: number; // 60 - 79
  orangeMin: number; // 40 - 59
  redMax: number; // 0 - 39
}

export interface RiskEngineRules {
  rain: RainRiskRule;
  thunderstorm: ThunderstormRiskRule;
  wind: WindRiskRule;
  windGust: WindGustRiskRule;
  visibility: VisibilityRiskRule;
  heat: HeatRiskRule;
  thresholds: RiskLevelThresholds;
}

export const DEFAULT_RISK_RULES: RiskEngineRules = {
  rain: {
    drizzleMmPerHour: 0.2,
    moderateMmPerHour: 2.0,
    heavyMmPerHour: 6.0,
    torrentialMmPerHour: 15.0,
    lowProbThreshold: 25,
    moderateProbThreshold: 50,
    highProbThreshold: 75,
    drizzlePenalty: 8,
    moderatePenalty: 18,
    heavyPenalty: 28,
    torrentialPenalty: 40,
  },
  thunderstorm: {
    penalty: 40,
  },
  wind: {
    moderateWindSpeedKmh: 25,
    strongWindSpeedKmh: 38,
    galeWindSpeedKmh: 52,
    moderateWindPenalty: 8,
    strongWindPenalty: 16,
    galeWindPenalty: 28,
  },
  windGust: {
    moderateGustKmh: 35,
    strongGustKmh: 50,
    severeGustKmh: 65,
    moderateGustPenalty: 10,
    strongGustPenalty: 20,
    severeGustPenalty: 35,
  },
  visibility: {
    moderateVisKm: 7.0,
    poorVisKm: 3.0,
    denseFogVisKm: 1.0,
    moderateVisPenalty: 8,
    poorVisPenalty: 18,
    denseFogPenalty: 30,
  },
  heat: {
    // Tailored for motorcycle riders wearing safety gear in Indian conditions
    moderateHeatC: 37,
    highHeatC: 41,
    extremeHeatC: 45,
    moderateHeatPenalty: 6,
    highHeatPenalty: 14,
    extremeHeatPenalty: 24,
  },
  thresholds: {
    greenMin: 80,
    yellowMin: 60,
    orangeMin: 40,
    redMax: 39,
  },
};
