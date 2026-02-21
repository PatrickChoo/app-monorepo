/**
 * Network retry utilities for Agent Session
 * 
 * Provides exponential backoff retry for network operations
 */

import type { FailedAttemptError } from 'p-retry';
import pRetry from 'p-retry';

/**
 * Check if error is a network error (should retry)
 */
function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const errorString = String(error).toLowerCase();
  const errorMessage =
    error instanceof Error ? error.message.toLowerCase() : errorString;

  // Network-related errors
  const networkKeywords = [
    'network',
    'timeout',
    'econnrefused',
    'enotfound',
    'econnreset',
    'etimedout',
    'socket',
    'fetch failed',
    'failed to fetch',
    'offline',
    'connection',
  ];

  return networkKeywords.some((keyword) => errorMessage.includes(keyword));
}

/**
 * Check if error is a validation error (should NOT retry)
 */
function isValidationError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // Business logic / validation errors
  const validationKeywords = [
    'insufficient',
    'invalid',
    'not found',
    'already exists',
    'denied',
    'unauthorized',
    'forbidden',
  ];

  return validationKeywords.some((keyword) => errorMessage.includes(keyword));
}

/**
 * Retry a network operation with exponential backoff
 * 
 * Retries only on network errors, not on validation errors.
 * 
 * @param fn - Async function to retry
 * @param options - Retry options
 * @returns Result of the function
 */
export async function retryNetworkOperation<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    minTimeout?: number; // ms
    onRetry?: (error: FailedAttemptError) => void;
  },
): Promise<T> {
  const {
    maxRetries = 3,
    minTimeout = 1000, // 1s
    onRetry,
  } = options || {};

  return pRetry(fn, {
    retries: maxRetries,
    minTimeout,
    factor: 2, // Exponential backoff: 1s, 2s, 4s
    onFailedAttempt: (error) => {
      // Only retry on network errors
      if (!isNetworkError(error)) {
        console.log('[Retry] Not a network error, will not retry:', error.message);
        throw error; // Abort retry
      }

      // Don't retry validation errors
      if (isValidationError(error)) {
        console.log('[Retry] Validation error, will not retry:', error.message);
        throw error; // Abort retry
      }

      console.log('[Retry] Network error, retrying...', {
        attempt: error.attemptNumber,
        retriesLeft: error.retriesLeft,
        error: error.message,
      });

      onRetry?.(error);
    },
  });
}

/**
 * Retry wrapper for balance queries
 */
export async function retryBalanceQuery<T>(fn: () => Promise<T>): Promise<T> {
  return retryNetworkOperation(fn, {
    maxRetries: 3,
    minTimeout: 1000,
    onRetry: (error) => {
      console.log('[BalanceQuery] Retrying after network error:', error.message);
    },
  });
}

/**
 * Retry wrapper for transaction building
 */
export async function retryBuildTransaction<T>(fn: () => Promise<T>): Promise<T> {
  return retryNetworkOperation(fn, {
    maxRetries: 2, // Build tx is usually fast, 2 retries enough
    minTimeout: 1000,
    onRetry: (error) => {
      console.log('[BuildTx] Retrying after network error:', error.message);
    },
  });
}

/**
 * Retry wrapper for fee validation
 */
export async function retryFeeValidation<T>(fn: () => Promise<T>): Promise<T> {
  return retryNetworkOperation(fn, {
    maxRetries: 3,
    minTimeout: 1000,
    onRetry: (error) => {
      console.log('[FeeValidation] Retrying after network error:', error.message);
    },
  });
}
