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
 * Execute transaction with Isolated Agent Account
 * 
 * @param params - Transaction parameters
 * @returns Transaction hash
 */
export async function executeWithAgentAccount(params: {
  agentAccountId: string;
  agentAccountAddress: string;
  to: string;
  amount: string;
  networkId: string;
  tokenAddress?: string; // For ERC20 transfers
  data?: string; // Contract call data
}): Promise<string> {
  console.log('[Executor] Executing with agent account:', params);

  try {
    const backgroundApiProxy = (
      await import('@onekeyhq/kit/src/background/instance/backgroundApiProxy')
    ).default;
    const { vaultFactory } = await import('@onekeyhq/kit-bg/src/vaults/factory');

    const {
      agentAccountId,
      agentAccountAddress,
      to,
      amount,
      networkId,
      tokenAddress,
      data,
    } = params;

    // 1. Get vault instance
    const vault = await vaultFactory.getVault({
      networkId,
      accountId: agentAccountId,
    });

    // 2. Build transfer info
    const transfersInfo = [
      {
        from: agentAccountAddress,
        to,
        amount,
        token: tokenAddress || networkId, // Use token address or native token
      },
    ];

    // 3. Build unsigned transaction
    const unsignedTx = await backgroundApiProxy.serviceSend.buildUnsignedTx({
      networkId,
      accountId: agentAccountId,
      transfersInfo,
    });

    console.log('[Executor] Built unsigned tx:', unsignedTx);

    // 4. Sign transaction
    // This will use the agent account's private key
    const signedTx = await vault.signTransaction({
      unsignedTx,
    });

    console.log('[Executor] Signed tx:', signedTx.txid);

    // 5. Broadcast transaction
    const result = await backgroundApiProxy.serviceSend.broadcastTransaction({
      networkId,
      accountId: agentAccountId,
      signedTx,
      accountAddress: agentAccountAddress,
    });

    console.log('[Executor] Broadcasted tx:', result.txid);

    return result.txid;
  } catch (error) {
    console.error('[Executor] Transaction execution failed:', error);
    throw error;
  }
}

/**
 * Execute transaction with Vault Contract
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
    'Vault Contract execution not yet implemented. Need contract ABI and deployment.',
  );
}

/**
 * Execute transaction with Session Key (AA)
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
    'Session Key (AA) execution not yet implemented. Need OneKey AA integration.',
  );
}

/**
 * @deprecated Use executeWithAgentAccount instead
 * Backward compatibility alias
 */
export async function executeWithSubWallet(params: {
  subWalletAccountId: string;
  subWalletAddress: string;
  to: string;
  amount: string;
  networkId: string;
  tokenAddress?: string;
  data?: string;
}): Promise<string> {
  return executeWithAgentAccount({
    agentAccountId: params.subWalletAccountId,
    agentAccountAddress: params.subWalletAddress,
    to: params.to,
    amount: params.amount,
    networkId: params.networkId,
    tokenAddress: params.tokenAddress,
    data: params.data,
  });
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
