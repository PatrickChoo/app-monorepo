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

// ============================================================================
// Audit Log Functions
// ============================================================================

export interface IAuditLog {
  id: string;
  authorizationId: string;
  agentId: string;
  action: 
    | 'derive-account'
    | 'fund-account'
    | 'export-private-key'
    | 'create-authorization'
    | 'revoke-authorization'
    | 'authorization-failed'
    | 'transaction'
    | 'query-balance';
  details: Record<string, any>;
  timestamp: number;
}

/**
 * Add audit log entry
 */
export async function addAuditLog(log: Omit<IAuditLog, 'id'>): Promise<void> {
  const logEntry: IAuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ...log,
  };
  
  await simpleDb.agentAuditLogs.addLog(logEntry);
}

/**
 * Get audit logs by authorization ID
 */
export async function getAuditLogsByAuthorization(
  authorizationId: string,
): Promise<IAuditLog[]> {
  return simpleDb.agentAuditLogs.getLogsByAuthorization(authorizationId);
}

/**
 * Get audit logs by agent ID
 */
export async function getAuditLogsByAgent(
  agentId: string,
): Promise<IAuditLog[]> {
  return simpleDb.agentAuditLogs.getLogsByAgent(agentId);
}

/**
 * Get all audit logs
 */
export async function getAllAuditLogs(): Promise<IAuditLog[]> {
  return simpleDb.agentAuditLogs.getAllLogs();
}

/**
 * Get recent audit logs (last N entries)
 */
export async function getRecentAuditLogs(limit: number = 50): Promise<IAuditLog[]> {
  return simpleDb.agentAuditLogs.getRecentLogs(limit);
}

/**
 * Clean up old audit logs (older than N days)
 */
export async function cleanupOldAuditLogs(days: number = 90): Promise<number> {
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
  return simpleDb.agentAuditLogs.cleanupLogsOlderThan(cutoffTime);
}
