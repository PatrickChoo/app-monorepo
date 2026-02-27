/**
 * Agent Session Contract Service
 * 
 * Handles smart contract operations for Agent Sessions (Vault Contracts)
 */

import { ethers } from 'ethers';

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import vaultFactory from '@onekeyhq/kit-bg/src/vaults/factory';
import type { IUnsignedTxPro } from '@onekeyhq/kit-bg/src/vaults/types';

import { AGENT_VAULT_ABI, AGENT_VAULT_BYTECODE } from '../contracts/vaultABI';

interface VaultDeploymentResult {
  contractAddress: string;
  txHash: string;
  owner: string;
}

interface VaultExecutionResult {
  txHash: string;
  success: boolean;
}

/**
 * Deploy a Vault contract (Vault Contract mode)
 * 
 * Deploys a smart contract that acts as a vault for the agent.
 * The owner (main account) has full control over the vault.
 * 
 * @param params.ownerAccountId - Account ID deploying the contract
 * @param params.networkId - Network to deploy on
 * @param params.password - Password to unlock account for signing
 * @param params.dailyLimitWei - Daily spending limit in wei (default: 1 ETH = 1e18)
 * @param params.initialFunding - Optional initial ETH to send to vault
 * @returns Deployment result with contract address and tx hash
 */
export async function deployVaultContract(params: {
  ownerAccountId: string;
  networkId: string;
  password: string;
  dailyLimitWei?: string;
  initialFunding?: string;
}): Promise<VaultDeploymentResult> {
  const { ownerAccountId, networkId, password, dailyLimitWei, initialFunding } = params;

  console.log('[ContractService] Deploying Vault contract...', {
    ownerAccountId,
    networkId,
    dailyLimitWei,
    initialFunding,
  });

  try {
    // Get owner account
    const ownerAccount = await backgroundApiProxy.serviceAccount.getAccount({
      accountId: ownerAccountId,
      networkId,
    });

    if (!ownerAccount) {
      throw new Error(`Owner account not found: ${ownerAccountId}`);
    }

    // Get vault instance
    const vault = await vaultFactory.getVault({
      networkId,
      accountId: ownerAccountId,
    });

    // Get current nonce to calculate contract address
    const nonceHex = await vault.buildRpcCall({
      method: 'eth_getTransactionCount',
      params: [ownerAccount.address, 'latest'],
    });
    const nonce = parseInt(nonceHex, 16);

    // Calculate contract address (before deployment)
    const predictedAddress = calculateContractAddress(ownerAccount.address, nonce);

    // Encode constructor parameters (dailyLimit)
    const contractInterface = new ethers.Interface(AGENT_VAULT_ABI);
    const defaultDailyLimit = ethers.parseEther('1').toString(); // 1 ETH default
    const encodedConstructor = contractInterface.encodeDeploy([
      dailyLimitWei || defaultDailyLimit,
    ]);

    // Combine bytecode + constructor params
    const deploymentData = AGENT_VAULT_BYTECODE + encodedConstructor.slice(2); // Remove '0x' from constructor params

    // Build deployment transaction
    const encodedTx = {
      from: ownerAccount.address,
      to: '', // Empty for contract deployment
      value: initialFunding || '0',
      data: deploymentData,
    };

    console.log('[ContractService] Building deployment transaction...', {
      from: ownerAccount.address,
      nonce,
      predictedAddress,
      dataLength: deploymentData.length,
    });

    const unsignedTx = await vault.buildUnsignedTx({ encodedTx });

    // Sign transaction
    const signedTx = await vault.signTransaction({
      unsignedTx: unsignedTx as IUnsignedTxPro,
      password,
    });

    // Broadcast transaction
    const result = await backgroundApiProxy.serviceSend.broadcastTransaction({
      accountId: ownerAccountId,
      networkId,
      signedTx,
      accountAddress: ownerAccount.address,
    });

    console.log('[ContractService] Vault deployed successfully:', {
      contractAddress: predictedAddress,
      txHash: result.txid,
      owner: ownerAccount.address,
    });

    return {
      contractAddress: predictedAddress,
      txHash: result.txid,
      owner: ownerAccount.address,
    };
  } catch (error) {
    console.error('[ContractService] Deployment failed:', error);
    throw error;
  }
}

/**
 * Execute transaction via Vault contract (Vault Contract mode)
 * 
 * Calls the vault's execute() function to perform an action
 * on behalf of the vault contract.
 * 
 * @param params.vaultAddress - Address of the vault contract
 * @param params.ownerAccountId - Account ID of the vault owner
 * @param params.targetAddress - Target address for the execution
 * @param params.amount - Amount of ETH to send (in wei)
 * @param params.networkId - Network ID
 * @param params.password - Password to unlock account
 * @param params.data - Optional calldata for contract interaction
 * @returns Execution result with tx hash and success status
 */
export async function executeViaVault(params: {
  vaultAddress: string;
  ownerAccountId: string;
  targetAddress: string;
  amount: string;
  networkId: string;
  password: string;
  data?: string;
}): Promise<VaultExecutionResult> {
  const { vaultAddress, ownerAccountId, targetAddress, amount, networkId, password, data } = params;

  console.log('[ContractService] Executing via Vault...', {
    vaultAddress,
    targetAddress,
    amount,
    networkId,
    hasData: !!data,
  });

  try {
    // Get owner account
    const ownerAccount = await backgroundApiProxy.serviceAccount.getAccount({
      accountId: ownerAccountId,
      networkId,
    });

    if (!ownerAccount) {
      throw new Error(`Owner account not found: ${ownerAccountId}`);
    }

    // Get vault instance
    const vault = await vaultFactory.getVault({
      networkId,
      accountId: ownerAccountId,
    });

    // Encode execute() function call
    const calldata = data || '0x';
    const encodedFunctionCall = encodeExecuteCall(targetAddress, amount, calldata);

    console.log('[ContractService] Encoded function call:', {
      functionCallLength: encodedFunctionCall.length,
      targetAddress,
      amount,
    });

    // Build transaction to vault contract
    const encodedTx = {
      from: ownerAccount.address,
      to: vaultAddress,
      value: '0', // No ETH sent in this tx (vault already has funds)
      data: encodedFunctionCall,
    };

    const unsignedTx = await vault.buildUnsignedTx({ encodedTx });

    // Sign transaction
    const signedTx = await vault.signTransaction({
      unsignedTx: unsignedTx as IUnsignedTxPro,
      password,
    });

    // Broadcast transaction
    const result = await backgroundApiProxy.serviceSend.broadcastTransaction({
      accountId: ownerAccountId,
      networkId,
      signedTx,
      accountAddress: ownerAccount.address,
    });

    console.log('[ContractService] Vault execution successful:', {
      txHash: result.txid,
      from: ownerAccount.address,
      vault: vaultAddress,
      target: targetAddress,
    });

    return {
      txHash: result.txid,
      success: true,
    };
  } catch (error) {
    console.error('[ContractService] Vault execution failed:', error);
    return {
      txHash: '',
      success: false,
    };
  }
}

/**
 * Encode execute() function call
 * 
 * Function signature: execute(address,uint256,bytes)
 * Encodes the function call using ethers.js Interface
 * 
 * @param to - Target address for the call
 * @param value - Amount of ETH to send (in wei)
 * @param data - Calldata to send to target
 * @returns Encoded function call data
 */
function encodeExecuteCall(to: string, value: string, data: string): string {
  try {
    const contractInterface = new ethers.Interface(AGENT_VAULT_ABI);
    
    // Encode the execute function call
    const encodedData = contractInterface.encodeFunctionData('execute', [
      to,
      value,
      data || '0x',
    ]);
    
    console.log('[ContractService] Encoded execute call:', {
      to,
      value,
      data,
      encodedData,
    });
    
    return encodedData;
  } catch (error) {
    console.error('[ContractService] Failed to encode execute call:', error);
    throw new Error(`Failed to encode execute call: ${error.message}`);
  }
}

/**
 * Calculate contract address for deployment
 * 
 * Uses standard CREATE opcode address calculation:
 * address = keccak256(rlp([sender_address, sender_nonce]))[12:]
 * 
 * @param deployerAddress - Address deploying the contract
 * @param nonce - Nonce of the deployer at deployment time
 * @returns Predicted contract address
 */
export function calculateContractAddress(
  deployerAddress: string,
  nonce: number,
): string {
  try {
    // ethers.js utility differs between v5/v6
    const contractAddress = (ethers as any).getCreateAddress
      ? (ethers as any).getCreateAddress({
          from: deployerAddress,
          nonce,
        })
      : ethers.utils.getContractAddress({
          from: deployerAddress,
          nonce,
        });
    
    console.log('[ContractService] Calculated contract address:', {
      deployerAddress,
      nonce,
      contractAddress,
    });
    
    return contractAddress;
  } catch (error) {
    console.error('[ContractService] Failed to calculate contract address:', error);
    throw new Error(`Failed to calculate contract address: ${error.message}`);
  }
}

/**
 * Get Vault contract info
 */
export async function getVaultInfo(params: {
  vaultAddress: string;
  networkId: string;
  accountId: string;
}): Promise<{
  owner: string;
  balance: string;
  dailyLimit: string;
  dailySpent: string;
}> {
  const { vaultAddress, networkId, accountId } = params;

  console.log('[ContractService] Getting vault info:', { vaultAddress, networkId });

  try {
    // Get vault instance for RPC calls
    const vault = await vaultFactory.getVault({
      networkId,
      accountId,
    });

    const contractInterface = new ethers.Interface(AGENT_VAULT_ABI);

    // Call owner() function
    const ownerCallData = contractInterface.encodeFunctionData('owner', []);
    const ownerResult = await vault.buildRpcCall({
      method: 'eth_call',
      params: [
        {
          to: vaultAddress,
          data: ownerCallData,
        },
        'latest',
      ],
    });
    const [owner] = contractInterface.decodeFunctionResult('owner', ownerResult);

    // Get contract balance
    const balanceResult = await vault.buildRpcCall({
      method: 'eth_getBalance',
      params: [vaultAddress, 'latest'],
    });
    const balance = balanceResult || '0x0';

    // Get spending status
    const spendingStatusCallData = contractInterface.encodeFunctionData('getSpendingStatus', []);
    const spendingStatusResult = await vault.buildRpcCall({
      method: 'eth_call',
      params: [
        {
          to: vaultAddress,
          data: spendingStatusCallData,
        },
        'latest',
      ],
    });
    const [dailyLimit, dailySpent] = contractInterface.decodeFunctionResult(
      'getSpendingStatus',
      spendingStatusResult,
    );

    console.log('[ContractService] Vault info retrieved:', {
      owner,
      balance,
      dailyLimit: dailyLimit.toString(),
      dailySpent: dailySpent.toString(),
    });

    return {
      owner: owner.toString(),
      balance: ethers.toBigInt(balance).toString(),
      dailyLimit: dailyLimit.toString(),
      dailySpent: dailySpent.toString(),
    };
  } catch (error) {
    console.error('[ContractService] Failed to get vault info:', error);
    throw error;
  }
}

/**
 * Fund Vault contract
 * 
 * Sends ETH from owner account to vault contract
 */
export async function fundVault(params: {
  vaultAddress: string;
  ownerAccountId: string;
  amount: string;
  networkId: string;
  password: string;
}): Promise<{ txHash: string }> {
  const { vaultAddress, ownerAccountId, amount, networkId, password } = params;

  console.log('[ContractService] Funding vault...', {
    vaultAddress,
    amount,
  });

  try {
    // Get owner account
    const ownerAccount = await backgroundApiProxy.serviceAccount.getAccount({
      accountId: ownerAccountId,
      networkId,
    });

    if (!ownerAccount) {
      throw new Error(`Owner account not found: ${ownerAccountId}`);
    }

    // Get vault instance
    const vault = await vaultFactory.getVault({
      networkId,
      accountId: ownerAccountId,
    });

    // Build transfer transaction to vault
    const unsignedTx = await backgroundApiProxy.serviceSend.buildUnsignedTx({
      accountId: ownerAccountId,
      networkId,
      transfersInfo: [
        {
          from: ownerAccount.address,
          to: vaultAddress,
          amount,
          tokenInfo: {
            address: '',
            isNative: true,
          },
        },
      ],
    });

    // Sign transaction
    const signedTx = await vault.signTransaction({
      unsignedTx: unsignedTx as IUnsignedTxPro,
      password,
    });

    // Broadcast transaction
    const result = await backgroundApiProxy.serviceSend.broadcastTransaction({
      accountId: ownerAccountId,
      networkId,
      signedTx,
      accountAddress: ownerAccount.address,
    });

    console.log('[ContractService] Vault funded:', result.txid);

    return { txHash: result.txid };
  } catch (error) {
    console.error('[ContractService] Funding failed:', error);
    throw error;
  }
}
