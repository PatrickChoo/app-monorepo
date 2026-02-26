/**
 * Storage Service - Agent Authorization Persistence
 * 
 * This service wraps SimpleDB Entity methods for Agent Session use.
 */

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';

import type { IAgentAuthorization } from '../types';

/**
 * Add a new authorization
 */
export async function addAuthorization(
  authorization: IAgentAuthorization,
): Promise<void> {
  await backgroundApiProxy.simpleDb.agentAuthorizations.addAuthorization(authorization);
}

/**
 * Get authorization by ID
 */
export async function getAuthorizationById(
  id: string,
): Promise<IAgentAuthorization | null> {
  return backgroundApiProxy.simpleDb.agentAuthorizations.getAuthorizationById(id);
}

/**
 * Update authorization
 */
export async function updateAuthorization(
  id: string,
  updates: Partial<IAgentAuthorization>,
): Promise<void> {
  await backgroundApiProxy.simpleDb.agentAuthorizations.updateAuthorization(id, updates);
}

/**
 * Get all authorizations
 */
export async function getAllAuthorizations(): Promise<IAgentAuthorization[]> {
  return backgroundApiProxy.simpleDb.agentAuthorizations.getAllAuthorizations();
}

/**
 * Get active authorizations
 */
export async function getActiveAuthorizations(): Promise<
  IAgentAuthorization[]
> {
  return backgroundApiProxy.simpleDb.agentAuthorizations.getActiveAuthorizations();
}

/**
 * Get authorizations by agent ID
 */
export async function getAuthorizationsByAgent(
  agentId: string,
): Promise<IAgentAuthorization[]> {
  return backgroundApiProxy.simpleDb.agentAuthorizations.getAuthorizationsByAgent(agentId);
}

/**
 * Revoke authorization
 */
export async function revokeAuthorization(id: string): Promise<void> {
  await backgroundApiProxy.simpleDb.agentAuthorizations.revokeAuthorization(id);
}

/**
 * Delete authorization
 */
export async function deleteAuthorization(id: string): Promise<void> {
  await backgroundApiProxy.simpleDb.agentAuthorizations.deleteAuthorization(id);
}

/**
 * Clean up expired authorizations
 */
export async function cleanupExpiredAuthorizations(): Promise<number> {
  return backgroundApiProxy.simpleDb.agentAuthorizations.cleanupExpiredAuthorizations();
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
 * 
 * Only adds log if audit logging is enabled in settings
 */
export async function addAuditLog(log: Omit<IAuditLog, 'id'>): Promise<void> {
  // Check if audit logging is enabled
  const { isAuditLoggingEnabled } = await import('./settings');
  const enabled = await isAuditLoggingEnabled();
  
  if (!enabled) {
    console.log('[AuditLog] Skipped (logging disabled):', log.action);
    return;
  }
  
  const logEntry: IAuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ...log,
  };
  
  await backgroundApiProxy.simpleDb.agentAuditLogs.addLog(logEntry);
  console.log('[AuditLog] Added:', log.action);
}

/**
 * Get audit logs by authorization ID
 */
export async function getAuditLogsByAuthorization(
  authorizationId: string,
): Promise<IAuditLog[]> {
  return backgroundApiProxy.simpleDb.agentAuditLogs.getLogsByAuthorization(authorizationId);
}

/**
 * Get audit logs by agent ID
 */
export async function getAuditLogsByAgent(
  agentId: string,
): Promise<IAuditLog[]> {
  return backgroundApiProxy.simpleDb.agentAuditLogs.getLogsByAgent(agentId);
}

/**
 * Get all audit logs
 */
export async function getAllAuditLogs(): Promise<IAuditLog[]> {
  return backgroundApiProxy.simpleDb.agentAuditLogs.getAllLogs();
}

/**
 * Get recent audit logs (last N entries)
 */
export async function getRecentAuditLogs(limit: number = 50): Promise<IAuditLog[]> {
  return backgroundApiProxy.simpleDb.agentAuditLogs.getRecentLogs(limit);
}

/**
 * Clean up old audit logs (older than N days)
 */
export async function cleanupOldAuditLogs(days: number = 90): Promise<number> {
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
  return backgroundApiProxy.simpleDb.agentAuditLogs.cleanupLogsOlderThan(cutoffTime);
}
