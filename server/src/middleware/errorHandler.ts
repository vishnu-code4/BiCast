// ============================================================
// Error Handling Middleware
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error(`${req.method} ${req.path} — ${err.message}`, {
    stack: err.stack,
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code ?? 'APP_ERROR',
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors,
      },
    });
    return;
  }

  // Axios/unhandled upstream provider errors
  if ('isAxiosError' in err || ('response' in err && (err as { response?: { status?: number } }).response)) {
    const axiosErr = err as { response?: { status?: number } };
    const status = axiosErr.response?.status ?? 502;
    res.status(status >= 400 && status < 600 ? status : 502).json({
      error: {
        code: 'PROVIDER_ERROR',
        message: 'External provider request failed',
        status,
      },
    });
    return;
  }

  // Generic internal error
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An internal error occurred'
          : err.message,
    },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
