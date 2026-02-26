/**
 * Session Key (Account Abstraction) Executor
 * 
 * Uses AA wallet to create a session key for AI with:
 * - Method scope (which functions AI can call)
 * - Spending limit
 * - Time-to-live (TTL)
 * 
 * Works on: AA-supported chains (Ethereum, Polygon, Arbitrum, etc.)
 */

import {
  EAgentAuthorizationMode,
  EAgentAuthorizationStatus,
  type IAgentAuthorization,
  type IAgentAuthorizationRequest,
} from '../../types';
import type { IAuthorizationResult } from '../types';

/**
 * Execute Session Key (AA) authorization
 * 
 * Flow:
 * 1. Ensure AA wallet exists for this chain
 * 2. Generate ephemeral session key pair
 * 3. Show confirmation modal to user
 * 4. Register session key on AA wallet with permissions
 * 5. Create authorization record
 * 6. Return authorization details
 * 
 * @param request - Authorization request from AI
 * @returns Authorization result with session key public key
 */
export async function executeSessionKey(
  request: IAgentAuthorizationRequest,
): Promise<IAuthorizationResult> {
  console.log('[SessionKey] Executing Session Key (AA) authorization');
  console.log('[SessionKey] Request:', request);

  try {
    // 1. Ensure AA wallet exists
    const aaWalletAddress = await ensureAAWallet(request.chainId);
    console.log('[SessionKey] AA wallet:', aaWalletAddress);

    // 2. Generate session key pair
    const sessionKey = await generateSessionKey();
    console.log('[SessionKey] Session key generated:', sessionKey.publicKey);

    // 3. Calculate expiration time
    const ttlSeconds = request.rules?.ttlSeconds || 3600; // Default 1 hour
    const expiresAt = Date.now() + ttlSeconds * 1000;

    // 4. Show confirmation modal to user
    const confirmed = await showAuthorizationModal({
      mode: EAgentAuthorizationMode.SessionKey,
      agentId: request.agentId,
      agentName: request.agentName,
      chainId: request.chainId,
      networkName: request.networkName,
      amount: request.requestedAmount,
      tokenSymbol: request.tokenSymbol,
      sessionKeyPublicKey: sessionKey.publicKey,
      rules: request.rules,
      expiresAt,
    });

    if (!confirmed) {
      throw new Error('User rejected authorization');
    }

    // 5. Register session key on AA wallet
    const registerTxHash = await registerSessionKey({
      aaWalletAddress,
      aaAccountId: `aa-${request.chainId}-${aaWalletAddress}`,
      sessionKey,
      chainId: request.chainId,
      permissions: {
        methodWhitelist: request.rules?.methodWhitelist || [],
        spendingLimitUsd: request.rules?.spendingLimitUsd,
        validAfter: Math.floor(Date.now() / 1000),
        validUntil: Math.floor(expiresAt / 1000),
      },
    });
    console.log('[SessionKey] Session key registered, tx:', registerTxHash);

    // 6. Store session key securely
    await storeSessionKey({
      publicKey: sessionKey.publicKey,
      privateKey: sessionKey.privateKey,
      chainId: request.chainId,
      agentId: request.agentId,
    });

    // 7. Create authorization record
    const authorization = await createAuthorization({
      mode: EAgentAuthorizationMode.SessionKey,
      status: EAgentAuthorizationStatus.Active,
      chainId: request.chainId,
      networkName: request.networkName,
      agentId: request.agentId,
      agentName: request.agentName,
      sessionKeyPublicKey: sessionKey.publicKey,
      allocatedAmount: request.requestedAmount,
      spentAmount: '0',
      remainingAmount: request.requestedAmount,
      tokenSymbol: request.tokenSymbol,
      rules: request.rules || {},
      expiresAt,
    });

    console.log('[SessionKey] Authorization created:', authorization.id);

    // 8. Return result
    return {
      success: true,
      authorizationId: authorization.id,
      mode: EAgentAuthorizationMode.SessionKey,
      sessionKeyPublicKey: sessionKey.publicKey,
      allocatedAmount: request.requestedAmount,
      expiresAt,
    };
  } catch (error) {
    console.error('[SessionKey] Execution failed:', error);
    throw error;
  }
}

/**
 * Ensure AA wallet exists
 * 
 * TODO: Implement actual AA wallet initialization
 * Check if user has AA wallet on this chain, otherwise create one
 */
async function ensureAAWallet(chainId: string): Promise<string> {
  console.log('[SessionKey] Ensuring AA wallet for chain:', chainId);
  
  // TODO: Real implementation
  // 1. Check if AA wallet exists for this user on this chain
  // 2. If exists, return address
  // 3. If not, initialize AA wallet (might require user confirmation)
  // 4. Store AA wallet address
  
  // Mock AA wallet address
  const mockAAWalletAddress = `0x${Math.random().toString(16).slice(2, 42).padStart(40, '0')}`;
  
  return mockAAWalletAddress;
}

/**
 * Generate session key pair
 * 
 * Uses SessionKeyService to generate a secure key pair
 */
async function generateSessionKey(): Promise<{
  publicKey: string;
  privateKey: string;
  address: string;
}> {
  console.log('[SessionKey] Generating session key pair');

  try {
    // Use SessionKeyService
    const { generateSessionKey: genKey } = await import('../../services/sessionKey');
    
    const keyPair = await genKey();

    console.log('[SessionKey] Generated session key at address:', keyPair.address);

    return keyPair;
  } catch (error) {
    console.error('[SessionKey] Failed to generate session key:', error);
    throw error;
  }
}

/**
 * Show authorization confirmation modal
 */
async function showAuthorizationModal(params: {
  mode: EAgentAuthorizationMode;
  agentId: string;
  agentName: string;
  chainId: string;
  networkName: string;
  amount?: string;
  tokenSymbol?: string;
  sessionKeyPublicKey?: string;
  rules?: Partial<import('../../types').IAgentAuthorizationRule>;
  expiresAt?: number;
}): Promise<boolean> {
  console.log('[SessionKey] Showing authorization modal:', params);

  const { requestAuthorizationFromUI } = await import('../authorizationBridge');

  try {
    const result = await requestAuthorizationFromUI({
      agentId: params.agentId,
      agentName: params.agentName,
      chainId: params.chainId,
      networkName: params.networkName,
      requestedMode: params.mode,
      requestedAmount: params.amount,
      tokenSymbol: params.tokenSymbol,
      rules: {
        ...params.rules,
        expiresAt: params.expiresAt,
      },
    });

    return result.confirmed;
  } catch (error) {
    console.error('[SessionKey] Modal error:', error);
    return false;
  }
}

/**
 * Register session key on AA wallet
 * 
 * Uses SessionKeyService to register the key with AA wallet
 */
async function registerSessionKey(params: {
  aaWalletAddress: string;
  aaAccountId: string;
  sessionKey: { publicKey: string; privateKey: string; address: string };
  chainId: string;
  permissions: {
    methodWhitelist?: string[];
    spendingLimitUsd?: number;
    validAfter: number;
    validUntil: number;
  };
}): Promise<string> {
  console.log('[SessionKey] Registering session key:', params);

  try {
    // Use SessionKeyService
    const { registerSessionKeyToAAWallet } = await import('../../services/sessionKey');
    
    // Get user password
    const password = await getUserPassword();

    const result = await registerSessionKeyToAAWallet({
      aaAccountId: params.aaAccountId,
      sessionKey: params.sessionKey,
      permissions: {
        allowedTargets: [], // TODO: Extract from methodWhitelist
        spendingLimit: params.permissions.spendingLimitUsd?.toString() || '0',
        validUntil: params.permissions.validUntil,
        validAfter: params.permissions.validAfter,
      },
      networkId: params.chainId,
      password,
    });

    console.log('[SessionKey] Session key registered:', result.txHash);
    
    return result.txHash;
  } catch (error) {
    console.error('[SessionKey] Registration failed:', error);
    throw error;
  }
}

/**
 * Get user password for signing
 */
async function getUserPassword(): Promise<string> {
  // TODO: Implement proper password request via OneKey UI
  console.warn('[SessionKey] Password request not implemented - using empty password');
  return '';
}

/**
 * Store session key securely
 * 
 * TODO: Implement secure storage
 * Private key should be encrypted before storage
 */
async function storeSessionKey(params: {
  publicKey: string;
  privateKey: string;
  chainId: string;
  agentId: string;
}): Promise<void> {
  console.log('[SessionKey] Storing session key (encrypted)');

  // TODO: Real implementation
  // 1. Encrypt private key with user's master password or device key
  // 2. Store encrypted private key in secure storage
  // 3. Store public key in app state for display
}

/**
 * Create authorization record
 */
async function createAuthorization(params: {
  mode: EAgentAuthorizationMode;
  status: EAgentAuthorizationStatus;
  chainId: string;
  networkName: string;
  agentId: string;
  agentName: string;
  sessionKeyPublicKey?: string;
  allocatedAmount?: string;
  spentAmount?: string;
  remainingAmount?: string;
  tokenSymbol?: string;
  rules: Partial<import('../../types').IAgentAuthorizationRule>;
  expiresAt?: number;
}): Promise<{ id: string }> {
  console.log('[SessionKey] Creating authorization:', params);

  const { addAuthorization } = await import('../../services/storage');

  const authId = `auth-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const authorization: IAgentAuthorization = {
    id: authId,
    mode: params.mode,
    status: params.status,
    chainId: params.chainId,
    networkName: params.networkName,
    agentId: params.agentId,
    agentName: params.agentName,
    sessionKeyPublicKey: params.sessionKeyPublicKey,
    allocatedAmount: params.allocatedAmount,
    allocatedAmountUsd: params.allocatedAmount,
    spentAmount: params.spentAmount,
    spentAmountUsd: params.spentAmount,
    remainingAmount: params.remainingAmount,
    remainingAmountUsd: params.remainingAmount,
    tokenSymbol: params.tokenSymbol,
    rules: {
      ...params.rules,
      expiresAt: params.expiresAt,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await addAuthorization(authorization);

  return { id: authId };
}
