/**
 * Wallet Service - HD Derivation and Transfer Operations
 * 
 * This service wraps OneKey's wallet APIs for Agent Session use.
 */

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';

import {
  retryBalanceQuery,
  retryBuildTransaction,
  retryFeeValidation,
} from '../utils/retry';

/**
 * Derive a new account for the agent from user's wallet
 * 
 * This creates a new account using HD derivation in the agent-dedicated range (10,000+).
 * The account name will be marked with agent info and private key export status.
 * 
 * Isolated Sub-Wallet specific operation.
 */
export async function deriveAccountForAgent(params: {
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

  console.log('[WalletService] Deriving agent account:', { walletId, networkId, agentId, agentName });

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
      throw new Error('Failed to derive agent account');
    }

    const newAccount = account[0];

    console.log('[WalletService] Agent account derived:', {
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
    console.error('[WalletService] Failed to derive agent account:', error);
    throw new Error(
      `Failed to derive agent account: ${error instanceof Error ? error.message : String(error)}`,
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
 * Transfer funds between accounts
 * 
 * This creates and broadcasts a transaction from one account to another address.
 * Used in Isolated Sub-Wallet mode to fund the agent account.
 * 
 * Performs pre-flight checks:
 * - Balance check (amount + estimated gas)
 * - Fee overflow check (server-side validation)
 */
export async function transferBetweenAccounts(params: {
  fromAccountId: string;
  toAddress: string;
  amount: string;
  networkId: string;
  password: string;
}): Promise<{
  txHash: string;
}> {
  const { fromAccountId, toAddress, amount, networkId, password } = params;

  console.log('[WalletService] Transferring between accounts:', {
    from: fromAccountId,
    to: toAddress,
    amount,
    networkId,
  });

  try {
    // Step 1: Pre-check - Get account balance (with retry)
    console.log('[WalletService] Pre-check: Fetching account balance...');
    const balances = await retryBalanceQuery(() =>
      backgroundApiProxy.serviceToken.getAccountBalances({
        accountId: fromAccountId,
        networkId,
      }),
    );

    if (!balances || balances.length === 0) {
      throw new Error('Failed to fetch account balance');
    }

    const nativeToken = balances.find((b) => b.isNative);
    if (!nativeToken) {
      throw new Error('Native token not found in balance');
    }

    const currentBalance = parseFloat(nativeToken.balance || '0');
    const transferAmount = parseFloat(amount);

    console.log('[WalletService] Balance check:', {
      current: currentBalance,
      transfer: transferAmount,
      symbol: nativeToken.symbol,
    });

    if (currentBalance < transferAmount) {
      throw new Error(
        `Insufficient balance: have ${currentBalance} ${nativeToken.symbol}, need ${transferAmount} ${nativeToken.symbol}`,
      );
    }

    // Step 2: Build transaction (with retry)
    console.log('[WalletService] Building transaction...');
    const encodedTx = {
      to: toAddress,
      value: amount,
      data: '0x', // Simple transfer
    };

    const unsignedTx = await retryBuildTransaction(() =>
      backgroundApiProxy.serviceSend.buildUnsignedTx({
        accountId: fromAccountId,
        networkId,
        encodedTx,
      }),
    );

    console.log('[WalletService] Unsigned tx built');

    // Step 3: Pre-check - Fee overflow validation (server-side, with retry)
    console.log('[WalletService] Pre-check: Validating fee...');
    const feeInfo = unsignedTx.feeInfo;
    if (feeInfo) {
      const accountAddress = await backgroundApiProxy.serviceAccount.getAccountAddressForApi({
        accountId: fromAccountId,
        networkId,
      });

      const isFeeOverflow = await retryFeeValidation(() =>
        backgroundApiProxy.serviceSend.preCheckIsFeeInfoOverflow({
          encodedTx,
          feeAmount: feeInfo.totalNative || '0',
          feeTokenSymbol: nativeToken.symbol,
          networkId,
          accountAddress,
        }),
      );

      if (isFeeOverflow) {
        console.warn('[WalletService] Fee is extremely high!');
        // Log warning but don't block (user already confirmed in UI)
      }

      // Step 4: Final balance check (amount + gas)
      const estimatedGas = parseFloat(feeInfo.totalNative || '0');
      const totalRequired = transferAmount + estimatedGas;

      console.log('[WalletService] Final balance check:', {
        current: currentBalance,
        amount: transferAmount,
        gas: estimatedGas,
        total: totalRequired,
      });

      if (currentBalance < totalRequired) {
        throw new Error(
          `Insufficient balance for gas: have ${currentBalance} ${nativeToken.symbol}, need ${totalRequired} ${nativeToken.symbol} (${transferAmount} + ${estimatedGas} gas)`,
        );
      }
    }

    // Step 5: Sign transaction (using password already obtained)
    console.log('[WalletService] Signing transaction...');
    
    // Get vault instance to sign with provided password (avoid re-prompting)
    const { vaultFactory } = await import('@onekeyhq/kit-bg/src/vaults/factory');
    const vault = await vaultFactory.getVault({ networkId, accountId: fromAccountId });
    
    const signedTx = await vault.signTransaction({
      unsignedTx,
      password,
      deviceParams: undefined, // Software wallet only for now
      signOnly: false,
    });

    console.log('[WalletService] Broadcasting transaction...');
    
    // Get account address for broadcast
    const accountAddress = await backgroundApiProxy.serviceAccount.getAccountAddressForApi({
      accountId: fromAccountId,
      networkId,
    });
    
    const result = await backgroundApiProxy.serviceSend.broadcastTransaction({
      accountId: fromAccountId,
      networkId,
      accountAddress,
      signedTx,
      signature: undefined,
      rawTxType: undefined,
      tronResourceRentalInfo: undefined,
      useDefaultRpc: false,
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
 * This triggers OneKey's built-in password modal with context.
 * 
 * @param reason - Reason for password prompt (default: CreateTransaction)
 */
export async function promptPassword(
  reason?: import('@onekeyhq/shared/types/setting').EReasonForNeedPassword,
): Promise<string> {
  const { EReasonForNeedPassword } = await import(
    '@onekeyhq/shared/types/setting'
  );

  try {
    const password =
      await backgroundApiProxy.servicePassword.promptPasswordVerify({
        reason: reason || EReasonForNeedPassword.CreateTransaction,
      });
    return password;
  } catch (error) {
    console.error('[WalletService] Password prompt failed:', error);
    throw new Error('Password verification failed');
  }
}

/**
 * Export private key from account
 * 
 * Used in always-allow mode to export agent account's private key.
 * 
 * ⚠️ Security sensitive operation - logs to audit trail.
 */
export async function exportPrivateKey(params: {
  accountId: string;
  password: string;
}): Promise<string> {
  const { accountId, password } = params;

  console.log('[WalletService] Exporting private key for account:', accountId);

  try {
    // Get account credentials from OneKey
    const credentials =
      await backgroundApiProxy.serviceAccount.getAccountCredentials({
        accountId,
        password,
      });

    if (!credentials || !credentials.privateKey) {
      throw new Error('Failed to export private key');
    }

    console.log('[WalletService] Private key exported successfully');

    return credentials.privateKey;
  } catch (error) {
    console.error('[WalletService] Failed to export private key:', error);
    throw new Error(
      `Failed to export private key: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
