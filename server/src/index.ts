// ============================================================
// BiCAST Server Entry Point
// ============================================================
import 'dotenv/config';
import app from './app';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

const server = app.listen(PORT, () => {
  logger.info(`🚀 BiCAST API server running on http://localhost:${PORT}`);
  logger.info(`   Environment : ${process.env.NODE_ENV ?? 'development'}`);
  logger.info(`   Routing     : ${process.env.ROUTING_PROVIDER ?? 'osrm'}`);
  logger.info(`   Weather     : ${process.env.WEATHER_PROVIDER ?? 'openmeteo'}`);
  logger.info(`   Geocoding   : ${process.env.GEOCODING_PROVIDER ?? 'nominatim'}`);
  logger.info(`   Places      : ${process.env.PLACES_PROVIDER ?? 'overpass'}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
