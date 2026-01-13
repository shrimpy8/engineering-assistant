/**
 * API Types - Stripe-style API response shapes
 * Based on PRD v1.4 Section 6.3
 */

import type { ErrorCode, ErrorType } from '@/lib/errors/codes';

/**
 * Response metadata included in all API responses
 */
export interface ResponseMeta {
  request_id: string;
  timestamp: string;
  duration_ms?: number;
}

/**
 * Successful API response wrapper
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

/**
 * Error detail for validation errors
 */
export interface ErrorDetail {
  field: string;
  code: string;
  message: string;
}

/**
 * API error structure
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  type: ErrorType;
  param?: string;
  details?: ErrorDetail[];
  doc_url?: string;
}

/**
 * Error API response wrapper
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  meta: ResponseMeta;
}

/**
 * Union type for any API response
 */
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

/**
 * Health check response data
 */
export interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  services: {
    ollama: ServiceStatus;
    mcp_server: ServiceStatus;
  };
}

export interface ServiceStatus {
  status: 'connected' | 'disconnected' | 'error';
  latency_ms?: number;
  error?: string;
}

/**
 * Model information
 */
export interface Model {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
}

/**
 * Models list response data
 */
export interface ModelsData {
  models: Model[];
}

/**
 * File entry information
 */
export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified_at?: string;
}

/**
 * List files response data
 */
export interface ListFilesData {
  path: string;
  entries: FileEntry[];
}

/**
 * Read file response data
 */
export interface ReadFileData {
  path: string;
  content: string;
  size: number;
  modified_at: string;
  encoding?: string;
  truncated?: boolean;
}
