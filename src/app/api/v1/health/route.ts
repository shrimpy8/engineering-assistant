/**
 * Health Check API Endpoint
 *
 * GET /api/v1/health
 *
 * Returns health status of all system components.
 * Based on PRD v1.4 Section 6.4.2
 */

import { NextRequest } from 'next/server';
import { OllamaClient } from '@/lib/ollama/client';
import { config } from '@/lib/config';
import { createResponseContext, successResponse } from '@/lib/api';
import { logRequestStart, logRequestEnd, logRequestError } from '@/lib/api/logging';
import type { HealthData, ServiceStatus } from '@/types/api';

/**
 * GET /api/v1/health
 *
 * Returns health status of all system components including Ollama and MCP server.
 *
 * @param request - Next.js request object
 * @returns Stripe-style response with health status
 *
 * @example
 * // Response when healthy:
 * {
 *   "success": true,
 *   "data": {
 *     "status": "healthy",
 *     "version": "0.1.0",
 *     "services": {
 *       "ollama": { "status": "connected", "latency_ms": 15 },
 *       "mcp_server": { "status": "connected", "latency_ms": 1 }
 *     }
 *   },
 *   "meta": { "request_id": "req_...", "timestamp": "..." }
 * }
 */
export async function GET(request: NextRequest) {
  const ctx = createResponseContext(request.headers);
  logRequestStart(ctx, request);

  const healthData: HealthData = {
    status: 'healthy',
    version: '0.1.0',
    services: {
      ollama: { status: 'disconnected' },
      mcp_server: { status: 'connected', latency_ms: 0 }, // MCP is local, always available
    },
  };

  // Check Ollama health
  try {
    const ollamaStart = Date.now();
    const ollama = new OllamaClient({ baseUrl: config.ollamaBaseUrl });
    const isHealthy = await ollama.health();

    if (isHealthy) {
      healthData.services.ollama = {
        status: 'connected',
        latency_ms: Date.now() - ollamaStart,
      };
    } else {
      healthData.services.ollama = {
        status: 'disconnected',
        error: 'Ollama server not responding',
      };
      healthData.status = 'degraded';
    }
  } catch (error) {
    healthData.services.ollama = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    healthData.status = 'degraded';
  }

  // Check MCP server health (placeholder - in real implementation would ping MCP)
  // For now, we assume it's available since it's a local process
  healthData.services.mcp_server = {
    status: 'connected',
    latency_ms: 1,
  };

  // Determine overall status
  const services = Object.values(healthData.services);
  const hasErrors = services.some((s) => s.status === 'error');
  const hasDisconnected = services.some((s) => s.status === 'disconnected');

  if (hasErrors) {
    healthData.status = 'unhealthy';
  } else if (hasDisconnected) {
    healthData.status = 'degraded';
  }

  const statusCode = healthData.status === 'healthy' ? 200 : 503;
  const response = successResponse(healthData, ctx, statusCode);
  logRequestEnd(ctx, response.status);
  return response;
}
