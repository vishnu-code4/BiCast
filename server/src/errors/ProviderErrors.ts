// ============================================================
// BiCAST Provider Error Subsystem
// Sanitizes sensitive credentials and standardizes error codes
// ============================================================
import { AppError } from '../middleware/errorHandler';

/**
 * Strips API keys and tokens from strings (URLs, error messages)
 */
export function sanitizeCredentials(text: string): string {
  if (!text) return text;
  return text
    .replace(/([?&](?:key|apikey|api_key|token)=)[^&]+/gi, '$1[REDACTED]')
    .replace(/(x-goog-api-key:\s*)[^\s]+/gi, '$1[REDACTED]')
    .replace(/(bearer\s+)[a-zA-Z0-9._-]+/gi, '$1[REDACTED]');
}

export class ProviderError extends AppError {
  constructor(
    public readonly providerName: string,
    message: string,
    public override readonly statusCode: number = 502,
    code: string = 'PROVIDER_ERROR',
    public readonly details?: unknown,
  ) {
    super(statusCode, `[${providerName}] ${sanitizeCredentials(message)}`, code);
    this.name = 'ProviderError';
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(providerName: string, message: string = 'Provider request timed out') {
    super(providerName, message, 504, 'PROVIDER_TIMEOUT');
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(providerName: string, message: string = 'Provider rate limit exceeded') {
    super(providerName, message, 429, 'PROVIDER_RATE_LIMIT');
    this.name = 'ProviderRateLimitError';
  }
}

export class ProviderAuthError extends ProviderError {
  constructor(
    providerName: string,
    message: string = 'Invalid or missing API credentials for provider',
  ) {
    super(providerName, message, 502, 'PROVIDER_AUTH_ERROR');
    this.name = 'ProviderAuthError';
  }
}

export class RouteNotFoundError extends ProviderError {
  constructor(providerName: string, message: string = 'No route could be found between specified locations') {
    super(providerName, message, 404, 'ROUTE_NOT_FOUND');
    this.name = 'RouteNotFoundError';
  }
}

export class PlacesNotFoundError extends ProviderError {
  constructor(providerName: string, message: string = 'No places found matching the specified criteria') {
    super(providerName, message, 404, 'PLACES_NOT_FOUND');
    this.name = 'PlacesNotFoundError';
  }
}

export class ForecastUnavailableError extends ProviderError {
  constructor(providerName: string, message: string = 'Weather forecast is unavailable for the requested location or date') {
    super(providerName, message, 404, 'FORECAST_UNAVAILABLE');
    this.name = 'ForecastUnavailableError';
  }
}

export class InvalidCoordinatesError extends ProviderError {
  constructor(
    providerName: string,
    message: string = 'Provided coordinates are invalid (latitude must be between -90 and 90, longitude between -180 and 180)',
  ) {
    super(providerName, message, 400, 'INVALID_COORDINATES');
    this.name = 'InvalidCoordinatesError';
  }
}

/**
 * Validates coordinate bounds [-90, 90] and [-180, 180]
 */
export function validateCoordinates(lat: number, lng: number, providerName: string = 'BiCAST'): void {
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    isNaN(lat) ||
    isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw new InvalidCoordinatesError(
      providerName,
      `Invalid coordinates: lat=${lat}, lng=${lng}. Latitude must be [-90, 90], longitude must be [-180, 180].`,
    );
  }
}
