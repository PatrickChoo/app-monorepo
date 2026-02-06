/**
 * Agent Authorization Service
 * 
 * Handles the complete authorization flow for AI agents:
 * 1. Derive agent account from user's wallet with dedicated derivation range (10,000+)
 * 2. Transfer funds from user's account to agent account
 * 3. Export private key if always-allow mode
 * 4. Create authorization record with audit logs
 */

import simpleDb from '@onekeyhq/kit-bg/src/dbs/simple/simpleDb';

import {
  EAgentAuthorizationMode,
  EAgentAuthorizationStatus,
  type IAgentAuthorization,
} from '../types';
import { deriveAccountForAgent, transferBetweenAccounts, exportPrivateKey, promptPassword } from './wallet';
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
  agentAccountAddress: string;
  agentAccountId: string;
  agentAccountPath: string;
  agentAccountIndex: number;
  privateKey?: string;        // Only returned in always-allow mode
  fundingTxHash: string;
  allocatedAmount: string;
  permissionMode: 'ask-every-time' | 'always-allow';
}

/**
 * Create agent authorization
 * 
 * Complete flow:
 * 1. Derive agent account from user's wallet in agent-dedicated range (index 10,000+)
 * 2. Transfer funds from user's selected account to agent account
 * 3. Export private key if always-allow mode
 * 4. Create authorization record
 * 5. Log audit trail
 * 
 * @param request - Agent's authorization request
 * @param userConfig - User's configuration
 * @returns Authorization result with agent account info
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
    
    // Step 1: Derive agent account
    console.log('[Authorization] Step 1: Deriving agent account...');
    const agentAccount = await deriveAccountForAgent({
      walletId: userConfig.walletId,
      networkId: request.chainId,
      agentId: request.agentId,
      agentName: request.agentName,
      reuseIfExists: true,
    });
    
    console.log('[Authorization] Agent account derived:', {
      address: agentAccount.address,
      path: agentAccount.path,
      index: agentAccount.derivationIndex,
      isNew: agentAccount.isNewAccount,
    });
    
    // Register to agent account registry (if new account)
    if (agentAccount.isNewAccount) {
      const { registerAgentAccount } = await import('./agentAccountRegistry');
      await registerAgentAccount({
        accountId: agentAccount.accountId,
        address: agentAccount.address,
        derivationIndex: agentAccount.derivationIndex,
        derivationPath: agentAccount.path,
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
        address: agentAccount.address,
        path: agentAccount.path,
        derivationIndex: agentAccount.derivationIndex,
        isNewAccount: agentAccount.isNewAccount,
      },
      timestamp: Date.now(),
    });
    
    // Step 2: Transfer funds
    console.log('[Authorization] Step 2: Transferring funds...');
    const fundingTx = await transferBetweenAccounts({
      fromAccountId: userConfig.funding.fromAccountId,
      toAddress: agentAccount.address,
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
        toAddress: agentAccount.address,
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
        accountId: agentAccount.accountId,
        password,
      });
      console.log('[Authorization] Private key exported');
      
      // Update account name to reflect private key export
      const { updateAgentAccountName } = await import('./wallet');
      await updateAgentAccountName({
        accountId: agentAccount.accountId,
        agentName: request.agentName,
        derivationIndex: agentAccount.derivationIndex,
        privateKeyExported: true,  // ← Changed
        status: 'active',
      });
      
      // Log: Private key export (sensitive operation)
      await addAuditLog({
        authorizationId: 'pending',
        agentId: request.agentId,
        action: 'export-private-key',
        details: {
          accountId: agentAccount.accountId,
          address: agentAccount.address,
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
      
      // Agent account info
      agentAccountAddress: agentAccount.address,
      agentAccountId: agentAccount.accountId,
      agentAccountPath: agentAccount.path,
      agentAccountIndex: agentAccount.derivationIndex,
      sourceWalletId: userConfig.walletId,
      
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
    if (agentAccount.isNewAccount) {
      // Update the authorizationId in registry
      await simpleDb.agentAccountRegistry.updateAuthorizationId(
        agentAccount.accountId,
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
      agentAccountAddress: agentAccount.address,
      agentAccountId: agentAccount.accountId,
      agentAccountPath: agentAccount.path,
      agentAccountIndex: agentAccount.derivationIndex,
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
    if (authorization.agentAccountId) {
      const { updateAgentAccountName } = await import('./wallet');
      await updateAgentAccountName({
        accountId: authorization.agentAccountId,
        agentName: authorization.agentName,
        derivationIndex: authorization.agentAccountIndex || 0,
        privateKeyExported: authorization.privateKeyExported || false,
        status: 'revoked',  // ← Changed
      });
    }
    
    // 4. Update registry status
    if (authorization.agentAccountId) {
      const { updateAgentAccountStatus } = await import('./agentAccountRegistry');
      await updateAgentAccountStatus(
        authorization.agentAccountId,
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
