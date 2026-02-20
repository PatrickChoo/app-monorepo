/**
 * ServiceAgentSession
 * 
 * Background service for Agent Session management
 * Handles authorization CRUD, balance queries, and audit logging
 */

import {
  backgroundClass,
  backgroundMethod,
} from '@onekeyhq/shared/src/background/backgroundDecorators';

import simpleDb from '../dbs/simple/simpleDb';
import ServiceBase from './ServiceBase';

import type { IServiceBaseProps } from './ServiceBase';
import type {
  IAgentAuthorization,
  IAgentAuditLog,
} from '../dbs/simple/entity/SimpleDbEntityAgentAuthorizations';

@backgroundClass()
export default class ServiceAgentSession extends ServiceBase {
  constructor(props: IServiceBaseProps) {
    super(props);
  }

  /**
   * Get all authorizations for a wallet
   */
  @backgroundMethod()
  async getAuthorizationsByWallet(
    walletId: string,
  ): Promise<IAgentAuthorization[]> {
    try {
      const data = await simpleDb.agentAuthorizations.getRawData();
      const authorizations = data?.authorizations || [];

      // Filter by wallet ID and status
      return authorizations.filter(
        (auth) =>
          auth.sourceWalletId === walletId &&
          (auth.status === 'Active' || auth.status === 'Paused'),
      );
    } catch (error) {
      console.error('[ServiceAgentSession] Failed to get authorizations:', error);
      return [];
    }
  }

  /**
   * Get a single authorization by ID
   */
  @backgroundMethod()
  async getAuthorization(
    authorizationId: string,
  ): Promise<IAgentAuthorization | null> {
    try {
      const data = await simpleDb.agentAuthorizations.getRawData();
      const authorizations = data?.authorizations || [];

      return (
        authorizations.find((auth) => auth.id === authorizationId) || null
      );
    } catch (error) {
      console.error('[ServiceAgentSession] Failed to get authorization:', error);
      return null;
    }
  }

  /**
   * Get all active authorizations (across all wallets)
   */
  @backgroundMethod()
  async getActiveAuthorizations(): Promise<IAgentAuthorization[]> {
    try {
      const data = await simpleDb.agentAuthorizations.getRawData();
      const authorizations = data?.authorizations || [];

      return authorizations.filter((auth) => auth.status === 'Active');
    } catch (error) {
      console.error('[ServiceAgentSession] Failed to get active authorizations:', error);
      return [];
    }
  }

  /**
   * Get authorization history (all statuses)
   */
  @backgroundMethod()
  async getAuthorizationHistory(): Promise<IAgentAuthorization[]> {
    try {
      const data = await simpleDb.agentAuthorizations.getRawData();
      return data?.authorizations || [];
    } catch (error) {
      console.error('[ServiceAgentSession] Failed to get authorization history:', error);
      return [];
    }
  }

  /**
   * Get audit logs for an authorization
   */
  @backgroundMethod()
  async getAuditLogs(authorizationId: string): Promise<IAgentAuditLog[]> {
    try {
      const data = await simpleDb.agentAuditLogs.getRawData();
      const logs = data?.logs || [];

      return logs.filter((log) => log.authorizationId === authorizationId);
    } catch (error) {
      console.error('[ServiceAgentSession] Failed to get audit logs:', error);
      return [];
    }
  }

  /**
   * Get all audit logs (for a wallet or global)
   */
  @backgroundMethod()
  async getAllAuditLogs(filter?: {
    authorizationId?: string;
    agentId?: string;
    action?: string;
  }): Promise<IAgentAuditLog[]> {
    try {
      const data = await simpleDb.agentAuditLogs.getRawData();
      let logs = data?.logs || [];

      // Apply filters
      if (filter) {
        if (filter.authorizationId) {
          logs = logs.filter(
            (log) => log.authorizationId === filter.authorizationId,
          );
        }
        if (filter.agentId) {
          logs = logs.filter((log) => log.agentId === filter.agentId);
        }
        if (filter.action) {
          logs = logs.filter((log) => log.action === filter.action);
        }
      }

      return logs;
    } catch (error) {
      console.error('[ServiceAgentSession] Failed to get all audit logs:', error);
      return [];
    }
  }

  /**
   * Get account balance (wrapper for serviceToken)
   */
  @backgroundMethod()
  async getAgentAccountBalance(params: {
    accountId: string;
    networkId: string;
  }): Promise<{
    balance: string;
    symbol: string;
  }> {
    try {
      const { accountId, networkId } = params;

      // Use serviceToken to get balance
      const balances = await this.backgroundApi.serviceToken.getAccountBalances(
        {
          accountId,
          networkId,
        },
      );

      if (!balances || balances.length === 0) {
        return {
          balance: '0',
          symbol: 'ETH',
        };
      }

      // Return native token balance
      const nativeBalance = balances.find((b) => b.isNative);

      return {
        balance: nativeBalance?.balance || '0',
        symbol: nativeBalance?.symbol || 'ETH',
      };
    } catch (error) {
      console.error('[ServiceAgentSession] Failed to get account balance:', error);
      return {
        balance: '0',
        symbol: 'ETH',
      };
    }
  }

  /**
   * Update authorization status
   */
  @backgroundMethod()
  async updateAuthorizationStatus(
    authorizationId: string,
    status: 'Active' | 'Paused' | 'Revoked' | 'Expired',
  ): Promise<void> {
    try {
      const data = await simpleDb.agentAuthorizations.getRawData();
      const authorizations = data?.authorizations || [];

      const index = authorizations.findIndex(
        (auth) => auth.id === authorizationId,
      );

      if (index === -1) {
        throw new Error(`Authorization not found: ${authorizationId}`);
      }

      // Update status
      authorizations[index] = {
        ...authorizations[index],
        status,
        updatedAt: Date.now(),
      };

      await simpleDb.agentAuthorizations.setRawData({ authorizations });

      console.log('[ServiceAgentSession] Authorization status updated:', {
        authorizationId,
        status,
      });
    } catch (error) {
      console.error('[ServiceAgentSession] Failed to update authorization status:', error);
      throw error;
    }
  }

  /**
   * Revoke an authorization
   */
  @backgroundMethod()
  async revokeAuthorization(authorizationId: string): Promise<void> {
    try {
      await this.updateAuthorizationStatus(authorizationId, 'Revoked');

      // Add audit log
      const authorization = await this.getAuthorization(authorizationId);
      if (authorization) {
        const logData = await simpleDb.agentAuditLogs.getRawData();
        const logs = logData?.logs || [];

        logs.unshift({
          authorizationId,
          agentId: authorization.agentId,
          action: 'revoke-authorization',
          details: {
            revokedBy: 'user',
            previousStatus: authorization.status,
          },
          timestamp: Date.now(),
        });

        await simpleDb.agentAuditLogs.setRawData({ logs });
      }

      console.log('[ServiceAgentSession] Authorization revoked:', authorizationId);
    } catch (error) {
      console.error('[ServiceAgentSession] Failed to revoke authorization:', error);
      throw error;
    }
  }
}
