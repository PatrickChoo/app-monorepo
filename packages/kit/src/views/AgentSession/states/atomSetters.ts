/**
 * Atom Setters
 * 
 * Utility functions to set atom values from outside React components
 * This avoids circular dependencies and allows non-React code to update state
 */

import type { IAgentAuthorizationRequest } from '../types';

// Store reference to the atom setter function
let pendingRequestSetter: ((value: IAgentAuthorizationRequest | null) => void) | null = null;

/**
 * Register the pending request setter
 * This is called from the Provider on mount
 */
export function registerPendingRequestSetter(
  setter: (value: IAgentAuthorizationRequest | null) => void,
): void {
  pendingRequestSetter = setter;
}

/**
 * Set pending authorization request
 * This can be called from anywhere to trigger the modal
 */
export function setPendingAuthorizationRequestAtom(
  request: IAgentAuthorizationRequest | null,
): void {
  if (pendingRequestSetter) {
    pendingRequestSetter(request);
  } else {
    console.warn('[AgentSession] pendingRequestSetter not registered');
  }
}
