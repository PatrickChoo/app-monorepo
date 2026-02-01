/**
 * Agent Session Skill - Main Entry Point
 * 
 * This skill acts as a bridge between AI agents and OneKey App,
 * handling authorization mode selection and transaction execution.
 */

import type {
  IAgentAuthorizationRequest,
  IAgentAuthorization,
} from '../types';
import { chooseAuthorizationMode } from '../utils/modeSelection';
import { DEMO_SCENARIOS } from './demoScenarios';
import { executeModeA } from './modeExecutors/modeA';
import { executeModeB } from './modeExecutors/modeB';
import { executeModeC } from './modeExecutors/modeC';
import type { IAuthorizationResult, IExecutionParams } from './types';

/**
 * Demo Authorization Scenario - Entry Point
 * 
 * This is the main function that AI agents call to trigger demo scenarios.
 * It automatically selects the appropriate authorization mode and executes it.
 * 
 * @param scenarioId - The demo scenario identifier (e.g., 'ethereum-swap')
 * @returns Authorization result with mode, authorizationId, and details
 * 
 * @example
 * // AI calls this function
 * const result = await demoAuthorizationScenario('ethereum-swap');
 * // Returns: { success: true, authorizationId: 'auth-123', mode: 'SessionKey', ... }
 */
export async function demoAuthorizationScenario(
  scenarioId: string,
): Promise<IAuthorizationResult> {
  // 1. Load scenario configuration
  const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
  
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }

  // 2. Automatically choose authorization mode
  const modeResult = chooseAuthorizationMode(
    {
      agentId: 'demo-agent',
      agentName: 'Demo AI Agent',
      chainId: scenario.chainId,
      networkName: scenario.networkName,
      requestedAmount: scenario.amount,
      tokenSymbol: scenario.tokenSymbol,
      purpose: scenario.description,
      scenarioId: scenario.id,
    },
    scenario.action,
  );

  // 3. Build authorization request
  const request: IAgentAuthorizationRequest = {
    agentId: 'demo-agent',
    agentName: 'Demo AI Agent',
    chainId: scenario.chainId,
    networkName: scenario.networkName,
    requestedMode: modeResult.mode,
    requestedAmount: scenario.amount,
    tokenSymbol: scenario.tokenSymbol,
    rules: {
      spendingLimitUsd: 500,
      ttlSeconds: 3600, // 1 hour
    },
    purpose: scenario.description,
    scenarioId: scenario.id,
  };

  // 4. Execute the selected mode
  console.log(`[AgentSession] Selected mode: ${modeResult.mode}`);
  console.log(`[AgentSession] Reason: ${modeResult.reason}`);

  try {
    switch (modeResult.mode) {
      case 'IsolatedSubWallet':
        return await executeModeA(request);
      
      case 'VaultContract':
        return await executeModeB(request);
      
      case 'SessionKey':
        return await executeModeC(request);
      
      default:
        throw new Error(`Unsupported mode: ${modeResult.mode}`);
    }
  } catch (error) {
    console.error('[AgentSession] Authorization failed:', error);
    
    // Fallback to Mode A if primary mode fails
    if (modeResult.mode !== 'IsolatedSubWallet' && modeResult.fallbackMode) {
      console.log(`[AgentSession] Falling back to ${modeResult.fallbackMode}`);
      return await executeModeA(request);
    }
    
    throw error;
  }
}

/**
 * Execute Transaction with Existing Authorization
 * 
 * Once authorized, AI can call this to execute transactions
 * without requiring user confirmation each time.
 * 
 * @param authorizationId - The authorization ID from demoAuthorizationScenario
 * @param params - Execution parameters (transaction details)
 * @returns Execution result with transaction hash
 * 
 * @example
 * const txResult = await executeWithAuthorization('auth-123', {
 *   action: 'swap',
 *   fromToken: 'ETH',
 *   toToken: 'USDC',
 *   amount: '0.1'
 * });
 */
export async function executeWithAuthorization(
  authorizationId: string,
  params: IExecutionParams,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const { getAuthorizationById, updateAuthorization } = await import(
    '../services/storage'
  );

  console.log(`[AgentSession] Executing with authorization: ${authorizationId}`);
  console.log(`[AgentSession] Params:`, params);

  try {
    // 1. Load authorization by ID
    const authorization = await getAuthorizationById(authorizationId);

    if (!authorization) {
      return {
        success: false,
        error: `Authorization not found: ${authorizationId}`,
      };
    }

    // 2. Validate authorization is active and not expired
    if (authorization.status !== 'Active') {
      return {
        success: false,
        error: `Authorization is not active: ${authorization.status}`,
      };
    }

    const now = Date.now();
    if (authorization.rules.expiresAt && authorization.rules.expiresAt < now) {
      await updateAuthorization(authorizationId, { status: 'Expired' });
      return {
        success: false,
        error: 'Authorization has expired',
      };
    }

    // 3. Validate execution params against authorization rules
    const amountUsd = parseFloat(params.amount) || 0; // Simplified - should convert to USD
    const spentUsd = parseFloat(authorization.spentAmountUsd || '0');
    const limitUsd = authorization.rules.spendingLimitUsd || Infinity;

    if (spentUsd + amountUsd > limitUsd) {
      return {
        success: false,
        error: `Spending limit exceeded. Limit: ${limitUsd}, Spent: ${spentUsd}, Requested: ${amountUsd}`,
      };
    }

    // 4. Execute transaction based on mode
    console.log(`[AgentSession] Executing with mode: ${authorization.mode}`);

    let txHash: string;

    switch (authorization.mode) {
      case 'IsolatedSubWallet':
        // Use sub-wallet to execute transaction
        txHash = await executeWithSubWallet(authorization, params);
        break;

      case 'VaultContract':
        // Call vault contract to execute transaction
        txHash = await executeWithVaultContract(authorization, params);
        break;

      case 'SessionKey':
        // Sign transaction with session key
        txHash = await executeWithSessionKey(authorization, params);
        break;

      default:
        throw new Error(`Unsupported mode: ${authorization.mode}`);
    }

    // 5. Update spent amount
    const newSpentUsd = (spentUsd + amountUsd).toString();
    const newRemainingUsd = (limitUsd - (spentUsd + amountUsd)).toString();

    await updateAuthorization(authorizationId, {
      spentAmountUsd: newSpentUsd,
      remainingAmountUsd: newRemainingUsd,
    });

    console.log(`[AgentSession] Transaction executed: ${txHash}`);

    // 6. Return transaction hash
    return {
      success: true,
      txHash,
    };
  } catch (error) {
    console.error('[AgentSession] Execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute transaction using sub-wallet (Mode A)
 */
async function executeWithSubWallet(
  authorization: IAgentAuthorization,
  params: IExecutionParams,
): Promise<string> {
  console.log('[AgentSession] Executing with sub-wallet:', authorization.subWalletAddress);

  // TODO: Implement actual transaction logic
  // This should:
  // 1. Load sub-wallet private key
  // 2. Build transaction based on params
  // 3. Sign with sub-wallet
  // 4. Broadcast transaction

  // Mock implementation
  return `0x${Math.random().toString(16).slice(2)}`;
}

/**
 * Execute transaction using vault contract (Mode B)
 */
async function executeWithVaultContract(
  authorization: IAgentAuthorization,
  params: IExecutionParams,
): Promise<string> {
  console.log('[AgentSession] Executing with vault contract:', authorization.vaultContractAddress);

  // TODO: Implement actual contract call
  // This should:
  // 1. Build contract call data
  // 2. Call vault contract's execute method
  // 3. Wait for transaction confirmation

  // Mock implementation
  return `0x${Math.random().toString(16).slice(2)}`;
}

/**
 * Execute transaction using session key (Mode C)
 */
async function executeWithSessionKey(
  authorization: IAgentAuthorization,
  params: IExecutionParams,
): Promise<string> {
  console.log('[AgentSession] Executing with session key:', authorization.sessionKeyPublicKey);

  // TODO: Implement actual AA wallet + session key logic
  // This should:
  // 1. Build UserOperation
  // 2. Sign with session key
  // 3. Submit to bundler

  // Mock implementation
  return `0x${Math.random().toString(16).slice(2)}`;
}

/**
 * Revoke Authorization
 * 
 * User or AI can call this to revoke an active authorization.
 * 
 * @param authorizationId - The authorization ID to revoke
 * @returns Success status
 */
export async function revokeAuthorization(
  authorizationId: string,
): Promise<{ success: boolean }> {
  // TODO: Implement revocation logic
  // This will:
  // 1. Load authorization by ID
  // 2. Revoke based on mode (revoke session key, withdraw from vault, etc.)
  // 3. Update authorization status to 'Revoked'
  
  console.log(`[AgentSession] Revoking authorization: ${authorizationId}`);
  
  return {
    success: true,
  };
}

/**
 * Get Active Authorizations
 * 
 * Retrieve all active authorizations for display in UI.
 * 
 * @returns List of active authorizations
 */
export async function getActiveAuthorizations(): Promise<IAgentAuthorization[]> {
  // TODO: Implement
  // This will query stored authorizations and filter by status === 'Active'
  
  return [];
}

// Export types for consumers
export type {
  IAuthorizationResult,
  IExecutionParams,
} from './types';

export { DEMO_SCENARIOS } from './demoScenarios';
