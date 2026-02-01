/**
 * Authorization Bridge
 * 
 * Connects the Skill execution logic with the UI Modal
 * This module manages the communication between background execution and UI confirmation
 */

import type { IAgentAuthorizationRequest, EAgentAuthorizationMode } from '../types';

type AuthorizationResolver = {
  confirmed: boolean;
  selectedMode?: EAgentAuthorizationMode;
  useBiometric?: boolean;
};

// Global state to store pending authorization requests
// This will be accessed by both the Modal and the Skill execution
let pendingRequestResolver: ((value: AuthorizationResolver) => void) | null = null;

/**
 * Request authorization from UI
 * 
 * This is called by the Skill execution logic to trigger the modal.
 * It returns a Promise that will be resolved when the user confirms/rejects.
 * 
 * @param request - Authorization request parameters
 * @returns Promise that resolves with user's decision
 */
export async function requestAuthorizationFromUI(
  request: IAgentAuthorizationRequest,
): Promise<AuthorizationResolver> {
  // Get atoms - use dynamic import to avoid circular dependency
  const { setPendingAuthorizationRequestAtom } = await import('../states/atomSetters');

  return new Promise<AuthorizationResolver>((resolve) => {
    // Store the resolver globally
    pendingRequestResolver = resolve;

    // Set the pending request in the atom (this triggers the Modal to show)
    setPendingAuthorizationRequestAtom(request);

    // The Promise will be resolved when:
    // - User confirms → confirmAuthorizationFromUI() is called
    // - User rejects → rejectAuthorizationFromUI() is called
    // - Timeout (optional) → TODO: Add timeout logic
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

    // Clear resolver
    pendingRequestResolver = null;
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

    // Clear resolver
    pendingRequestResolver = null;
  }
}
