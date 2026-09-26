// ============================================================
// BiCAST Weather Risk & Safety Engine Service
// Deterministic, rule-based scoring, segment risk, and alert generator
// No AI / LLM used — 100% explainable and verifiable
// ============================================================
import { PlannedRoute } from '../types/routePlan';
import { RouteWeatherTimeline, RouteWeatherPoint } from '../types/weatherTimeline';
import {
  RiskLevel,
  AlertSeverity,
  RiskFactor,
  CheckpointRisk,
  RouteSegmentRisk,
  WeatherAlert,
  RouteRiskAnalysis,
  MultiRouteRiskAnalysis,
} from '../types/risk';
import { DEFAULT_RISK_RULES, RiskEngineRules } from '../config/riskRules';

export class WeatherRiskService {
  private rules: RiskEngineRules;

  constructor(rules: RiskEngineRules = DEFAULT_RISK_RULES) {
    this.rules = rules;
  }

  /**
   * Helper to map a numeric 0-100 score into a standard RiskLevel
   */
  getRiskLevel(score: number): RiskLevel {
    if (score >= this.rules.thresholds.greenMin) return 'GREEN';
    if (score >= this.rules.thresholds.yellowMin) return 'YELLOW';
    if (score >= this.rules.thresholds.orangeMin) return 'ORANGE';
    return 'RED';
  }

  /**
   * Evaluates deterministic risk factors for a single RouteWeatherPoint
   */
  calculatePointRisk(point: RouteWeatherPoint): CheckpointRisk {
    const factors: RiskFactor[] = [];
    let totalPenalty = 0;

    // 1. Rain & Precipitation Intensity
    const precipAmount = Math.max(point.precipitation, point.rain, point.showers);
    const precipProb = point.precipitationProbability;

    if (precipAmount >= this.rules.rain.torrentialMmPerHour) {
      const penalty = this.rules.rain.torrentialPenalty;
      factors.push({
        type: 'RAIN',
        severity: 'CRITICAL',
        penalty,
        value: `${precipAmount} mm/h (${precipProb}%)`,
        threshold: `≥ ${this.rules.rain.torrentialMmPerHour} mm/h`,
        explanation: 'Torrential downpour with high aquaplaning hazard',
      });
      totalPenalty += penalty;
    } else if (precipAmount >= this.rules.rain.heavyMmPerHour || (precipProb >= this.rules.rain.highProbThreshold && precipAmount >= 2.0)) {
      const penalty = this.rules.rain.heavyPenalty;
      factors.push({
        type: 'RAIN',
        severity: 'HIGH',
        penalty,
        value: `${precipAmount} mm/h (${precipProb}%)`,
        threshold: `≥ ${this.rules.rain.heavyMmPerHour} mm/h`,
        explanation: 'Heavy rain expected, substantially reducing tire grip and visibility',
      });
      totalPenalty += penalty;
    } else if (precipAmount >= this.rules.rain.moderateMmPerHour || precipProb >= this.rules.rain.moderateProbThreshold) {
      const penalty = this.rules.rain.moderatePenalty;
      factors.push({
        type: 'RAIN',
        severity: 'MODERATE',
        penalty,
        value: `${precipAmount} mm/h (${precipProb}%)`,
        threshold: `≥ ${this.rules.rain.moderateMmPerHour} mm/h`,
        explanation: 'Moderate rain expected along roadway',
      });
      totalPenalty += penalty;
    } else if (precipAmount >= this.rules.rain.drizzleMmPerHour || precipProb >= this.rules.rain.lowProbThreshold) {
      const penalty = this.rules.rain.drizzlePenalty;
      factors.push({
        type: 'RAIN',
        severity: 'LOW',
        penalty,
        value: `${precipAmount} mm/h (${precipProb}%)`,
        threshold: `≥ ${this.rules.rain.drizzleMmPerHour} mm/h`,
        explanation: 'Light drizzle / passing shower possible',
      });
      totalPenalty += penalty;
    }

    // 2. Thunderstorm Detection
    if (point.thunderstorm || point.weatherCode === 95 || point.weatherCode === 96 || point.weatherCode === 99) {
      const penalty = this.rules.thunderstorm.penalty;
      factors.push({
        type: 'THUNDERSTORM',
        severity: 'CRITICAL',
        penalty,
        value: point.weatherCondition || 'Thunderstorm',
        threshold: 'Active thunderstorm cell',
        explanation: 'Elevated thunderstorm risk with possible lightning, severe gusts, and sudden water accumulation',
      });
      totalPenalty += penalty;
    }

    // 3. Sustained Wind
    if (point.windSpeed >= this.rules.wind.galeWindSpeedKmh) {
      const penalty = this.rules.wind.galeWindPenalty;
      factors.push({
        type: 'WIND',
        severity: 'HIGH',
        penalty,
        value: `${Math.round(point.windSpeed)} km/h`,
        threshold: `≥ ${this.rules.wind.galeWindSpeedKmh} km/h`,
        explanation: 'Gale-force sustained winds creating hazardous riding balance',
      });
      totalPenalty += penalty;
    } else if (point.windSpeed >= this.rules.wind.strongWindSpeedKmh) {
      const penalty = this.rules.wind.strongWindPenalty;
      factors.push({
        type: 'WIND',
        severity: 'MODERATE',
        penalty,
        value: `${Math.round(point.windSpeed)} km/h`,
        threshold: `≥ ${this.rules.wind.strongWindSpeedKmh} km/h`,
        explanation: 'Strong sustained winds affecting rider stability',
      });
      totalPenalty += penalty;
    } else if (point.windSpeed >= this.rules.wind.moderateWindSpeedKmh) {
      const penalty = this.rules.wind.moderateWindPenalty;
      factors.push({
        type: 'WIND',
        severity: 'LOW',
        penalty,
        value: `${Math.round(point.windSpeed)} km/h`,
        threshold: `≥ ${this.rules.wind.moderateWindSpeedKmh} km/h`,
        explanation: 'Moderate breeze with perceptible aerodynamic drag',
      });
      totalPenalty += penalty;
    }

    // 4. Wind Gusts (Crucial for motorcycle lateral displacement)
    const gustDiff = point.windGusts - point.windSpeed;
    if (point.windGusts >= this.rules.windGust.severeGustKmh) {
      const penalty = this.rules.windGust.severeGustPenalty;
      factors.push({
        type: 'GUSTS',
        severity: 'CRITICAL',
        penalty,
        value: `${Math.round(point.windGusts)} km/h`,
        threshold: `≥ ${this.rules.windGust.severeGustKmh} km/h`,
        explanation: 'Dangerous sudden crosswind gusts capable of destabilizing two-wheelers',
      });
      totalPenalty += penalty;
    } else if (point.windGusts >= this.rules.windGust.strongGustKmh && gustDiff >= 10) {
      const penalty = this.rules.windGust.strongGustPenalty;
      factors.push({
        type: 'GUSTS',
        severity: 'HIGH',
        penalty,
        value: `${Math.round(point.windGusts)} km/h`,
        threshold: `≥ ${this.rules.windGust.strongGustKmh} km/h`,
        explanation: 'Strong sudden crosswind gusts requiring heightened steering control',
      });
      totalPenalty += penalty;
    } else if (point.windGusts >= this.rules.windGust.moderateGustKmh && gustDiff >= 12) {
      const penalty = this.rules.windGust.moderateGustPenalty;
      factors.push({
        type: 'GUSTS',
        severity: 'MODERATE',
        penalty,
        value: `${Math.round(point.windGusts)} km/h`,
        threshold: `≥ ${this.rules.windGust.moderateGustKmh} km/h`,
        explanation: 'Moderate wind gusts present in open corridors',
      });
      totalPenalty += penalty;
    }

    // 5. Visibility
    if (point.visibility < this.rules.visibility.denseFogVisKm) {
      const penalty = this.rules.visibility.denseFogPenalty;
      factors.push({
        type: 'VISIBILITY',
        severity: 'CRITICAL',
        penalty,
        value: `${point.visibility.toFixed(1)} km`,
        threshold: `< ${this.rules.visibility.denseFogVisKm} km`,
        explanation: 'Dense fog / severely impaired sightline (< 1 km)',
      });
      totalPenalty += penalty;
    } else if (point.visibility < this.rules.visibility.poorVisKm) {
      const penalty = this.rules.visibility.poorVisPenalty;
      factors.push({
        type: 'VISIBILITY',
        severity: 'HIGH',
        penalty,
        value: `${point.visibility.toFixed(1)} km`,
        threshold: `< ${this.rules.visibility.poorVisKm} km`,
        explanation: 'Poor visibility due to mist, fog, or heavy precipitation',
      });
      totalPenalty += penalty;
    } else if (point.visibility < this.rules.visibility.moderateVisKm) {
      const penalty = this.rules.visibility.moderateVisPenalty;
      factors.push({
        type: 'VISIBILITY',
        severity: 'MODERATE',
        penalty,
        value: `${point.visibility.toFixed(1)} km`,
        threshold: `< ${this.rules.visibility.moderateVisKm} km`,
        explanation: 'Moderate haze or mist reducing distant sight distance',
      });
      totalPenalty += penalty;
    }

    // 6. Heat Stress (Apparent Temperature / Heat Index)
    const heatMetric = Math.max(point.apparentTemperature, point.temperature);
    if (heatMetric >= this.rules.heat.extremeHeatC) {
      const penalty = this.rules.heat.extremeHeatPenalty;
      factors.push({
        type: 'HEAT',
        severity: 'HIGH',
        penalty,
        value: `${Math.round(heatMetric)}°C`,
        threshold: `≥ ${this.rules.heat.extremeHeatC}°C`,
        explanation: 'Extreme heat stress condition for riders wearing protective gear',
      });
      totalPenalty += penalty;
    } else if (heatMetric >= this.rules.heat.highHeatC) {
      const penalty = this.rules.heat.highHeatPenalty;
      factors.push({
        type: 'HEAT',
        severity: 'MODERATE',
        penalty,
        value: `${Math.round(heatMetric)}°C`,
        threshold: `≥ ${this.rules.heat.highHeatC}°C`,
        explanation: 'High ambient heat index — elevated dehydration and fatigue risk',
      });
      totalPenalty += penalty;
    } else if (heatMetric >= this.rules.heat.moderateHeatC) {
      const penalty = this.rules.heat.moderateHeatPenalty;
      factors.push({
        type: 'HEAT',
        severity: 'LOW',
        penalty,
        value: `${Math.round(heatMetric)}°C`,
        threshold: `≥ ${this.rules.heat.moderateHeatC}°C`,
        explanation: 'Warm riding conditions — maintain regular fluid intake',
      });
      totalPenalty += penalty;
    }

    // Compute final clamped score
    const rawScore = 100 - totalPenalty;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    const level = this.getRiskLevel(score);

    // Primary concern
    let primaryConcern: string | null = null;
    if (factors.length > 0) {
      // Pick the factor with the highest penalty
      const sortedFactors = [...factors].sort((a, b) => b.penalty - a.penalty);
      primaryConcern = sortedFactors[0]!.explanation;
    }

    // Recommendations for this point
    const recommendations = this.generateRiderRecommendations(factors, level);

    return {
      checkpointId: point.pointId,
      pointType: point.pointType,
      sequence: point.sequence,
      locationName: point.locationName,
      estimatedArrivalTime: point.estimatedArrivalTime,
      forecastTime: point.forecastTime,
      latitude: point.latitude,
      longitude: point.longitude,
      score,
      level,
      factors,
      primaryConcern,
      recommendations,
    };
  }

  /**
   * Evaluates route segments between adjacent checkpoints
   */
  calculateRouteSegments(checkpoints: CheckpointRisk[]): RouteSegmentRisk[] {
    if (checkpoints.length < 2) return [];

    const segments: RouteSegmentRisk[] = [];

    for (let i = 0; i < checkpoints.length - 1; i++) {
      const from = checkpoints[i]!;
      const to = checkpoints[i + 1]!;

      // Weighted segment score: 60% worst endpoint + 40% average endpoint
      const minScore = Math.min(from.score, to.score);
      const avgScore = (from.score + to.score) / 2;
      const segmentScore = Math.max(0, Math.min(100, Math.round(minScore * 0.6 + avgScore * 0.4)));
      const segmentLevel = this.getRiskLevel(segmentScore);

      // Check for severe weather events
      const hasSevereThunderstorm =
        from.factors.some((f) => f.type === 'THUNDERSTORM') ||
        to.factors.some((f) => f.type === 'THUNDERSTORM');
      const hasTorrentialRain =
        from.factors.some((f) => f.type === 'RAIN' && f.severity === 'CRITICAL') ||
        to.factors.some((f) => f.type === 'RAIN' && f.severity === 'CRITICAL');
      const hasSevereGusts =
        from.factors.some((f) => f.type === 'GUSTS' && f.severity === 'CRITICAL') ||
        to.factors.some((f) => f.type === 'GUSTS' && f.severity === 'CRITICAL');

      const isSevereEvent = segmentLevel === 'RED' || hasSevereThunderstorm || hasTorrentialRain || hasSevereGusts;

      let severeDesc: string | undefined;
      if (hasSevereThunderstorm) {
        severeDesc = `Thunderstorm cell forecast between ${from.locationName} and ${to.locationName}`;
      } else if (hasTorrentialRain) {
        severeDesc = `Torrential rainfall expected between ${from.locationName} and ${to.locationName}`;
      } else if (hasSevereGusts) {
        severeDesc = `Dangerous crosswind gusts expected between ${from.locationName} and ${to.locationName}`;
      } else if (isSevereEvent) {
        severeDesc = `Severe riding risk between ${from.locationName} and ${to.locationName}`;
      }

      // Primary concern for segment
      const primaryConcern = from.primaryConcern || to.primaryConcern || null;

      segments.push({
        segmentIndex: i,
        fromPointId: from.checkpointId,
        toPointId: to.checkpointId,
        fromLocationName: from.locationName,
        toLocationName: to.locationName,
        fromCoordinates: [from.latitude, from.longitude],
        toCoordinates: [to.latitude, to.longitude],
        score: segmentScore,
        level: segmentLevel,
        primaryConcern,
        isSevereEvent,
        severeEventDescription: severeDesc,
      });
    }

    return segments;
  }

  /**
   * Intelligently aggregates checkpoint & segment risks into an overall Route Safety Score
   */
  calculateOverallRouteScore(
    checkpoints: CheckpointRisk[],
    segments: RouteSegmentRisk[],
  ): {
    overallScore: number;
    overallLevel: RiskLevel;
    severeSegments: RouteSegmentRisk[];
    primaryConcerns: string[];
  } {
    if (checkpoints.length === 0) {
      return {
        overallScore: 100,
        overallLevel: 'GREEN',
        severeSegments: [],
        primaryConcerns: [],
      };
    }

    // 1. Checkpoint average (weighted base 70%)
    const sumScores = checkpoints.reduce((acc, cp) => acc + cp.score, 0);
    const meanScore = sumScores / checkpoints.length;

    // 2. Minimum checkpoint score (worst-case impact 30%)
    const minScore = Math.min(...checkpoints.map((cp) => cp.score));

    // Combine: 70% average + 30% worst point
    let calculatedScore = Math.round(meanScore * 0.7 + minScore * 0.3);

    // Severe weather override: if any segment or checkpoint is RED due to thunderstorm or torrential rain,
    // overall score must not be falsely marked safe/green
    const severeSegments = segments.filter((s) => s.isSevereEvent);
    if (severeSegments.length > 0 && calculatedScore > 59) {
      // Cap at 59 (ORANGE) so rider is warned about the severe segment
      calculatedScore = 59;
    }

    const overallScore = Math.max(0, Math.min(100, calculatedScore));
    const overallLevel = this.getRiskLevel(overallScore);

    // Collect unique primary concerns
    const concernSet = new Set<string>();
    for (const cp of checkpoints) {
      for (const factor of cp.factors) {
        if (factor.severity === 'HIGH' || factor.severity === 'CRITICAL') {
          concernSet.add(factor.explanation);
        }
      }
    }

    return {
      overallScore,
      overallLevel,
      severeSegments,
      primaryConcerns: Array.from(concernSet).slice(0, 4),
    };
  }

  /**
   * Consolidates and deduplicates weather alerts across checkpoints
   */
  generateConsolidatedAlerts(checkpoints: CheckpointRisk[], routeId: string): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];

    interface RawAlertSpan {
      type: string;
      severity: AlertSeverity;
      title: string;
      messageTemplate: string;
      checkpoints: CheckpointRisk[];
    }

    const activeSpans: Map<string, RawAlertSpan> = new Map();

    for (const cp of checkpoints) {
      const activeTypesForCp = new Set<string>();

      for (const f of cp.factors) {
        if (f.severity === 'LOW') continue; // Skip minor trivial alerts

        let alertType: string = f.type;
        let severity: AlertSeverity = 'CAUTION';
        let title = 'Weather Notice';
        let messageTemplate = '';

        if (f.type === 'THUNDERSTORM') {
          severity = 'SEVERE';
          title = 'Thunderstorm Risk';
          messageTemplate = 'Thunderstorms forecast with elevated lightning and gust risks';
        } else if (f.type === 'RAIN') {
          if (f.severity === 'CRITICAL' || f.severity === 'HIGH') {
            severity = 'WARNING';
            title = 'Heavy Rain Forecast';
            messageTemplate = 'Heavy rainfall expected, reducing roadway grip';
          } else {
            severity = 'CAUTION';
            title = 'Rain Expected';
            messageTemplate = 'Rain expected along the travel path';
          }
        } else if (f.type === 'GUSTS' || f.type === 'WIND') {
          alertType = 'WIND_HAZARD';
          if (f.severity === 'CRITICAL') {
            severity = 'WARNING';
            title = 'Dangerous Crosswind Gusts';
            messageTemplate = 'Severe crosswind gusts may affect motorcycle stability';
          } else {
            severity = 'CAUTION';
            title = 'Strong Wind Alert';
            messageTemplate = 'Brisk winds and gusts forecast';
          }
        } else if (f.type === 'VISIBILITY') {
          severity = f.severity === 'CRITICAL' ? 'WARNING' : 'CAUTION';
          title = 'Low Visibility';
          messageTemplate = 'Fog or heavy mist substantially reducing sightline';
        } else if (f.type === 'HEAT') {
          severity = 'CAUTION';
          title = 'High Heat Index';
          messageTemplate = 'Elevated heat index requiring proper rider hydration';
        }

        activeTypesForCp.add(alertType);

        // Group consecutive checkpoints with the same alert type
        const existingSpan = activeSpans.get(alertType);
        if (existingSpan) {
          existingSpan.checkpoints.push(cp);
          if (severity === 'SEVERE' || (severity === 'WARNING' && existingSpan.severity !== 'SEVERE')) {
            existingSpan.severity = severity;
            existingSpan.title = title;
          }
        } else {
          activeSpans.set(alertType, {
            type: alertType,
            severity,
            title,
            messageTemplate,
            checkpoints: [cp],
          });
        }
      }

      // Check if any active spans ended
      for (const [key, span] of activeSpans.entries()) {
        if (!activeTypesForCp.has(key)) {
          // Span has ended, materialize alert
          alerts.push(this.materializeAlert(span, routeId));
          activeSpans.delete(key);
        }
      }
    }

    // Materialize remaining active spans
    for (const span of activeSpans.values()) {
      alerts.push(this.materializeAlert(span, routeId));
    }

    return alerts;
  }

  private materializeAlert(
    span: {
      type: string;
      severity: AlertSeverity;
      title: string;
      messageTemplate: string;
      checkpoints: CheckpointRisk[];
    },
    routeId: string,
  ): WeatherAlert {
    const cps = span.checkpoints;
    const first = cps[0]!;
    const last = cps[cps.length - 1]!;

    const formatClock = (isoStr: string) => {
      try {
        return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return isoStr;
      }
    };

    let locationText = first.locationName;
    if (cps.length > 1 && first.locationName !== last.locationName) {
      locationText = `between ${first.locationName} and ${last.locationName}`;
    } else {
      locationText = `near ${first.locationName}`;
    }

    const startTimeFormatted = formatClock(first.estimatedArrivalTime);
    const endTimeFormatted = formatClock(last.estimatedArrivalTime);
    const timeText =
      cps.length > 1 && startTimeFormatted !== endTimeFormatted
        ? `approximately ${startTimeFormatted}–${endTimeFormatted}`
        : `around ${startTimeFormatted}`;

    const message = `${span.messageTemplate} ${locationText} (${timeText}).`;

    return {
      id: `alert-${routeId}-${span.type}-${first.checkpointId}`,
      routeId,
      checkpointId: first.checkpointId,
      severity: span.severity,
      type: span.type,
      title: span.title,
      message,
      startTime: first.estimatedArrivalTime,
      endTime: last.estimatedArrivalTime,
      latitude: first.latitude,
      longitude: first.longitude,
      affectedLocations: cps.map((c) => c.locationName),
    };
  }

  /**
   * Deterministic safety recommendations based on active risk factors
   */
  generateRiderRecommendations(factors: RiskFactor[], level: RiskLevel): string[] {
    const recs = new Set<string>();

    for (const f of factors) {
      if (f.type === 'THUNDERSTORM') {
        recs.add('Thunderstorm risk: Seek safe covered shelter if rain intensifies or lightning is observed.');
      } else if (f.type === 'RAIN') {
        if (f.severity === 'CRITICAL' || f.severity === 'HIGH') {
          recs.add('Heavy rain: Wear high-visibility waterproof gear and reduce travel speed on slick tarmac.');
        } else {
          recs.add('Passing rain: Keep waterproof layer accessible and brake gently.');
        }
      } else if (f.type === 'WIND' || f.type === 'GUSTS') {
        recs.add('Crosswinds: Relax your arms on the handlebars and maintain a stable, centered lane position.');
      } else if (f.type === 'VISIBILITY') {
        recs.add('Low visibility: Turn on low-beam headlights and maintain an extended following distance.');
      } else if (f.type === 'HEAT') {
        recs.add('Heat stress: Carry electrolyte fluids and plan 10-minute shaded rest breaks.');
      }
    }

    if (level === 'GREEN' && recs.size === 0) {
      recs.add('Favorable riding weather forecast along this route. Ride safely with full protective gear.');
    }

    return Array.from(recs).slice(0, 4);
  }

  /**
   * Full Route Risk Analysis pipeline: takes a PlannedRoute and RouteWeatherTimeline
   */
  analyzeRouteRisk(route: PlannedRoute, timeline: RouteWeatherTimeline): RouteRiskAnalysis {
    const generatedAt = new Date().toISOString();

    if (timeline.status === 'unavailable') {
      return {
        routeId: route.id,
        generatedAt,
        overallScore: 100,
        overallLevel: 'GREEN',
        scoreStatus: 'UNAVAILABLE',
        statusMessage: timeline.statusMessage || 'Weather forecast is unavailable for this date.',
        primaryConcerns: [],
        severeSegments: [],
        checkpoints: [],
        segments: [],
        alerts: [],
        recommendations: ['Weather data currently unavailable. Observe local roadside conditions.'],
      };
    }

    // 1. Evaluate risk for each RouteWeatherPoint
    const checkpoints: CheckpointRisk[] = timeline.points.map((pt) => this.calculatePointRisk(pt));

    // 2. Evaluate segments between checkpoints
    const segments: RouteSegmentRisk[] = this.calculateRouteSegments(checkpoints);

    // 3. Aggregate overall safety score
    const { overallScore, overallLevel, severeSegments, primaryConcerns } =
      this.calculateOverallRouteScore(checkpoints, segments);

    // 4. Consolidated deduplicated alerts
    const alerts: WeatherAlert[] = this.generateConsolidatedAlerts(checkpoints, route.id);

    // 5. Consolidated recommendations
    const allFactors: RiskFactor[] = checkpoints.flatMap((c) => c.factors);
    const recommendations: string[] = this.generateRiderRecommendations(allFactors, overallLevel);

    const scoreStatus = timeline.status === 'partially_available' ? 'PARTIAL' : 'COMPLETE';

    return {
      routeId: route.id,
      generatedAt,
      overallScore,
      overallLevel,
      scoreStatus,
      statusMessage: scoreStatus === 'PARTIAL' ? 'Assessment based on partial forecast points.' : undefined,
      primaryConcerns,
      severeSegments,
      checkpoints,
      segments,
      alerts,
      recommendations,
    };
  }

  /**
   * Multi-Route Risk Analysis & Comparison tags (Fastest, Shortest, Safest)
   */
  analyzeMultiRouteRisk(
    routes: PlannedRoute[],
    timelines: Record<string, RouteWeatherTimeline>,
  ): MultiRouteRiskAnalysis {
    const result: MultiRouteRiskAnalysis = {};

    if (routes.length === 0) return result;

    let minDuration = Infinity;
    let minDistance = Infinity;
    let maxScore = -1;
    let fastestId = '';
    let shortestId = '';
    let safestId = '';

    for (const route of routes) {
      const timeline = timelines[route.id] ?? {
        routeId: route.id,
        generatedAt: new Date().toISOString(),
        status: 'unavailable',
        points: [],
        summary: {
          minTemperature: 0,
          maxTemperature: 0,
          maxPrecipitationProbability: 0,
          totalPrecipitationMm: 0,
          maxWindSpeedKmh: 0,
          maxWindGustsKmh: 0,
          hasThunderstorm: false,
          hasRain: false,
          rainExposure: 'none',
          weatherPointsCount: 0,
        },
      };

      const analysis = this.analyzeRouteRisk(route, timeline);
      result[route.id] = analysis;

      if (route.durationSeconds < minDuration) {
        minDuration = route.durationSeconds;
        fastestId = route.id;
      }
      if (route.distanceMeters < minDistance) {
        minDistance = route.distanceMeters;
        shortestId = route.id;
      }
      if (analysis.overallScore > maxScore) {
        maxScore = analysis.overallScore;
        safestId = route.id;
      }
    }

    // Attach tags
    for (const route of routes) {
      const analysis = result[route.id];
      if (analysis) {
        analysis.tags = {
          isFastest: route.id === fastestId,
          isShortest: route.id === shortestId,
          isSafest: route.id === safestId,
        };
      }
    }

    return result;
  }
}

// Global service singleton
export const weatherRiskService = new WeatherRiskService();
