/**
 * Transaction Executor
 * 
 * Handles transaction execution for different authorization modes
 */

import type {
  IEncodedTx,
  ISignedTxPro,
  IUnsignedTxPro,
} from '@onekeyhq/core/src/types';

/**
 * Execute transaction with Mode A (Isolated Sub-Wallet)
 * 
 * @param params - Transaction parameters
 * @returns Transaction hash
 */
export async function executeWithSubWallet(params: {
  subWalletAccountId: string;
  subWalletAddress: string;
  to: string;
  amount: string;
  networkId: string;
  tokenAddress?: string; // For ERC20 transfers
  data?: string; // Contract call data
}): Promise<string> {
  console.log('[Executor] Executing with sub-wallet:', params);

  try {
    const backgroundApiProxy = (
      await import('@onekeyhq/kit/src/background/instance/backgroundApiProxy')
    ).default;
    const { vaultFactory } = await import('@onekeyhq/kit-bg/src/vaults/factory');

    const {
      subWalletAccountId,
      subWalletAddress,
      to,
      amount,
      networkId,
      tokenAddress,
      data,
    } = params;

    // 1. Get vault instance
    const vault = await vaultFactory.getVault({
      networkId,
      accountId: subWalletAccountId,
    });

    // 2. Build transfer info
    const transfersInfo = [
      {
        from: subWalletAddress,
        to,
        amount,
        token: tokenAddress || networkId, // Use token address or native token
      },
    ];

    // 3. Build unsigned transaction
    const unsignedTx = await backgroundApiProxy.serviceSend.buildUnsignedTx({
      networkId,
      accountId: subWalletAccountId,
      transfersInfo,
    });

    console.log('[Executor] Built unsigned tx:', unsignedTx);

    // 4. Sign transaction
    // This will use the sub-wallet's private key
    const signedTx = await vault.signTransaction({
      unsignedTx,
    });

    console.log('[Executor] Signed tx:', signedTx.txid);

    // 5. Broadcast transaction
    const result = await backgroundApiProxy.serviceSend.broadcastTransaction({
      networkId,
      accountId: subWalletAccountId,
      signedTx,
      accountAddress: subWalletAddress,
    });

    console.log('[Executor] Broadcasted tx:', result.txid);

    return result.txid;
  } catch (error) {
    console.error('[Executor] Transaction execution failed:', error);
    throw error;
  }
}

/**
 * Execute transaction with Mode B (Vault Contract)
 * 
 * @param params - Transaction parameters
 * @returns Transaction hash
 */
export async function executeWithVaultContract(params: {
  vaultContractAddress: string;
  ownerAccountId: string;
  ownerAddress: string;
  targetAddress: string;
  amount: string;
  networkId: string;
  data?: string;
}): Promise<string> {
  console.log('[Executor] Executing with vault contract:', params);

  // TODO: Implement vault contract execution
  // 1. Encode contract call: vaultContract.execute(target, value, data)
  // 2. Build unsigned transaction
  // 3. Sign with owner account
  // 4. Broadcast transaction

  throw new Error(
    'Mode B (Vault Contract) execution not yet implemented. Need contract ABI and deployment.',
  );
}

/**
 * Execute transaction with Mode C (AA + Session Key)
 * 
 * @param params - Transaction parameters
 * @returns Transaction hash
 */
export async function executeWithSessionKey(params: {
  aaAccountAddress: string;
  sessionKeyPrivateKey: string;
  targetAddress: string;
  amount: string;
  networkId: string;
  data?: string;
}): Promise<string> {
  console.log('[Executor] Executing with session key:', params);

  // TODO: Implement AA session key execution
  // 1. Build UserOperation with session key signature
  // 2. Submit to bundler
  // 3. Wait for transaction inclusion

  throw new Error(
    'Mode C (AA + Session Key) execution not yet implemented. Need OneKey AA integration.',
  );
}

/**
 * Get balance of an account
 * 
 * @param params - Account parameters
 * @returns Balance in native units
 */
export async function getAccountBalance(params: {
  accountId: string;
  networkId: string;
  tokenAddress?: string;
}): Promise<string> {
  console.log('[Executor] Getting account balance:', params);

  try {
    const backgroundApiProxy = (
      await import('@onekeyhq/kit/src/background/instance/backgroundApiProxy')
    ).default;

    const { accountId, networkId, tokenAddress } = params;

    // Fetch account tokens
    const tokens = await backgroundApiProxy.serviceToken.fetchAccountTokens({
      networkId,
      accountId,
    });

    // Find the requested token
    let balance = '0';

    if (tokenAddress) {
      // Find ERC20 token
      const token = tokens.tokens.find(
        (t) => t.address?.toLowerCase() === tokenAddress.toLowerCase(),
      );
      balance = token?.balanceParsed || '0';
    } else {
      // Native token balance
      balance = tokens.tokens.find((t) => !t.address)?.balanceParsed || '0';
    }

    console.log('[Executor] Account balance:', balance);

    return balance;
  } catch (error) {
    console.error('[Executor] Failed to get balance:', error);
    throw error;
  }
}
