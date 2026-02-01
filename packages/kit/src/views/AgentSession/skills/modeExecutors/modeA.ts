/**
 * Mode A: Isolated Sub-Wallet Executor
 * 
 * Creates a dedicated wallet for AI with a fixed balance.
 * AI can only spend the balance of this isolated wallet.
 * 
 * Works on: All chains (EVM and non-EVM)
 */

import {
  EAgentAuthorizationMode,
  EAgentAuthorizationStatus,
  type IAgentAuthorizationRequest,
  type IAgentAuthorization,
} from '../../types';
import type { IAuthorizationResult } from '../types';

/**
 * Execute Mode A: Isolated Sub-Wallet
 * 
 * Flow:
 * 1. Generate a new sub-wallet from master seed
 * 2. Show confirmation modal to user
 * 3. Transfer requested amount from main wallet to sub-wallet
 * 4. Create authorization record
 * 5. Return authorization details
 * 
 * @param request - Authorization request from AI
 * @returns Authorization result with sub-wallet address
 */
export async function executeModeA(
  request: IAgentAuthorizationRequest & {
    walletId: string; // HD wallet ID
    mainAccountId: string; // Main account for funding
    mainAccountAddress: string; // Main account address
  },
): Promise<IAuthorizationResult> {
  console.log('[ModeA] Executing Isolated Sub-Wallet authorization');
  console.log('[ModeA] Request:', request);

  try {
    // 1. Generate new sub-wallet using HD derivation
    const subWallet = await generateSubWallet({
      chainId: request.chainId,
      walletId: request.walletId,
    });
    console.log(
      '[ModeA] Generated sub-wallet:',
      subWallet.address,
      'at',
      subWallet.path,
    );

    // 2. Show confirmation modal to user
    const confirmed = await showAuthorizationModal({
      mode: EAgentAuthorizationMode.IsolatedSubWallet,
      agentName: request.agentName,
      chainId: request.chainId,
      networkName: request.networkName,
      amount: request.requestedAmount,
      tokenSymbol: request.tokenSymbol,
      subWalletAddress: subWallet.address,
    });

    if (!confirmed) {
      throw new Error('User rejected authorization');
    }

    // 3. Transfer funds from main wallet to sub-wallet
    let txHash: string | undefined;
    if (request.requestedAmount && parseFloat(request.requestedAmount) > 0) {
      txHash = await transferToSubWallet({
        fromAccountId: request.mainAccountId,
        fromAddress: request.mainAccountAddress,
        to: subWallet.address,
        amount: request.requestedAmount,
        tokenSymbol: request.tokenSymbol,
        chainId: request.chainId,
      });
      console.log('[ModeA] Transfer tx:', txHash);
    }

    // 4. Create authorization record
    const authorization = await createAuthorization({
      mode: EAgentAuthorizationMode.IsolatedSubWallet,
      status: EAgentAuthorizationStatus.Active,
      chainId: request.chainId,
      networkName: request.networkName,
      agentId: request.agentId,
      agentName: request.agentName,
      subWalletAddress: subWallet.address,
      subWalletAccountId: subWallet.accountId,
      subWalletPath: subWallet.path,
      allocatedAmount: request.requestedAmount,
      spentAmount: '0',
      remainingAmount: request.requestedAmount,
      tokenSymbol: request.tokenSymbol,
      fundingTxHash: txHash,
      rules: request.rules || {},
    });

    console.log('[ModeA] Authorization created:', authorization.id);

    // 5. Return result
    return {
      success: true,
      authorizationId: authorization.id,
      mode: EAgentAuthorizationMode.IsolatedSubWallet,
      subWalletAddress: subWallet.address,
      subWalletAccountId: subWallet.accountId,
      allocatedAmount: request.requestedAmount,
      fundingTxHash: txHash,
    };
  } catch (error) {
    console.error('[ModeA] Execution failed:', error);
    throw error;
  }
}

/**
 * Generate a new sub-wallet using HD derivation
 * 
 * Uses WalletService to derive a new sub-account
 */
async function generateSubWallet(params: {
  chainId: string;
  walletId: string;
}): Promise<{
  address: string;
  accountId: string;
  path: string;
}> {
  console.log('[ModeA] Generating sub-wallet for chain:', params.chainId);

  try {
    // Use WalletService to derive sub-account
    const { deriveSubAccount } = await import('../../services/wallet');
    
    const result = await deriveSubAccount({
      walletId: params.walletId,
      networkId: params.chainId,
    });

    console.log('[ModeA] Sub-wallet created:', result.address, 'at path:', result.path);

    return {
      address: result.address,
      accountId: result.accountId,
      path: result.path,
    };
  } catch (error) {
    console.error('[ModeA] Failed to generate sub-wallet:', error);
    throw error;
  }
}

/**
 * Show authorization confirmation modal
 * 
 * This creates a promise that will be resolved when the user confirms/rejects in the UI
 */
async function showAuthorizationModal(params: {
  mode: EAgentAuthorizationMode;
  agentName: string;
  chainId: string;
  networkName: string;
  amount?: string;
  tokenSymbol?: string;
  subWalletAddress?: string;
}): Promise<boolean> {
  console.log('[ModeA] Showing authorization modal:', params);

  // Dynamic import to avoid circular dependencies
  const { requestAuthorizationFromUI } = await import('../authorizationBridge');

  try {
    const result = await requestAuthorizationFromUI({
      agentId: 'agent-demo',
      agentName: params.agentName,
      chainId: params.chainId,
      networkName: params.networkName,
      requestedMode: params.mode,
      requestedAmount: params.amount,
      tokenSymbol: params.tokenSymbol,
    });

    return result.confirmed;
  } catch (error) {
    console.error('[ModeA] Modal error:', error);
    return false;
  }
}

/**
 * Transfer funds to sub-wallet
 * 
 * Uses WalletService to transfer funds from main account to sub-account
 */
async function transferToSubWallet(params: {
  fromAccountId: string;
  fromAddress: string;
  to: string;
  amount?: string;
  tokenSymbol?: string;
  chainId: string;
}): Promise<string> {
  console.log('[ModeA] Transferring funds:', params);

  try {
    // Use WalletService to transfer
    const { transferToSubAccount } = await import('../../services/wallet');
    
    const { fromAccountId, to, amount, chainId } = params;

    // Get user password (this will trigger OneKey's password modal)
    const password = await getUserPassword();

    const result = await transferToSubAccount({
      fromAccountId,
      toAddress: to,
      amount: amount || '0',
      networkId: chainId,
      password,
    });

    console.log('[ModeA] Transfer successful:', result.txHash);

    return result.txHash;
  } catch (error) {
    console.error('[ModeA] Transfer failed:', error);
    throw error;
  }
}

/**
 * Get user password for signing
 * 
 * This triggers OneKey's built-in password modal
 */
async function getUserPassword(): Promise<string> {
  const { promptPassword } = await import('../../services/wallet');
  return promptPassword();
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
  subWalletAddress?: string;
  subWalletAccountId?: string;
  subWalletPath?: string;
  allocatedAmount?: string;
  spentAmount?: string;
  remainingAmount?: string;
  tokenSymbol?: string;
  fundingTxHash?: string;
  rules: any;
}): Promise<{ id: string }> {
  console.log('[ModeA] Creating authorization:', params);

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
    subWalletAddress: params.subWalletAddress,
    subWalletAccountId: params.subWalletAccountId,
    subWalletPath: params.subWalletPath,
    fundingTxHash: params.fundingTxHash,
    allocatedAmount: params.allocatedAmount,
    allocatedAmountUsd: params.allocatedAmount, // TODO: Calculate real USD value
    spentAmount: params.spentAmount,
    spentAmountUsd: params.spentAmount,
    remainingAmount: params.remainingAmount,
    remainingAmountUsd: params.remainingAmount,
    tokenSymbol: params.tokenSymbol,
    rules: params.rules,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await addAuthorization(authorization);

  return { id: authId };
}
