/**
 * Agent Session Skill - Main Entry Point
 *
 * This skill acts as a bridge between AI agents and OneKey App,
 * handling authorization mode selection and transaction execution.
 */

import {
  EAgentAuthorizationMode,
  EAgentAuthorizationStatus,
  type IAgentAuthorizationRequest,
  type IAgentAuthorization,
} from '../types';
import { chooseAuthorizationMode } from '../utils/modeSelection';
import { DEMO_SCENARIOS } from './demoScenarios';
import { requestAuthorizationFromUI } from './authorizationBridge';
import { executeVaultContract } from './modeExecutors/vaultContract';
import { executeSessionKey } from './modeExecutors/sessionKey';
import { executeWithAgentAccount } from './modeExecutors/executor';
import type { IAuthorizationResult, IExecutionParams } from './types';

/**
 * Demo Authorization Scenario - Entry Point
 *
 * This is the main function that AI agents call to trigger demo scenarios.
 * It automatically selects the appropriate authorization mode and executes it.
 *
 * @param scenarioId - The demo scenario identifier (e.g., 'ethereum-swap')
 * @returns Authorization result with mode, authorizationId, and details
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
      case EAgentAuthorizationMode.IsolatedSubWallet: {
        // Show authorization modal — the modal + provider handles the full
        // createAgentAuthorization flow once the user confirms
        const bridgeResult = await requestAuthorizationFromUI(request);
        if (!bridgeResult.confirmed) {
          throw new Error('User rejected authorization');
        }
        return {
          success: true,
          authorizationId: `pending-${Date.now()}`,
          mode: EAgentAuthorizationMode.IsolatedSubWallet,
          allocatedAmount: request.requestedAmount,
        };
      }

      case EAgentAuthorizationMode.VaultContract:
        return await executeVaultContract(request);

      case EAgentAuthorizationMode.SessionKey:
        return await executeSessionKey(request);

      default:
        throw new Error(`Unsupported mode: ${modeResult.mode}`);
    }
  } catch (error) {
    console.error('[AgentSession] Authorization failed:', error);

    // Fallback: show authorization modal for Isolated Sub-Wallet
    if (modeResult.mode !== EAgentAuthorizationMode.IsolatedSubWallet && modeResult.fallbackMode) {
      console.log(`[AgentSession] Falling back to ${modeResult.fallbackMode}`);
      const fallbackResult = await requestAuthorizationFromUI(request);
      if (!fallbackResult.confirmed) {
        throw new Error('User rejected fallback authorization');
      }
      return {
        success: true,
        authorizationId: `pending-${Date.now()}`,
        mode: EAgentAuthorizationMode.IsolatedSubWallet,
        allocatedAmount: request.requestedAmount,
      };
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
    if (authorization.status !== EAgentAuthorizationStatus.Active) {
      return {
        success: false,
        error: `Authorization is not active: ${authorization.status}`,
      };
    }

    const now = Date.now();
    if (authorization.rules?.expiresAt && authorization.rules.expiresAt < now) {
      await updateAuthorization(authorizationId, { status: EAgentAuthorizationStatus.Expired });
      return {
        success: false,
        error: 'Authorization has expired',
      };
    }

    // 3. Validate execution params against authorization rules
    const amountUsd = parseFloat(params.amount);
    if (Number.isNaN(amountUsd) || amountUsd < 0) {
      return {
        success: false,
        error: `Invalid amount: ${params.amount}`,
      };
    }
    const spentUsd = parseFloat(authorization.spentAmountUsd || '0') || 0;
    const limitUsd = authorization.rules?.spendingLimitUsd || Infinity;

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
      case EAgentAuthorizationMode.IsolatedSubWallet:
        txHash = await executeWithIsolatedSubWallet(authorization, params);
        break;

      case EAgentAuthorizationMode.VaultContract:
        throw new Error('Vault Contract transaction execution not yet implemented');

      case EAgentAuthorizationMode.SessionKey:
        throw new Error('Session Key transaction execution not yet implemented');

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
 * Execute transaction using Isolated Sub-Wallet (agent account)
 */
async function executeWithIsolatedSubWallet(
  authorization: IAgentAuthorization,
  params: IExecutionParams,
): Promise<string> {
  if (!authorization.agentAccountId || !authorization.agentAccountAddress) {
    throw new Error('Agent account not found on this authorization');
  }

  if (!params.recipient) {
    throw new Error('Recipient address is required');
  }

  return executeWithAgentAccount({
    agentAccountId: authorization.agentAccountId,
    agentAccountAddress: authorization.agentAccountAddress,
    to: params.recipient,
    amount: params.amount,
    networkId: authorization.chainId,
  });
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
): Promise<{ success: boolean; error?: string }> {
  console.log(`[AgentSession] Revoking authorization: ${authorizationId}`);

  try {
    const { revokeAgentAuthorization } = await import(
      '../services/authorization'
    );
    await revokeAgentAuthorization(authorizationId);

    return { success: true };
  } catch (error) {
    console.error('[AgentSession] Revocation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get Active Authorizations
 *
 * Retrieve all active authorizations for display in UI.
 *
 * @returns List of active authorizations
 */
export async function getActiveAuthorizations(): Promise<IAgentAuthorization[]> {
  try {
    const storage = await import('../services/storage');
    return storage.getActiveAuthorizations();
  } catch (error) {
    console.error('[AgentSession] Failed to get active authorizations:', error);
    return [];
  }
}

// Export types for consumers
export type {
  IAuthorizationResult,
  IExecutionParams,
} from './types';

export { DEMO_SCENARIOS } from './demoScenarios';
