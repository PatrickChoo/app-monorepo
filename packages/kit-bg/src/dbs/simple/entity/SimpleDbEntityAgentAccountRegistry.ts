/**
 * Agent Account Registry Entity
 * 
 * Tracks which accounts are used by agents, their status, and metadata.
 * Used to mark accounts in account list and prevent duplicate assignments.
 */

import { backgroundMethod } from '@onekeyhq/shared/src/background/backgroundDecorators';

import { SimpleDbEntityBase } from '../base/SimpleDbEntityBase';

export interface IAgentAccountRegistryItem {
  // Account info
  accountId: string; // OneKey account ID
  address: string; // Account address
  derivationIndex: number; // HD derivation index (10,000+)
  derivationPath: string; // Full derivation path
  networkId: string; // Network ID (for chain-specific filtering)

  // Agent info
  agentId: string; // Agent unique ID
  agentName: string; // Agent display name
  authorizationId: string; // Associated authorization ID

  // Status
  privateKeyExported: boolean; // Whether private key was exported
  status: 'active' | 'revoked' | 'one-time-used';

  // Metadata
  createdAt: number;
  lastUsedAt: number;
  revokedAt?: number;
}

export interface IAgentAccountRegistryList {
  accounts: IAgentAccountRegistryItem[];
}

export class SimpleDbEntityAgentAccountRegistry extends SimpleDbEntityBase<IAgentAccountRegistryList> {
  entityName = 'agentAccountRegistry';

  override enableCache = false;

  @backgroundMethod()
  async add(account: IAgentAccountRegistryItem): Promise<void> {
    const data = await this.getRawData();
    const accounts = data?.accounts ?? [];

    // Check if already exists
    if (accounts.find((a) => a.accountId === account.accountId)) {
      console.warn(
        '[AgentRegistry] Account already exists:',
        account.accountId,
      );
      return;
    }

    // Add to front
    accounts.unshift(account);

    await this.setRawData({ accounts });
  }

  @backgroundMethod()
  async getByAccountId(
    accountId: string,
  ): Promise<IAgentAccountRegistryItem | null> {
    const data = await this.getRawData();
    const accounts = data?.accounts ?? [];

    return accounts.find((a) => a.accountId === accountId) ?? null;
  }

  @backgroundMethod()
  async getByAgentAndChain(
    agentId: string,
    networkId: string,
  ): Promise<IAgentAccountRegistryItem | null> {
    const data = await this.getRawData();
    const accounts = data?.accounts ?? [];

    return (
      accounts.find(
        (a) => a.agentId === agentId && a.networkId === networkId,
      ) ?? null
    );
  }

  @backgroundMethod()
  async getAccountsByNetwork(
    networkId: string,
  ): Promise<IAgentAccountRegistryItem[]> {
    const data = await this.getRawData();
    const accounts = data?.accounts ?? [];

    return accounts.filter((a) => a.networkId === networkId);
  }

  @backgroundMethod()
  async getAccountsByAgent(
    agentId: string,
  ): Promise<IAgentAccountRegistryItem[]> {
    const data = await this.getRawData();
    const accounts = data?.accounts ?? [];

    return accounts.filter((a) => a.agentId === agentId);
  }

  @backgroundMethod()
  async getAll(): Promise<IAgentAccountRegistryItem[]> {
    const data = await this.getRawData();
    return data?.accounts ?? [];
  }

  @backgroundMethod()
  async updateStatus(
    accountId: string,
    status: IAgentAccountRegistryItem['status'],
  ): Promise<void> {
    const data = await this.getRawData();
    const accounts = data?.accounts ?? [];

    const index = accounts.findIndex((a) => a.accountId === accountId);

    if (index === -1) {
      throw new Error(`Agent account not found: ${accountId}`);
    }

    accounts[index] = {
      ...accounts[index],
      status,
    };

    await this.setRawData({ accounts });
  }

  @backgroundMethod()
  async setLastUsedAt(accountId: string, timestamp: number): Promise<void> {
    const data = await this.getRawData();
    const accounts = data?.accounts ?? [];

    const index = accounts.findIndex((a) => a.accountId === accountId);

    if (index === -1) {
      throw new Error(`Agent account not found: ${accountId}`);
    }

    accounts[index] = {
      ...accounts[index],
      lastUsedAt: timestamp,
    };

    await this.setRawData({ accounts });
  }

  @backgroundMethod()
  async setRevokedAt(accountId: string, timestamp: number): Promise<void> {
    const data = await this.getRawData();
    const accounts = data?.accounts ?? [];

    const index = accounts.findIndex((a) => a.accountId === accountId);

    if (index === -1) {
      throw new Error(`Agent account not found: ${accountId}`);
    }

    accounts[index] = {
      ...accounts[index],
      revokedAt: timestamp,
    };

    await this.setRawData({ accounts });
  }

  @backgroundMethod()
  async updateAuthorizationId(
    accountId: string,
    authorizationId: string,
  ): Promise<void> {
    const data = await this.getRawData();
    const accounts = data?.accounts ?? [];

    const index = accounts.findIndex((a) => a.accountId === accountId);

    if (index === -1) {
      throw new Error(`Agent account not found: ${accountId}`);
    }

    accounts[index] = {
      ...accounts[index],
      authorizationId,
    };

    await this.setRawData({ accounts });
  }

  @backgroundMethod()
  async remove(accountId: string): Promise<void> {
    const data = await this.getRawData();
    const accounts = data?.accounts ?? [];

    const newAccounts = accounts.filter((a) => a.accountId !== accountId);

    await this.setRawData({ accounts: newAccounts });
  }

  @backgroundMethod()
  async getNextDerivationIndex(networkId: string): Promise<number> {
    const accounts = await this.getAccountsByNetwork(networkId);

    if (accounts.length === 0) {
      return 10000; // Start from 10,000
    }

    // Find max index and increment
    const maxIndex = Math.max(...accounts.map((a) => a.derivationIndex));
    return maxIndex + 1;
  }
}
