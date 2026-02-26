/**
 * Authorization Bridge
 *
 * Connects the Skill execution logic with the UI Modal.
 * This module manages the communication between background execution and UI confirmation.
 *
 * Guarantees:
 * - Only one pending request at a time (new request rejects previous)
 * - Requests time out after AUTHORIZATION_TIMEOUT_MS
 */

import type { IAgentAuthorizationRequest, EAgentAuthorizationMode } from '../types';

type AuthorizationResolver = {
  confirmed: boolean;
  selectedMode?: EAgentAuthorizationMode;
  useBiometric?: boolean;
};

// Timeout for user to respond to authorization modal (5 minutes)
const AUTHORIZATION_TIMEOUT_MS = 5 * 60 * 1000;

// Global state to store pending authorization requests
let pendingRequestResolver: ((value: AuthorizationResolver) => void) | null = null;
let pendingTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Clean up any pending request state
 */
function cleanupPendingRequest(): void {
  if (pendingTimeoutId) {
    clearTimeout(pendingTimeoutId);
    pendingTimeoutId = null;
  }
  pendingRequestResolver = null;
}

/**
 * Request authorization from UI
 *
 * This is called by the Skill execution logic to trigger the modal.
 * It returns a Promise that will be resolved when the user confirms/rejects.
 *
 * If there is already a pending request, it will be rejected before
 * creating the new one (prevents orphaned Promises).
 *
 * @param request - Authorization request parameters
 * @returns Promise that resolves with user's decision
 */
export async function requestAuthorizationFromUI(
  request: IAgentAuthorizationRequest,
): Promise<AuthorizationResolver> {
  // Reject any existing pending request to prevent orphaned Promises
  if (pendingRequestResolver) {
    pendingRequestResolver({ confirmed: false });
    cleanupPendingRequest();
  }

  // Get atoms - use dynamic import to avoid circular dependency
  const { setPendingAuthorizationRequestAtom } = await import('../states/atomSetters');

  return new Promise<AuthorizationResolver>((resolve) => {
    // Store the resolver globally
    pendingRequestResolver = resolve;

    // Set timeout to auto-reject if user doesn't respond
    pendingTimeoutId = setTimeout(() => {
      if (pendingRequestResolver === resolve) {
        console.warn('[AuthorizationBridge] Request timed out');
        resolve({ confirmed: false });
        cleanupPendingRequest();

        // Clear the modal
        void import('../states/atomSetters').then(({ setPendingAuthorizationRequestAtom: setter }) => {
          setter(null);
        });
      }
    }, AUTHORIZATION_TIMEOUT_MS);

    // Set the pending request in the atom (this triggers the Modal to show)
    setPendingAuthorizationRequestAtom(request);
  });
}

/**
 * Confirm authorization from UI
 *
 * This is called by the Modal when user confirms.
 */
export function confirmAuthorizationFromUI(params: {
  useBiometric: boolean;
  selectedMode: EAgentAuthorizationMode;
}): void {
  if (pendingRequestResolver) {
    pendingRequestResolver({
      confirmed: true,
      selectedMode: params.selectedMode,
      useBiometric: params.useBiometric,
    });
    cleanupPendingRequest();
  }
}

/**
 * Reject authorization from UI
 *
 * This is called by the Modal when user rejects.
 */
export function rejectAuthorizationFromUI(): void {
  if (pendingRequestResolver) {
    pendingRequestResolver({
      confirmed: false,
    });
    cleanupPendingRequest();
  }
}
