/**
 * Agent Authorization Service
 * 
 * Handles the complete authorization flow for AI agents:
 * 1. Derive sub-account with dedicated derivation range (10,000+)
 * 2. Transfer funds from user's account
 * 3. Export private key if always-allow mode
 * 4. Create authorization record with audit logs
 */

import {
  EAgentAuthorizationMode,
  EAgentAuthorizationStatus,
  type IAgentAuthorization,
} from '../types';
import { deriveSubAccount, transferToSubAccount, exportPrivateKey, promptPassword } from './wallet';
import { addAuthorization, addAuditLog } from './storage';

/**
 * Agent authorization request from AI
 */
export interface IAgentAuthorizationRequest {
  agentId: string;
  agentName: string;
  agentDescription?: string;
  suggestedAmount: string;
  suggestedToken: string;
  chainId: string;
  networkName: string;
  purpose: string;
}

/**
 * User's configuration for authorization
 */
export interface IUserAuthorizationConfig {
  // Funding configuration
  funding: {
    fromAccountId: string;    // User-selected account
    fromAddress: string;      // Account address (for display)
    amount: string;           // User-adjusted amount
    tokenSymbol: string;
  };
  
  // Permission configuration
  permission: {
    mode: 'ask-every-time' | 'always-allow';
  };
  
  // Wallet context
  walletId: string;
}

/**
 * Authorization result
 */
export interface IAuthorizationResult {
  success: boolean;
  authorizationId: string;
  subWalletAddress: string;
  subWalletAccountId: string;
  subWalletPath: string;
  derivationIndex: number;
  privateKey?: string;        // Only returned in always-allow mode
  fundingTxHash: string;
  allocatedAmount: string;
  permissionMode: 'ask-every-time' | 'always-allow';
}

/**
 * Create agent authorization
 * 
 * Complete flow:
 * 1. Derive sub-account in agent-dedicated range (index 10,000+)
 * 2. Transfer funds from user's selected account
 * 3. Export private key if always-allow mode
 * 4. Create authorization record
 * 5. Log audit trail
 * 
 * @param request - Agent's authorization request
 * @param userConfig - User's configuration
 * @param password - User's password (already collected)
 * @returns Authorization result with sub-wallet info
 */
export async function createAgentAuthorization(
  request: IAgentAuthorizationRequest,
  userConfig: IUserAuthorizationConfig,
): Promise<IAuthorizationResult> {
  console.log('[Authorization] Creating agent authorization');
  console.log('[Authorization] Request:', request);
  console.log('[Authorization] User config:', userConfig);
  
  const startTime = Date.now();
  
  try {
    // Get password once for all operations
    const password = await promptPassword();
    
    // Step 1: Derive sub-account
    console.log('[Authorization] Step 1: Deriving sub-account...');
    const subAccount = await deriveSubAccount({
      walletId: userConfig.walletId,
      networkId: request.chainId,
      agentId: request.agentId,
      agentName: request.agentName,
      reuseIfExists: true,
    });
    
    console.log('[Authorization] Sub-account derived:', {
      address: subAccount.address,
      path: subAccount.path,
      index: subAccount.derivationIndex,
      isNew: subAccount.isNewAccount,
    });
    
    // Log: Account derivation
    await addAuditLog({
      authorizationId: 'pending',
      agentId: request.agentId,
      action: 'derive-account',
      details: {
        address: subAccount.address,
        path: subAccount.path,
        derivationIndex: subAccount.derivationIndex,
        isNewAccount: subAccount.isNewAccount,
      },
      timestamp: Date.now(),
    });
    
    // Step 2: Transfer funds
    console.log('[Authorization] Step 2: Transferring funds...');
    const fundingTx = await transferToSubAccount({
      fromAccountId: userConfig.funding.fromAccountId,
      toAddress: subAccount.address,
      amount: userConfig.funding.amount,
      networkId: request.chainId,
      password,
    });
    
    console.log('[Authorization] Funds transferred:', fundingTx.txHash);
    
    // Log: Funding transaction
    await addAuditLog({
      authorizationId: 'pending',
      agentId: request.agentId,
      action: 'fund-account',
      details: {
        fromAccount: userConfig.funding.fromAccountId,
        toAddress: subAccount.address,
        amount: userConfig.funding.amount,
        tokenSymbol: userConfig.funding.tokenSymbol,
        txHash: fundingTx.txHash,
      },
      timestamp: Date.now(),
    });
    
    // Step 3: Export private key (if always-allow mode)
    let privateKey: string | undefined;
    if (userConfig.permission.mode === 'always-allow') {
      console.log('[Authorization] Step 3: Exporting private key...');
      privateKey = await exportPrivateKey({
        accountId: subAccount.accountId,
        password,
      });
      console.log('[Authorization] Private key exported');
      
      // Log: Private key export (sensitive operation)
      await addAuditLog({
        authorizationId: 'pending',
        agentId: request.agentId,
        action: 'export-private-key',
        details: {
          accountId: subAccount.accountId,
          address: subAccount.address,
          warning: 'Agent has full control over this account',
        },
        timestamp: Date.now(),
      });
    }
    
    // Step 4: Create authorization record
    console.log('[Authorization] Step 4: Creating authorization record...');
    const authId = `auth-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const authorization: IAgentAuthorization = {
      id: authId,
      mode: EAgentAuthorizationMode.IsolatedSubWallet,
      status: EAgentAuthorizationStatus.Active,
      
      // Agent info
      agentId: request.agentId,
      agentName: request.agentName,
      agentDescription: request.agentDescription,
      
      // Chain info
      chainId: request.chainId,
      networkName: request.networkName,
      
      // Sub-wallet info
      subWalletAddress: subAccount.address,
      subWalletAccountId: subAccount.accountId,
      subWalletPath: subAccount.path,
      derivationIndex: subAccount.derivationIndex,
      
      // Funding info
      fundingAccountId: userConfig.funding.fromAccountId,
      fundingAccountAddress: userConfig.funding.fromAddress,
      fundingTxHash: fundingTx.txHash,
      allocatedAmount: userConfig.funding.amount,
      tokenSymbol: userConfig.funding.tokenSymbol,
      
      // Permission info
      permissionMode: userConfig.permission.mode,
      privateKeyExported: !!privateKey,
      
      // Purpose
      purpose: request.purpose,
      
      // Timestamps
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await addAuthorization(authorization);
    
    console.log('[Authorization] Authorization created:', authId);
    
    // Log: Authorization created
    await addAuditLog({
      authorizationId: authId,
      agentId: request.agentId,
      action: 'create-authorization',
      details: {
        mode: 'IsolatedSubWallet',
        permissionMode: userConfig.permission.mode,
        allocatedAmount: userConfig.funding.amount,
        duration: `${Date.now() - startTime}ms`,
      },
      timestamp: Date.now(),
    });
    
    // Step 5: Return result
    const result: IAuthorizationResult = {
      success: true,
      authorizationId: authId,
      subWalletAddress: subAccount.address,
      subWalletAccountId: subAccount.accountId,
      subWalletPath: subAccount.path,
      derivationIndex: subAccount.derivationIndex,
      privateKey,  // Only if always-allow mode
      fundingTxHash: fundingTx.txHash,
      allocatedAmount: userConfig.funding.amount,
      permissionMode: userConfig.permission.mode,
    };
    
    console.log('[Authorization] Authorization complete');
    console.log('[Authorization] Duration:', Date.now() - startTime, 'ms');
    
    return result;
    
  } catch (error) {
    console.error('[Authorization] Failed:', error);
    
    // Log: Authorization failed
    await addAuditLog({
      authorizationId: 'failed',
      agentId: request.agentId,
      action: 'authorization-failed',
      details: {
        error: error instanceof Error ? error.message : String(error),
        duration: `${Date.now() - startTime}ms`,
      },
      timestamp: Date.now(),
    });
    
    throw error;
  }
}

/**
 * Revoke agent authorization
 * 
 * Actions:
 * 1. Mark authorization as revoked
 * 2. Transfer remaining funds back to user
 * 3. Log audit trail
 */
export async function revokeAgentAuthorization(
  authorizationId: string,
  password: string,
): Promise<void> {
  console.log('[Authorization] Revoking authorization:', authorizationId);
  
  // TODO: Implement revocation
  // 1. Get authorization record
  // 2. Check remaining balance
  // 3. Transfer back to funding account
  // 4. Update status to Revoked
  // 5. Log audit
  
  await addAuditLog({
    authorizationId,
    agentId: 'unknown',
    action: 'revoke-authorization',
    details: {
      revokedBy: 'user',
    },
    timestamp: Date.now(),
  });
}
