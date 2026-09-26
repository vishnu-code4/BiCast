// ============================================================
// BiCAST Express App — middleware and route setup
// ============================================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/errorHandler';

const app = express();

// ---- Security -------------------------------------------------
app.use(helmet());

// ---- CORS -----------------------------------------------------
const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// ---- Rate limiting -------------------------------------------
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ---- Body parsing --------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Logging -------------------------------------------------
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ---- Routes --------------------------------------------------
app.use('/api', router);

// ---- 404 / Error handlers ------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
