import { isMatriqApiError } from '@matriq/api-client';
import type { AppMessageKey } from './translate';

/** Errors that retrying cannot fix. */
const PERMANENT = new Set(['not_configured', 'not_found', 'validation', 'unauthorized', 'forbidden', 'conflict']);

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isMatriqApiError(error) && PERMANENT.has(error.code)) return false;
  return failureCount < 2;
}

/** A calm, translated explanation for an API error. */
export function errorMessageKey(error: unknown): AppMessageKey {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'error.offline';
  if (!isMatriqApiError(error)) return 'common.error';
  switch (error.code) {
    case 'not_configured':
      return 'error.notConfigured';
    case 'not_found':
      return 'error.notFound';
    case 'network':
      return 'error.offline';
    default:
      return 'common.error';
  }
}
