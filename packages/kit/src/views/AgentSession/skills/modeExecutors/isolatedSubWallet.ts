/**
 * Isolated Sub-Wallet Executor
 *
 * Creates a dedicated account for AI agent (derived from user's wallet) with a fixed balance.
 * AI can only spend the balance of this isolated account.
 *
 * Works on: All chains (EVM and non-EVM)
 *
 * @deprecated Use createAgentAuthorization() from services/authorization.ts instead
 */

import type { IAgentAuthorizationRequest } from '../../types';
import type {
  IUserAuthorizationConfig,
  IAuthorizationResult,
} from '../../services/authorization';
import { createAgentAuthorization } from '../../services/authorization';

/**
 * Execute Isolated Sub-Wallet authorization
 *
 * @deprecated Use createAgentAuthorization() instead
 *
 * @param request - Authorization request from AI
 * @returns Authorization result with agent account info
 */
export async function executeIsolatedSubWallet(
  request: IAgentAuthorizationRequest & {
    walletId: string;
    mainAccountId: string;
    mainAccountAddress: string;
    permissionMode?: 'ask-every-time' | 'always-allow';
  },
): Promise<IAuthorizationResult> {
  console.log('[IsolatedSubWallet] Executing Isolated Agent Account authorization (deprecated wrapper)');
  console.log('[IsolatedSubWallet] Redirecting to createAgentAuthorization()');
  
  // Convert old-style request to new format
  const authRequest: IAgentAuthorizationRequest = {
    agentId: request.agentId,
    agentName: request.agentName,
    chainId: request.chainId,
    networkName: request.networkName,
    requestedMode: request.requestedMode,
    requestedAmount: request.requestedAmount,
    tokenSymbol: request.tokenSymbol,
    rules: request.rules,
    purpose: request.purpose || 'Agent authorization',
  };

  const userConfig: IUserAuthorizationConfig = {
    funding: {
      fromAccountId: request.mainAccountId,
      fromAddress: request.mainAccountAddress,
      amount: request.requestedAmount || '0',
      tokenSymbol: request.tokenSymbol || 'ETH',
    },
    permission: {
      mode: request.permissionMode || 'ask-every-time',
    },
    walletId: request.walletId,
  };
  
  try {
    return await createAgentAuthorization(authRequest, userConfig);
  } catch (error) {
    console.error('[IsolatedSubWallet] Execution failed:', error);
    throw error;
  }
}
