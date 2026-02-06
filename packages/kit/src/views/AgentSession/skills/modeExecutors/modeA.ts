/**
 * Mode A: Isolated Agent Account Executor
 * 
 * Creates a dedicated account for AI agent (derived from user's wallet) with a fixed balance.
 * AI can only spend the balance of this isolated account.
 * 
 * Works on: All chains (EVM and non-EVM)
 * 
 * RENAMED: executeModeA -> createAgentAuthorization
 * See services/authorization.ts for the new implementation
 */

import type {
  IAgentAuthorizationRequest,
  IUserAuthorizationConfig,
  IAuthorizationResult,
} from '../../services/authorization';
import { createAgentAuthorization } from '../../services/authorization';

/**
 * Execute Mode A: Isolated Agent Account
 * 
 * @deprecated Use createAgentAuthorization() instead
 * 
 * This function is kept for backward compatibility.
 * 
 * @param request - Authorization request from AI
 * @returns Authorization result with agent account info
 */
export async function executeModeA(
  request: IAgentAuthorizationRequest & {
    walletId: string;
    mainAccountId: string;
    mainAccountAddress: string;
    permissionMode?: 'ask-every-time' | 'always-allow';
  },
): Promise<IAuthorizationResult> {
  console.log('[ModeA] Executing Isolated Agent Account authorization (deprecated wrapper)');
  console.log('[ModeA] Redirecting to createAgentAuthorization()');
  
  // Convert old-style request to new format
  const authRequest: IAgentAuthorizationRequest = {
    agentId: request.agentId,
    agentName: request.agentName,
    agentDescription: request.agentDescription,
    suggestedAmount: request.suggestedAmount || request.requestedAmount || '0',
    suggestedToken: request.tokenSymbol || 'ETH',
    chainId: request.chainId,
    networkName: request.networkName,
    purpose: request.purpose || 'Agent authorization',
  };
  
  const userConfig: IUserAuthorizationConfig = {
    funding: {
      fromAccountId: request.mainAccountId,
      fromAddress: request.mainAccountAddress,
      amount: request.requestedAmount || request.suggestedAmount || '0',
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
    console.error('[ModeA] Execution failed:', error);
    throw error;
  }
}
