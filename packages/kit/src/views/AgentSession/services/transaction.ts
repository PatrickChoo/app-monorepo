/**
 * Agent Transaction Service
 * 
 * Wraps OneKey's existing transaction logic for Agent Session use.
 * Reuses ServiceSend, ServiceGas, and ServiceToken to avoid duplication.
 */

import BigNumber from 'bignumber.js';

import type { IEncodedTx, IUnsignedTxPro } from '@onekeyhq/core/src/types';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { ESendPreCheckTimingEnum } from '@onekeyhq/shared/types/send';

/**
 * Build and validate a transfer transaction
 * 
 * Reuses: ServiceSend.buildEncodedTx + ServiceGas.estimateFee + precheckUnsignedTxs
 * 
 * @returns Transaction details with validation status
 */
export async function buildAndValidateTransfer(params: {
  fromAccountId: string;
  toAddress: string;
  amount: string;
  networkId: string;
  tokenAddress?: string; // ERC20 token address (undefined = native token)
}): Promise<{
  unsignedTx: IUnsignedTxPro | null;
  feeInfo: any | null;
  encodedTx: IEncodedTx | null;
  isValid: boolean;
  error?: string;
}> {
  const { serviceSend, serviceGas } = backgroundApiProxy;
  const { fromAccountId, toAddress, amount, networkId, tokenAddress } = params;

  console.log('[AgentTx] Building transfer:', {
    from: fromAccountId,
    to: toAddress,
    amount,
    tokenAddress: tokenAddress || 'native',
  });

  try {
    // 1. Build transfer info
    const transferInfo = tokenAddress
      ? {
          // ERC20 token transfer
          to: tokenAddress, // Contract address
          amount,
          tokenIdOnNetwork: tokenAddress,
          isNFT: false,
        }
      : {
          // Native token transfer
          to: toAddress,
          amount,
        };

    // 2. Build encoded transaction
    const encodedTxResult = await serviceSend.buildEncodedTx({
      networkId,
      accountId: fromAccountId,
      transfersInfo: [transferInfo],
    });

    const { encodedTx } = encodedTxResult;

    console.log('[AgentTx] Encoded tx built:', encodedTx);

    // 3. Estimate gas fee
    const feeInfo = await serviceGas.estimateFee({
      networkId,
      accountId: fromAccountId,
      encodedTx,
    });

    console.log('[AgentTx] Fee estimated:', {
      totalNative: feeInfo.totalNative,
      totalFiat: feeInfo.totalFiat,
    });

    // 4. Build unsigned transaction
    const unsignedTxs = await serviceSend.buildUnsignedTxs({
      networkId,
      accountId: fromAccountId,
      encodedTx,
    });

    const unsignedTx = unsignedTxs[0];

    // 5. Pre-check transaction (balance, format, nonce, etc.)
    await serviceSend.precheckUnsignedTxs({
      networkId,
      accountId: fromAccountId,
      unsignedTxs: [unsignedTx],
      precheckTiming: ESendPreCheckTimingEnum.Confirm,
      feeInfos: [{ feeInfo }],
    });

    console.log('[AgentTx] Pre-check passed');

    return {
      unsignedTx,
      feeInfo,
      encodedTx,
      isValid: true,
    };
  } catch (error) {
    console.error('[AgentTx] Build and validate failed:', error);
    return {
      unsignedTx: null,
      feeInfo: null,
      encodedTx: null,
      isValid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if account has sufficient balance for transfer
 * 
 * Reuses: ServiceToken.fetchAccountTokens
 * 
 * @param includeGasFee - If true, checks balance covers amount + gas (for native token only)
 * @returns Balance check result with shortfall if insufficient
 */
export async function checkSufficientBalance(params: {
  accountId: string;
  networkId: string;
  amount: string;
  tokenAddress?: string;
  includeGasFee: boolean;
  estimatedGasFee?: string;
}): Promise<{
  isSufficient: boolean;
  currentBalance: string;
  requiredAmount: string;
  shortfall?: string;
}> {
  const { serviceToken } = backgroundApiProxy;
  const {
    accountId,
    networkId,
    amount,
    tokenAddress,
    includeGasFee,
    estimatedGasFee,
  } = params;

  console.log('[AgentTx] Checking balance:', {
    accountId,
    amount,
    tokenAddress: tokenAddress || 'native',
    includeGasFee,
    estimatedGasFee,
  });

  try {
    // Fetch account tokens
    const tokens = await serviceToken.fetchAccountTokens({
      networkId,
      accountId,
    });

    // Find the token balance
    let currentBalance = '0';

    if (tokenAddress) {
      // ERC20 token balance
      const token = tokens.tokens.find(
        (t) => t.address?.toLowerCase() === tokenAddress.toLowerCase(),
      );
      currentBalance = token?.balanceParsed || '0';
    } else {
      // Native token balance
      const nativeToken = tokens.tokens.find((t) => !t.address);
      currentBalance = nativeToken?.balanceParsed || '0';
    }

    let requiredAmount = amount;

    // If checking native token transfer, include gas fee
    if (includeGasFee && estimatedGasFee && !tokenAddress) {
      requiredAmount = new BigNumber(amount).plus(estimatedGasFee).toFixed();
    }

    const isSufficient = new BigNumber(currentBalance).gte(requiredAmount);

    const result = {
      isSufficient,
      currentBalance,
      requiredAmount,
      shortfall: isSufficient
        ? undefined
        : new BigNumber(requiredAmount).minus(currentBalance).toFixed(),
    };

    console.log('[AgentTx] Balance check result:', result);

    return result;
  } catch (error) {
    console.error('[AgentTx] Balance check failed:', error);
    throw new Error(
      `Failed to check balance: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Execute a transfer transaction (full flow)
 * 
 * Reuses: buildAndValidateTransfer + ServiceSend.updateUnSignedTxBeforeSending + signAndSendTransaction
 * 
 * @returns Transaction result with txHash on success
 */
export async function executeTransfer(params: {
  fromAccountId: string;
  toAddress: string;
  amount: string;
  networkId: string;
  tokenAddress?: string;
  password: string;
}): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> {
  const { serviceSend } = backgroundApiProxy;
  const { password, ...buildParams } = params;

  console.log('[AgentTx] Executing transfer:', buildParams);

  try {
    // 1. Build and validate transaction
    const { unsignedTx, feeInfo, isValid, error } =
      await buildAndValidateTransfer(buildParams);

    if (!isValid || !unsignedTx || !feeInfo) {
      return {
        success: false,
        error: error || 'Transaction validation failed',
      };
    }

    // 2. Update unsigned tx with fee info
    const finalUnsignedTxs = await serviceSend.updateUnSignedTxBeforeSending({
      accountId: params.fromAccountId,
      networkId: params.networkId,
      unsignedTxs: [unsignedTx],
      feeInfos: [{ feeInfo }],
      feeInfoEditable: false,
    });

    console.log('[AgentTx] Unsigned tx updated with fee');

    // 3. Sign and broadcast transaction
    const result = await serviceSend.signAndSendTransaction({
      networkId: params.networkId,
      accountId: params.fromAccountId,
      unsignedTxs: finalUnsignedTxs,
      signedTxs: [],
      signOnly: false,
      password,
      feeInfos: [{ feeInfo }],
    });

    const txHash = result[0]?.txid;

    console.log('[AgentTx] Transaction broadcasted:', txHash);

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    console.error('[AgentTx] Execute transfer failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
