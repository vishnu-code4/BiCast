// ============================================================
// Routing Service — wraps routing provider
// ============================================================
import { routingProvider } from '../providers';
import {
  RoutingRequest,
  RoutingResponse,
} from '../providers/interfaces/RoutingProvider';
import { logger } from '../utils/logger';

export async function getRoutes(request: RoutingRequest): Promise<RoutingResponse> {
  logger.info(
    `Routing: (${request.origin.lat}, ${request.origin.lng}) -> (${request.destination.lat}, ${request.destination.lng})`,
  );
  return routingProvider.getRoutes(request);
}
