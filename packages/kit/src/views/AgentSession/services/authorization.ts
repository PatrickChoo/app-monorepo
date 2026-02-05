/**
 * Agent Authorization Service
 * 
 * Handles the complete authorization flow for AI agents:
 * 1. Derive sub-account with dedicated derivation range (10,000+)
 * 2. Transfer funds from user's account
 * 3. Export private key if always-allow mode
 * 4. Create authorization record with audit logs
 */

import simpleDb from '@onekeyhq/kit-bg/src/dbs/simple/simpleDb';

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
    
    // Register to agent account registry (if new account)
    if (subAccount.isNewAccount) {
      const { registerAgentAccount } = await import('./agentAccountRegistry');
      await registerAgentAccount({
        accountId: subAccount.accountId,
        address: subAccount.address,
        derivationIndex: subAccount.derivationIndex,
        derivationPath: subAccount.path,
        agentId: request.agentId,
        agentName: request.agentName,
        authorizationId: 'pending',  // Will be updated later
        privateKeyExported: false,    // Not exported yet
      });
    }
    
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
      
      // Update account name to reflect private key export
      const { updateAgentAccountName } = await import('./wallet');
      await updateAgentAccountName({
        accountId: subAccount.accountId,
        agentName: request.agentName,
        derivationIndex: subAccount.derivationIndex,
        privateKeyExported: true,  // ← Changed
        status: 'active',
      });
      
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
    
    // Update registry with authorization ID
    const { updateAgentAccountStatus } = await import('./agentAccountRegistry');
    if (subAccount.isNewAccount) {
      // Update the authorizationId in registry
      await simpleDb.agentAccountRegistry.updateAuthorizationId(
        subAccount.accountId,
        authId,
      );
    }
    
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
 * 2. Update account name to show revoked status
 * 3. Transfer remaining funds back to user (optional)
 * 4. Log audit trail
 */
export async function revokeAgentAuthorization(
  authorizationId: string,
  password?: string,
): Promise<void> {
  console.log('[Authorization] Revoking authorization:', authorizationId);
  
  try {
    // 1. Get authorization record
    const { getAuthorizationById, updateAuthorization } = await import('./storage');
    const authorization = await getAuthorizationById(authorizationId);
    
    if (!authorization) {
      throw new Error('Authorization not found');
    }
    
    // 2. Update authorization status
    await updateAuthorization(authorizationId, {
      status: EAgentAuthorizationStatus.Revoked,
      updatedAt: Date.now(),
    });
    
    // 3. Update account name to show revoked status
    if (authorization.subWalletAccountId) {
      const { updateAgentAccountName } = await import('./wallet');
      await updateAgentAccountName({
        accountId: authorization.subWalletAccountId,
        agentName: authorization.agentName,
        derivationIndex: authorization.derivationIndex || 0,
        privateKeyExported: authorization.privateKeyExported || false,
        status: 'revoked',  // ← Changed
      });
    }
    
    // 4. Update registry status
    if (authorization.subWalletAccountId) {
      const { updateAgentAccountStatus } = await import('./agentAccountRegistry');
      await updateAgentAccountStatus(
        authorization.subWalletAccountId,
        'revoked',
      );
    }
    
    // 5. Log audit
    await addAuditLog({
      authorizationId,
      agentId: authorization.agentId,
      action: 'revoke-authorization',
      details: {
        revokedBy: 'user',
        previousStatus: authorization.status,
      },
      timestamp: Date.now(),
    });
    
    console.log('[Authorization] Authorization revoked successfully');
    
    // TODO: Transfer remaining funds back to user (if password provided)
    // This requires checking balance and creating transfer transaction
    
  } catch (error) {
    console.error('[Authorization] Revocation failed:', error);
    throw error;
  }
}
