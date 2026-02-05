/**
 * Wallet Service - HD Derivation and Transfer Operations
 * 
 * This service wraps OneKey's wallet APIs for Agent Session use.
 */

import type {
  IAccountDeriveTypes,
  IAccountSelectorActiveAccountInfo,
} from '@onekeyhq/kit-bg/src/dbs/simple/entity/SimpleDbEntityAccountSelector';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { getNetworkIdImpl } from '@onekeyhq/shared/src/engine/engineConsts';

/**
 * Derive a new sub-account for the agent
 * 
 * This creates a new account using HD derivation in the agent-dedicated range (10,000+).
 * The account name will be marked with agent info and private key export status.
 */
export async function deriveSubAccount(params: {
  walletId: string;
  networkId: string;
  agentId: string;
  agentName: string;
  reuseIfExists?: boolean;
}): Promise<{
  address: string;
  accountId: string;
  path: string;
  derivationIndex: number;
  isNewAccount: boolean;
}> {
  const { walletId, networkId, agentId, agentName, reuseIfExists = true } = params;

  console.log('[WalletService] Deriving sub-account:', { walletId, networkId, agentId, agentName });

  try {
    // 1. Check if this agent already has an account (if reuse is enabled)
    if (reuseIfExists) {
      const { getAgentAccountByAgent } = await import('./agentAccountRegistry');
      const existing = await getAgentAccountByAgent(agentId, networkId);
      
      if (existing) {
        console.log('[WalletService] Reusing existing agent account:', existing.address);
        return {
          address: existing.address,
          accountId: existing.accountId,
          path: existing.derivationPath,
          derivationIndex: existing.derivationIndex,
          isNewAccount: false,
        };
      }
    }

    // 2. Get next available agent derivation index
    const { getNextAgentDerivationIndex } = await import('./agentAccountRegistry');
    const nextIndex = await getNextAgentDerivationIndex(networkId);
    
    console.log('[WalletService] Next agent index:', nextIndex);

    // 3. Generate account name with status markers
    const { generateAgentAccountName } = await import('./agentAccountRegistry');
    const accountName = generateAgentAccountName({
      agentName,
      derivationIndex: nextIndex,
      privateKeyExported: false,  // Not exported yet
      status: 'active',
    });

    // 4. Derive the account using OneKey's account service
    const account = await backgroundApiProxy.serviceAccount.addHDAccount({
      walletId,
      networkId,
      indexes: [nextIndex],
      names: [accountName],  // Use generated name
    });

    if (!account || account.length === 0) {
      throw new Error('Failed to derive sub-account');
    }

    const newAccount = account[0];

    console.log('[WalletService] Sub-account derived:', {
      address: newAccount.address,
      accountId: newAccount.id,
      path: newAccount.path,
      name: accountName,
    });

    return {
      address: newAccount.address,
      accountId: newAccount.id,
      path: newAccount.path || `m/44'/60'/0'/0/${nextIndex}`,
      derivationIndex: nextIndex,
      isNewAccount: true,
    };
  } catch (error) {
    console.error('[WalletService] Failed to derive sub-account:', error);
    throw new Error(
      `Failed to derive sub-account: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Update agent account name
 * 
 * Called when:
 * - Private key is exported
 * - Authorization is revoked
 * - Status changes
 */
export async function updateAgentAccountName(params: {
  accountId: string;
  agentName: string;
  derivationIndex: number;
  privateKeyExported: boolean;
  status: 'active' | 'revoked' | 'one-time-used';
}): Promise<void> {
  try {
    const { generateAgentAccountName } = await import('./agentAccountRegistry');
    const newName = generateAgentAccountName(params);
    
    // Update account name in OneKey
    await backgroundApiProxy.serviceAccount.updateAccount({
      accountId: params.accountId,
      name: newName,
    });
    
    console.log('[WalletService] Updated account name:', params.accountId, '->', newName);
  } catch (error) {
    console.error('[WalletService] Failed to update account name:', error);
    throw error;
  }
}

/**
 * Transfer funds to a sub-account
 * 
 * This creates and broadcasts a transaction from the main account to the sub-account.
 */
export async function transferToSubAccount(params: {
  fromAccountId: string;
  toAddress: string;
  amount: string;
  networkId: string;
  password: string;
}): Promise<{
  txHash: string;
}> {
  const { fromAccountId, toAddress, amount, networkId, password } = params;

  console.log('[WalletService] Transferring to sub-account:', {
    from: fromAccountId,
    to: toAddress,
    amount,
    networkId,
  });

  try {
    // Build transaction
    const unsignedTx = await backgroundApiProxy.serviceSend.buildUnsignedTx({
      accountId: fromAccountId,
      networkId,
      encodedTx: {
        to: toAddress,
        value: amount,
        data: '0x', // Simple transfer
      },
    });

    console.log('[WalletService] Unsigned tx built:', unsignedTx);

    // Sign and broadcast transaction
    const signedTx = await backgroundApiProxy.serviceSend.signTransaction({
      accountId: fromAccountId,
      networkId,
      unsignedTx,
      password,
    });

    const result = await backgroundApiProxy.serviceSend.broadcastTransaction({
      accountId: fromAccountId,
      networkId,
      signedTx,
    });

    console.log('[WalletService] Transaction broadcasted:', result.txid);

    return {
      txHash: result.txid,
    };
  } catch (error) {
    console.error('[WalletService] Transfer failed:', error);
    throw new Error(
      `Transfer failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get account balance
 */
export async function getAccountBalance(params: {
  accountId: string;
  networkId: string;
}): Promise<{
  balance: string;
  symbol: string;
}> {
  const { accountId, networkId } = params;

  try {
    const balances = await backgroundApiProxy.serviceToken.getAccountBalances({
      accountId,
      networkId,
    });

    if (!balances || balances.length === 0) {
      return {
        balance: '0',
        symbol: 'ETH', // Default
      };
    }

    // Return native token balance
    const nativeBalance = balances.find((b) => b.isNative);

    return {
      balance: nativeBalance?.balance || '0',
      symbol: nativeBalance?.symbol || 'ETH',
    };
  } catch (error) {
    console.error('[WalletService] Failed to get balance:', error);
    return {
      balance: '0',
      symbol: 'ETH',
    };
  }
}

/**
 * Prompt user for password
 * 
 * This triggers OneKey's built-in password modal.
 */
export async function promptPassword(): Promise<string> {
  try {
    const password =
      await backgroundApiProxy.servicePassword.promptPasswordVerify();
    return password;
  } catch (error) {
    console.error('[WalletService] Password prompt failed:', error);
    throw new Error('Password verification failed');
  }
}
