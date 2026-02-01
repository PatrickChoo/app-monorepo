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
 * This creates a new account using HD derivation.
 * The account will be added to the wallet but won't be visible in the main UI.
 */
export async function deriveSubAccount(params: {
  walletId: string;
  networkId: string;
}): Promise<{
  address: string;
  accountId: string;
  path: string;
}> {
  const { walletId, networkId } = params;

  console.log('[WalletService] Deriving sub-account:', { walletId, networkId });

  try {
    // Get the next available index for this wallet
    const nextIndex = await getNextAccountIndex(walletId, networkId);

    // Derive the account using OneKey's account service
    const account = await backgroundApiProxy.serviceAccount.addHDAccount({
      walletId,
      networkId,
      indexes: [nextIndex],
      names: [`Agent Wallet #${nextIndex}`],
    });

    if (!account || account.length === 0) {
      throw new Error('Failed to derive sub-account');
    }

    const newAccount = account[0];

    console.log('[WalletService] Sub-account derived:', {
      address: newAccount.address,
      accountId: newAccount.id,
      path: newAccount.path,
    });

    return {
      address: newAccount.address,
      accountId: newAccount.id,
      path: newAccount.path || `m/44'/60'/0'/0/${nextIndex}`, // Default ETH path
    };
  } catch (error) {
    console.error('[WalletService] Failed to derive sub-account:', error);
    throw new Error(
      `Failed to derive sub-account: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get the next available account index for a wallet
 */
async function getNextAccountIndex(
  walletId: string,
  networkId: string,
): Promise<number> {
  try {
    // Get all accounts for this wallet and network
    const accounts =
      await backgroundApiProxy.serviceAccount.getAccountsOfWallet({
        walletId,
        networkId,
      });

    // Find the maximum index
    let maxIndex = -1;
    for (const account of accounts) {
      if (account.path) {
        // Extract index from path (e.g., m/44'/60'/0'/0/5 → 5)
        const match = account.path.match(/\/(\d+)$/);
        if (match) {
          const index = parseInt(match[1], 10);
          if (index > maxIndex) {
            maxIndex = index;
          }
        }
      }
    }

    // Return next index
    return maxIndex + 1;
  } catch (error) {
    console.error('[WalletService] Failed to get next account index:', error);
    return 0; // Fallback to index 0
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
