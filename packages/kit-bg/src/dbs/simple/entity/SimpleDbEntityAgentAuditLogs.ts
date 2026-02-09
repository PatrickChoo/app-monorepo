/**
 * Agent Audit Logs Entity
 * 
 * Stores audit trail of all agent operations for security and debugging.
 */

import { backgroundMethod } from '@onekeyhq/shared/src/background/backgroundDecorators';

import { SimpleDbEntityBase } from '../base/SimpleDbEntityBase';

export type TAgentAuditAction =
  | 'derive-account'
  | 'fund-account'
  | 'export-private-key'
  | 'create-authorization'
  | 'revoke-authorization'
  | 'authorization-failed'
  | 'transaction'
  | 'query-balance';

export interface IAgentAuditLog {
  id: string;
  authorizationId: string;
  agentId: string;
  action: TAgentAuditAction;
  details: Record<string, any>;
  timestamp: number;
}

export interface IAgentAuditLogsList {
  logs: IAgentAuditLog[];
}

export class SimpleDbEntityAgentAuditLogs extends SimpleDbEntityBase<IAgentAuditLogsList> {
  entityName = 'agentAuditLogs';

  override enableCache = false;

  @backgroundMethod()
  async addLog(log: IAgentAuditLog): Promise<void> {
    const data = await this.getRawData();
    const logs = data?.logs ?? [];

    // Add to front
    logs.unshift(log);

    // Keep only last 1000 logs
    if (logs.length > 1000) {
      logs.splice(1000);
    }

    await this.setRawData({ logs });
  }

  @backgroundMethod()
  async getLogsByAuthorization(
    authorizationId: string,
  ): Promise<IAgentAuditLog[]> {
    const data = await this.getRawData();
    const logs = data?.logs ?? [];

    return logs.filter((log) => log.authorizationId === authorizationId);
  }

  @backgroundMethod()
  async getLogsByAgent(agentId: string): Promise<IAgentAuditLog[]> {
    const data = await this.getRawData();
    const logs = data?.logs ?? [];

    return logs.filter((log) => log.agentId === agentId);
  }

  @backgroundMethod()
  async getAllLogs(): Promise<IAgentAuditLog[]> {
    const data = await this.getRawData();
    return data?.logs ?? [];
  }

  @backgroundMethod()
  async getRecentLogs(limit: number): Promise<IAgentAuditLog[]> {
    const data = await this.getRawData();
    const logs = data?.logs ?? [];

    return logs.slice(0, limit);
  }

  @backgroundMethod()
  async cleanupLogsOlderThan(timestamp: number): Promise<number> {
    const data = await this.getRawData();
    const logs = data?.logs ?? [];

    const before = logs.length;
    const newLogs = logs.filter((log) => log.timestamp >= timestamp);
    const after = newLogs.length;

    if (before !== after) {
      await this.setRawData({ logs: newLogs });
    }

    return before - after;
  }
}
