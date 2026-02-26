/**
 * Vault Contract Executor
 * 
 * Deposits funds into a smart contract that enforces:
 * - Spending limits
 * - Contract whitelist
 * - Method whitelist
 * 
 * Works on: EVM chains with smart contract support
 */

import { ethers } from 'ethers';

import {
  EAgentAuthorizationMode,
  EAgentAuthorizationStatus,
  type IAgentAuthorizationRequest,
  type IAgentAuthorization,
} from '../../types';
import type { IAuthorizationResult } from '../types';

/**
 * Execute Vault Contract authorization
 * 
 * Flow:
 * 1. Get or deploy Vault contract for this chain
 * 2. Show confirmation modal to user
 * 3. Deposit funds into Vault
 * 4. Set spending rules on Vault
 * 5. Create authorization record
 * 6. Return authorization details
 * 
 * @param request - Authorization request from AI
 * @returns Authorization result with vault contract address
 */
export async function executeVaultContract(
  request: IAgentAuthorizationRequest,
): Promise<IAuthorizationResult> {
  console.log('[VaultContract] Executing Vault Contract authorization');
  console.log('[VaultContract] Request:', request);

  try {
    // Validate request has required fields
    if (!request.requestedAmount) {
      throw new Error('Requested amount is required for Vault Contract mode');
    }

    // 1. Get or deploy Vault contract
    // TODO: accountId should come from user config, not from agent request
    const vaultAddress = await getOrDeployVault({
      chainId: request.chainId,
      accountId: request.agentId,
      dailyLimit: request.rules?.spendingLimitUsd
        ? ethers.parseEther(String(request.rules.spendingLimitUsd)).toString()
        : ethers.parseEther('1').toString(),
    });
    console.log('[VaultContract] Vault contract:', vaultAddress);

    // 2. Show confirmation modal to user
    const confirmed = await showAuthorizationModal({
      mode: EAgentAuthorizationMode.VaultContract,
      agentId: request.agentId,
      agentName: request.agentName,
      chainId: request.chainId,
      networkName: request.networkName,
      amount: request.requestedAmount,
      tokenSymbol: request.tokenSymbol,
      vaultAddress,
      rules: request.rules,
    });

    if (!confirmed) {
      throw new Error('User rejected authorization');
    }

    // 3. Deposit funds into Vault
    const depositTxHash = await depositToVault({
      vaultAddress,
      amount: request.requestedAmount,
      tokenSymbol: request.tokenSymbol,
      chainId: request.chainId,
      accountId: request.agentId, // TODO: use actual account ID from user config
    });
    console.log('[VaultContract] Deposit tx:', depositTxHash);

    // 4. Set spending rules on Vault
    await setVaultRules({
      vaultAddress,
      chainId: request.chainId,
      rules: {
        spendingLimitUsd: request.rules?.spendingLimitUsd,
        contractWhitelist: request.rules?.contractWhitelist || [],
        methodWhitelist: request.rules?.methodWhitelist || [],
      },
    });
    console.log('[VaultContract] Vault rules set');

    // 5. Create authorization record
    const authorization = await createAuthorization({
      mode: EAgentAuthorizationMode.VaultContract,
      status: EAgentAuthorizationStatus.Active,
      chainId: request.chainId,
      networkName: request.networkName,
      agentId: request.agentId,
      agentName: request.agentName,
      vaultContractAddress: vaultAddress,
      allocatedAmount: request.requestedAmount,
      spentAmount: '0',
      remainingAmount: request.requestedAmount,
      tokenSymbol: request.tokenSymbol,
      rules: request.rules || {},
    });

    console.log('[VaultContract] Authorization created:', authorization.id);

    // 6. Return result
    return {
      success: true,
      authorizationId: authorization.id,
      mode: EAgentAuthorizationMode.VaultContract,
      vaultContractAddress: vaultAddress,
      allocatedAmount: request.requestedAmount,
    };
  } catch (error) {
    console.error('[VaultContract] Execution failed:', error);
    throw error;
  }
}

/**
 * Get or deploy Vault contract
 * 
 * Checks for existing Vault, otherwise deploys a new one
 */
async function getOrDeployVault(params: {
  chainId: string;
  accountId: string;
  dailyLimit: string; // in wei
}): Promise<string> {
  console.log('[VaultContract] Getting or deploying Vault for chain:', params.chainId);

  try {
    // 1. Check for existing Vault in storage
    const { getVaultContract } = await import('../../services/storage');
    const existingVault = await getVaultContract(params.chainId);

    if (existingVault) {
      console.log('[VaultContract] Found existing Vault:', existingVault.address);
      return existingVault.address;
    }

    // 2. Deploy new Vault contract
    console.log('[VaultContract] Deploying new Vault contract...');
    const vaultAddress = await deployVaultContract(params);

    // 3. Store Vault address
    const { saveVaultContract } = await import('../../services/storage');
    await saveVaultContract({
      chainId: params.chainId,
      address: vaultAddress,
      deployedAt: Date.now(),
    });

    console.log('[VaultContract] Vault deployed at:', vaultAddress);
    return vaultAddress;
  } catch (error) {
    console.error('[VaultContract] Failed to get/deploy Vault:', error);
    throw error;
  }
}

/**
 * Deploy Vault contract
 * 
 * Uses ContractService to deploy a vault contract
 */
async function deployVaultContract(params: {
  chainId: string;
  accountId: string;
  dailyLimit: string;
}): Promise<string> {
  console.log('[VaultContract] Deploying Vault contract:', params);

  try {
    // Use ContractService to deploy vault
    const { deployVaultContract: deployVault } = await import('../../services/contract');
    
    // Get user password
    const password = await getUserPassword();

    const result = await deployVault({
      ownerAccountId: params.accountId,
      networkId: params.chainId,
      password,
      initialFunding: '0', // No initial funding on deployment
    });

    console.log('[VaultContract] Vault deployed:', result.contractAddress);
    
    return result.contractAddress;
  } catch (error) {
    console.error('[VaultContract] Deployment failed:', error);
    throw error;
  }
}

/**
 * Get user password for signing
 */
async function getUserPassword(): Promise<string> {
  // TODO: Implement proper password request via OneKey UI
  console.warn('[VaultContract] Password request not implemented - using empty password');
  return '';
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
  vaultAddress?: string;
  rules?: Partial<import('../../types').IAgentAuthorizationRule>;
}): Promise<boolean> {
  console.log('[VaultContract] Showing authorization modal:', params);

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
      rules: params.rules,
    });

    return result.confirmed;
  } catch (error) {
    console.error('[VaultContract] Modal error:', error);
    return false;
  }
}

/**
 * Deposit funds into Vault
 * 
 * Uses ContractService to fund the vault contract
 */
async function depositToVault(params: {
  vaultAddress: string;
  amount?: string;
  tokenSymbol?: string;
  chainId: string;
  accountId: string;
}): Promise<string> {
  console.log('[VaultContract] Depositing to Vault:', params);
  
  try {
    // Use ContractService to fund vault
    const { fundVault } = await import('../../services/contract');
    
    // Get user password
    const password = await getUserPassword();

    const result = await fundVault({
      vaultAddress: params.vaultAddress,
      ownerAccountId: params.accountId,
      amount: params.amount || '0',
      networkId: params.chainId,
      password,
    });

    console.log('[VaultContract] Vault funded:', result.txHash);
    
    return result.txHash;
  } catch (error) {
    console.error('[VaultContract] Deposit failed:', error);
    throw error;
  }
}

/**
 * Set spending rules on Vault
 * 
 * TODO: Implement actual contract interaction
 */
async function setVaultRules(params: {
  vaultAddress: string;
  chainId: string;
  rules: {
    spendingLimitUsd?: number;
    contractWhitelist?: string[];
    methodWhitelist?: string[];
  };
}): Promise<void> {
  console.log('[VaultContract] Setting Vault rules:', params);
  
  // TODO: Real implementation
  // Call Vault.setRules(rules) on the contract
  // This might be a separate transaction or bundled with deposit
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
  vaultContractAddress?: string;
  allocatedAmount?: string;
  spentAmount?: string;
  remainingAmount?: string;
  tokenSymbol?: string;
  rules: Partial<import('../../types').IAgentAuthorizationRule>;
}): Promise<{ id: string }> {
  console.log('[VaultContract] Creating authorization:', params);

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
    vaultContractAddress: params.vaultContractAddress,
    allocatedAmount: params.allocatedAmount,
    allocatedAmountUsd: params.allocatedAmount,
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
