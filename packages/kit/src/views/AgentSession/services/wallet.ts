/**
 * Agent Session Wallet Service
 * 
 * Handles wallet operations for Agent Sessions (Mode A: Derived Sub-Accounts)
 */

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import vaultFactory from '@onekeyhq/kit-bg/src/vaults/factory';
import type { IUnsignedTxPro } from '@onekeyhq/kit-bg/src/vaults/types';

/**
 * Get current active wallet
 */
export async function getActiveWallet(): Promise<{
  walletId: string;
  accountId: string;
  address: string;
  networkId: string;
}> {
  try {
    // Get active account
    const activeAccount = await backgroundApiProxy.serviceAccount.getActiveAccount();
    
    if (!activeAccount.account || !activeAccount.wallet) {
      throw new Error('No active account found');
    }

    return {
      walletId: activeAccount.wallet.id,
      accountId: activeAccount.account.id,
      address: activeAccount.account.address,
      networkId: activeAccount.network?.id || '',
    };
  } catch (error) {
    console.error('[WalletService] Failed to get active wallet:', error);
    throw error;
  }
}

/**
 * Derive a sub-account for Agent Session (Mode A)
 * 
 * Creates a new HD account with the next available index
 * This account will be used as an isolated wallet for the agent
 */
export async function deriveSubAccount(params: {
  walletId: string;
  networkId: string;
}): Promise<{
  accountId: string;
  address: string;
  path: string;
  index: number;
}> {
  try {
    const { walletId, networkId } = params;

    console.log('[WalletService] Deriving sub-account...', { walletId, networkId });

    // Add next HD account
    const result = await backgroundApiProxy.serviceAccount.addHDNextIndexedAccount({
      walletId,
    });

    if (!result?.account) {
      throw new Error('Failed to create HD account');
    }

    const account = result.account;

    // Get address for the specific network
    const vault = await vaultFactory.getVault({
      networkId,
      accountId: account.id,
    });

    const addressDetail = await vault.buildAccountAddressDetail({
      account,
      networkId,
    });

    console.log('[WalletService] Sub-account derived successfully:', {
      accountId: account.id,
      address: addressDetail.address,
      path: account.path,
    });

    return {
      accountId: account.id,
      address: addressDetail.address,
      path: account.path || '',
      index: result.indexedAccount?.index || 0,
    };
  } catch (error) {
    console.error('[WalletService] Failed to derive sub-account:', error);
    throw error;
  }
}

/**
 * Transfer funds to sub-account (Mode A initial funding)
 * 
 * Transfers native tokens from main account to the agent's sub-account
 */
export async function transferToSubAccount(params: {
  fromAccountId: string;
  toAddress: string;
  amount: string; // In base unit (wei for ETH)
  networkId: string;
  password: string;
}): Promise<{
  txHash: string;
  signedTx: any;
}> {
  try {
    const { fromAccountId, toAddress, amount, networkId, password } = params;

    console.log('[WalletService] Initiating transfer to sub-account...', {
      fromAccountId,
      toAddress,
      amount,
      networkId,
    });

    // Get from account details
    const fromAccount = await backgroundApiProxy.serviceAccount.getAccount({
      accountId: fromAccountId,
      networkId,
    });

    if (!fromAccount) {
      throw new Error(`Account not found: ${fromAccountId}`);
    }

    // Get vault instance
    const vault = await vaultFactory.getVault({
      networkId,
      accountId: fromAccountId,
    });

    // Build unsigned transaction
    const unsignedTx = await backgroundApiProxy.serviceSend.buildUnsignedTx({
      accountId: fromAccountId,
      networkId,
      transfersInfo: [
        {
          from: fromAccount.address,
          to: toAddress,
          amount,
          tokenInfo: {
            address: '', // Native token
            isNative: true,
          },
        },
      ],
    });

    console.log('[WalletService] Unsigned tx built:', unsignedTx);

    // Sign transaction
    const signedTx = await vault.signTransaction({
      unsignedTx: unsignedTx as IUnsignedTxPro,
      password,
    });

    console.log('[WalletService] Transaction signed');

    // Broadcast transaction
    const result = await backgroundApiProxy.serviceSend.broadcastTransaction({
      accountId: fromAccountId,
      networkId,
      signedTx,
      accountAddress: fromAccount.address,
    });

    console.log('[WalletService] Transfer successful:', result.txid);

    return {
      txHash: result.txid,
      signedTx,
    };
  } catch (error) {
    console.error('[WalletService] Transfer failed:', error);
    throw error;
  }
}

/**
 * Execute transaction from sub-account (Mode A transaction)
 * 
 * Signs and broadcasts a transaction using the agent's sub-account
 */
export async function executeFromSubAccount(params: {
  subAccountId: string;
  to: string;
  amount: string; // In base unit
  networkId: string;
  password: string;
  data?: string; // Optional contract call data
}): Promise<{
  txHash: string;
  signedTx: any;
}> {
  try {
    const { subAccountId, to, amount, networkId, password, data } = params;

    console.log('[WalletService] Executing from sub-account...', {
      subAccountId,
      to,
      amount,
      networkId,
      hasData: !!data,
    });

    // Get sub-account details
    const subAccount = await backgroundApiProxy.serviceAccount.getAccount({
      accountId: subAccountId,
      networkId,
    });

    if (!subAccount) {
      throw new Error(`Sub-account not found: ${subAccountId}`);
    }

    // Get vault instance
    const vault = await vaultFactory.getVault({
      networkId,
      accountId: subAccountId,
    });

    // Build unsigned transaction
    const encodedTx = await vault.buildEncodedTx({
      transfersInfo: [
        {
          from: subAccount.address,
          to,
          amount,
          tokenInfo: {
            address: '',
            isNative: true,
          },
        },
      ],
    });

    // Add custom data if provided (for contract calls)
    if (data) {
      encodedTx.data = data;
    }

    const unsignedTx = await vault.buildUnsignedTx({ encodedTx });

    console.log('[WalletService] Unsigned tx built:', unsignedTx);

    // Sign transaction
    const signedTx = await vault.signTransaction({
      unsignedTx: unsignedTx as IUnsignedTxPro,
      password,
    });

    console.log('[WalletService] Transaction signed');

    // Broadcast transaction
    const result = await backgroundApiProxy.serviceSend.broadcastTransaction({
      accountId: subAccountId,
      networkId,
      signedTx,
      accountAddress: subAccount.address,
    });

    console.log('[WalletService] Execution successful:', result.txid);

    return {
      txHash: result.txid,
      signedTx,
    };
  } catch (error) {
    console.error('[WalletService] Execution failed:', error);
    throw error;
  }
}

/**
 * Get account balance
 */
export async function getAccountBalance(params: {
  accountId: string;
  networkId: string;
}): Promise<{
  nativeBalance: string;
  tokens: Array<{
    address: string;
    symbol: string;
    balance: string;
  }>;
}> {
  try {
    const { accountId, networkId } = params;

    // Get account tokens
    const tokens = await backgroundApiProxy.serviceToken.fetchAccountTokens({
      accountId,
      networkId,
    });

    // Find native token
    const nativeToken = tokens.tokens.find((t) => t.isNative);

    return {
      nativeBalance: nativeToken?.balanceParsed || '0',
      tokens: tokens.tokens.map((t) => ({
        address: t.address,
        symbol: t.symbol,
        balance: t.balanceParsed,
      })),
    };
  } catch (error) {
    console.error('[WalletService] Failed to get balance:', error);
    throw error;
  }
}
