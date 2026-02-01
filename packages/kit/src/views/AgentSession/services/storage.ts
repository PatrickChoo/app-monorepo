/**
 * Storage Service - Agent Authorization Persistence
 * 
 * This service wraps SimpleDB Entity methods for Agent Session use.
 */

import simpleDb from '@onekeyhq/kit-bg/src/dbs/simple/simpleDb';

import type { IAgentAuthorization } from '../types';

/**
 * Add a new authorization
 */
export async function addAuthorization(
  authorization: IAgentAuthorization,
): Promise<void> {
  await simpleDb.agentAuthorizations.addAuthorization(authorization);
}

/**
 * Get authorization by ID
 */
export async function getAuthorizationById(
  id: string,
): Promise<IAgentAuthorization | null> {
  return simpleDb.agentAuthorizations.getAuthorizationById(id);
}

/**
 * Update authorization
 */
export async function updateAuthorization(
  id: string,
  updates: Partial<IAgentAuthorization>,
): Promise<void> {
  await simpleDb.agentAuthorizations.updateAuthorization(id, updates);
}

/**
 * Get all authorizations
 */
export async function getAllAuthorizations(): Promise<IAgentAuthorization[]> {
  return simpleDb.agentAuthorizations.getAllAuthorizations();
}

/**
 * Get active authorizations
 */
export async function getActiveAuthorizations(): Promise<
  IAgentAuthorization[]
> {
  return simpleDb.agentAuthorizations.getActiveAuthorizations();
}

/**
 * Get authorizations by agent ID
 */
export async function getAuthorizationsByAgent(
  agentId: string,
): Promise<IAgentAuthorization[]> {
  return simpleDb.agentAuthorizations.getAuthorizationsByAgent(agentId);
}

/**
 * Revoke authorization
 */
export async function revokeAuthorization(id: string): Promise<void> {
  await simpleDb.agentAuthorizations.revokeAuthorization(id);
}

/**
 * Delete authorization
 */
export async function deleteAuthorization(id: string): Promise<void> {
  await simpleDb.agentAuthorizations.deleteAuthorization(id);
}

/**
 * Clean up expired authorizations
 */
export async function cleanupExpiredAuthorizations(): Promise<number> {
  return simpleDb.agentAuthorizations.cleanupExpiredAuthorizations();
}
