/**
 * Agent Account Registry
 * 
 * Tracks which accounts are used by agents, their status, and metadata.
 * Used to mark accounts in OneKey's account list and prevent duplicate assignments.
 */

import simpleDb from '@onekeyhq/kit-bg/src/dbs/simple/simpleDb';

export interface IAgentAccountRegistry {
  // Account info
  accountId: string;              // OneKey account ID
  address: string;                // Account address
  derivationIndex: number;        // HD derivation index (10,000+)
  derivationPath: string;         // Full derivation path
  networkId: string;              // Network ID (for filtering)
  
  // Agent info
  agentId: string;                // Agent unique ID
  agentName: string;              // Agent display name
  authorizationId: string;        // Associated authorization ID
  
  // Status
  privateKeyExported: boolean;    // Whether private key was exported
  status: 'active' | 'revoked' | 'one-time-used';
  
  // Metadata
  createdAt: number;
  lastUsedAt: number;
  revokedAt?: number;
}

/**
 * Register a new agent account
 */
export async function registerAgentAccount(
  registry: Omit<IAgentAccountRegistry, 'createdAt' | 'lastUsedAt' | 'status'>,
): Promise<void> {
  const record: IAgentAccountRegistry = {
    ...registry,
    status: 'active',
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
  };
  
  await simpleDb.agentAccountRegistry.add(record);
  console.log('[AgentRegistry] Registered:', {
    accountId: record.accountId,
    address: record.address,
    derivationIndex: record.derivationIndex,
    networkId: record.networkId,
    agentName: record.agentName,
  });
}

/**
 * Get agent account by account ID
 */
export async function getAgentAccountByAccountId(
  accountId: string,
): Promise<IAgentAccountRegistry | null> {
  return simpleDb.agentAccountRegistry.getByAccountId(accountId);
}

/**
 * Get agent account by agent ID and network
 */
export async function getAgentAccountByAgent(
  agentId: string,
  networkId: string,
): Promise<IAgentAccountRegistry | null> {
  return simpleDb.agentAccountRegistry.getByAgentAndChain(agentId, networkId);
}

/**
 * Get all agent accounts
 */
export async function getAllAgentAccounts(): Promise<IAgentAccountRegistry[]> {
  return simpleDb.agentAccountRegistry.getAll();
}

/**
 * Update agent account status
 */
export async function updateAgentAccountStatus(
  accountId: string,
  status: IAgentAccountRegistry['status'],
): Promise<void> {
  await simpleDb.agentAccountRegistry.updateStatus(accountId, status);
  
  if (status === 'revoked') {
    await simpleDb.agentAccountRegistry.setRevokedAt(accountId, Date.now());
  }
  
  console.log('[AgentRegistry] Updated status:', accountId, '->', status);
}

/**
 * Update last used time
 */
export async function updateAgentAccountLastUsed(
  accountId: string,
): Promise<void> {
  await simpleDb.agentAccountRegistry.setLastUsedAt(accountId, Date.now());
}

/**
 * Check if account is an agent account
 */
export async function isAgentAccount(
  accountId: string,
): Promise<boolean> {
  const registry = await getAgentAccountByAccountId(accountId);
  return registry !== null;
}

/**
 * Get next available agent derivation index
 * 
 * Uses database to find the highest index and increments it.
 * Ensures no index conflicts.
 */
export async function getNextAgentDerivationIndex(
  networkId: string,
): Promise<number> {
  console.log('[AgentRegistry] Getting next derivation index for:', networkId);
  
  // Use the database method that filters by network
  const nextIndex = await simpleDb.agentAccountRegistry.getNextDerivationIndex(networkId);
  
  console.log('[AgentRegistry] Next index:', nextIndex);
  
  return nextIndex;
}

/**
 * Generate agent account name
 * 
 * Format: "🤖 {AgentName} #{Index} {Status}"
 * 
 * Examples:
 * - "🤖 Trading Bot #10000 🔓"  (private key exported)
 * - "🤖 DeFi Bot #10001 🔒"     (managed)
 * - "🤖 NFT Bot #10002 🗑️"      (revoked)
 */
export function generateAgentAccountName(params: {
  agentName: string;
  derivationIndex: number;
  privateKeyExported: boolean;
  status: IAgentAccountRegistry['status'];
}): string {
  const { agentName, derivationIndex, privateKeyExported, status } = params;
  
  let statusIcon = '';
  if (status === 'revoked') {
    statusIcon = '🗑️';
  } else if (privateKeyExported) {
    statusIcon = '🔓';
  } else {
    statusIcon = '🔒';
  }
  
  return `🤖 ${agentName} #${derivationIndex} ${statusIcon}`;
}

/**
 * Parse agent account name
 * 
 * Extract metadata from account name
 */
export function parseAgentAccountName(
  name: string,
): {
  isAgentAccount: boolean;
  agentName?: string;
  derivationIndex?: number;
  privateKeyExported?: boolean;
  status?: IAgentAccountRegistry['status'];
} {
  // Match pattern: 🤖 {Name} #{Number} {Status}
  const pattern = /^🤖\s+(.+?)\s+#(\d+)\s+(🔓|🔒|🗑️)$/;
  const match = name.match(pattern);
  
  if (!match) {
    return { isAgentAccount: false };
  }
  
  const [, agentName, indexStr, statusIcon] = match;
  const derivationIndex = parseInt(indexStr, 10);
  
  let privateKeyExported = false;
  let status: IAgentAccountRegistry['status'] = 'active';
  
  if (statusIcon === '🗑️') {
    status = 'revoked';
  } else if (statusIcon === '🔓') {
    privateKeyExported = true;
    status = 'active';
  } else if (statusIcon === '🔒') {
    privateKeyExported = false;
    status = 'active';
  }
  
  return {
    isAgentAccount: true,
    agentName,
    derivationIndex,
    privateKeyExported,
    status,
  };
}

/**
 * Get account display info
 * 
 * Enriched account info for UI display
 */
export async function getAccountDisplayInfo(
  accountId: string,
): Promise<{
  isAgentAccount: boolean;
  registry?: IAgentAccountRegistry;
  displayName?: string;
  statusBadges?: Array<{
    icon: string;
    label: string;
    color: string;
  }>;
}> {
  const registry = await getAgentAccountByAccountId(accountId);
  
  if (!registry) {
    return { isAgentAccount: false };
  }
  
  const displayName = generateAgentAccountName({
    agentName: registry.agentName,
    derivationIndex: registry.derivationIndex,
    privateKeyExported: registry.privateKeyExported,
    status: registry.status,
  });
  
  const statusBadges: Array<{
    icon: string;
    label: string;
    color: string;
  }> = [
    {
      icon: '🤖',
      label: 'Agent Account',
      color: '#2196F3',
    },
  ];
  
  if (registry.privateKeyExported) {
    statusBadges.push({
      icon: '⚠️',
      label: 'Private Key Exported',
      color: '#FFC107',
    });
  }
  
  if (registry.status === 'revoked') {
    statusBadges.push({
      icon: '🗑️',
      label: 'Revoked',
      color: '#f44336',
    });
  }
  
  return {
    isAgentAccount: true,
    registry,
    displayName,
    statusBadges,
  };
}
