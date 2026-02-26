import { useCallback, useEffect, useState } from 'react';

import {
  Button,
  Dialog,
  Page,
  SizableText,
  Spinner,
  Switch,
  Toast,
  XStack,
  YStack,
} from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { EAccountSelectorSceneName } from '@onekeyhq/shared/types';

import type { IAgentAuthorizationRequest } from '../types';
import { EAgentAuthorizationMode } from '../types';
import { createAgentAuthorization } from '../services/authorization';
import type { IUserAuthorizationConfig } from '../services/authorization';

import { AuthorizationDetails } from './AuthorizationDetails';
import { ModeExplanation } from './ModeExplanation';

interface IResolvedAccount {
  accountId: string;
  address: string;
  walletId: string;
  networkId: string;
}

interface IAuthorizationModalProps {
  request: IAgentAuthorizationRequest;
  visible: boolean;
  onConfirm?: (params: { useBiometric: boolean; selectedMode: EAgentAuthorizationMode }) => void;
  onReject?: () => void;
}

export function AuthorizationModal({
  request,
  visible,
  onConfirm,
  onReject,
}: IAuthorizationModalProps) {
  const [resolvedAccount, setResolvedAccount] = useState<IResolvedAccount | null>(null);
  const [useBiometric, setUseBiometric] = useState(
    platformEnv.isNative && platformEnv.supportsBiometric,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMode, setSelectedMode] = useState<EAgentAuthorizationMode>(
    request.requestedMode || EAgentAuthorizationMode.IsolatedSubWallet,
  );
  const [fundingAmount, setFundingAmount] = useState<string>(
    request.requestedAmount || '0',
  );

  // Fetch the home scene's selected account on mount (no AccountSelector context needed)
  useEffect(() => {
    if (!visible) return;

    async function resolveAccount() {
      try {
        const selected =
          await backgroundApiProxy.simpleDb.accountSelector.getSelectedAccount({
            sceneName: EAccountSelectorSceneName.home,
            num: 0,
          });

        if (!selected?.walletId || !selected?.networkId || !selected?.accountId) {
          console.warn('[AuthorizationModal] No active account selected in home scene');
          return;
        }

        const account = await backgroundApiProxy.serviceAccount.getAccount({
          networkId: selected.networkId,
          accountId: selected.accountId,
        });

        setResolvedAccount({
          accountId: account.id,
          address: account.address,
          walletId: selected.walletId,
          networkId: selected.networkId,
        });
      } catch (error) {
        console.error('[AuthorizationModal] Failed to resolve account:', error);
      }
    }

    void resolveAccount();
  }, [visible]);

  const handleConfirm = useCallback(async () => {
    if (!resolvedAccount) {
      Toast.error({
        title: 'Error',
        message: 'No active account found. Please select an account first.',
      });
      return;
    }

    try {
      setIsProcessing(true);

      const userConfig: IUserAuthorizationConfig = {
        funding: {
          fromAccountId: resolvedAccount.accountId,
          fromAddress: resolvedAccount.address,
          amount: fundingAmount,
          tokenSymbol: request.tokenSymbol || 'ETH',
        },
        permission: {
          mode: 'ask-every-time',
        },
        walletId: resolvedAccount.walletId,
      };

      const result = await createAgentAuthorization(
        { ...request, requestedMode: selectedMode },
        userConfig,
      );

      console.log('[AuthorizationModal] Authorization created:', result);

      onConfirm?.({ useBiometric, selectedMode });

      Toast.success({
        title: 'Authorization Successful',
        message: `Agent authorized: ${result.agentAccountAddress}`,
      });
    } catch (error) {
      console.error('[AuthorizationModal] Authorization failed:', error);

      let errorMessage = 'Failed to authorize agent. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('password')) {
          errorMessage = 'Invalid password. Please check and try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (error.message.includes('insufficient')) {
          errorMessage = 'Insufficient balance to complete authorization.';
        } else if (error.message.includes('bytecode')) {
          errorMessage = 'Vault Contract mode is not yet fully implemented.';
        } else {
          errorMessage = error.message;
        }
      }

      Toast.error({
        title: 'Authorization Failed',
        message: errorMessage,
      });

      onReject?.();
    } finally {
      setIsProcessing(false);
    }
  }, [resolvedAccount, useBiometric, selectedMode, request, fundingAmount, onConfirm, onReject]);

  const handleReject = useCallback(() => {
    onReject?.();
  }, [onReject]);

  if (!visible) return null;

  return (
    <Dialog
      visible={visible}
      onClose={handleReject}
      renderContent={
        <Page scrollEnabled>
          <YStack gap="$5" p="$5">
            {/* Header */}
            <YStack gap="$2" alignItems="center">
              <SizableText size="$heading2xl" fontWeight="700">
                🤖
              </SizableText>
              <SizableText size="$headingXl" fontWeight="600" textAlign="center">
                AI Agent Authorization
              </SizableText>
              <SizableText size="$bodyMd" color="$textSubdued" textAlign="center">
                Review and confirm this authorization request
              </SizableText>
            </YStack>

            {/* Current Account Info */}
            {resolvedAccount ? (
              <YStack bg="$bgSubdued" p="$3" borderRadius="$2" gap="$1">
                <SizableText size="$bodySm" color="$textSubdued">
                  Funding from
                </SizableText>
                <SizableText size="$bodyMd" fontWeight="500" numberOfLines={1}>
                  {resolvedAccount.address.slice(0, 8)}...{resolvedAccount.address.slice(-6)}
                </SizableText>
              </YStack>
            ) : (
              <YStack bg="$bgCaution" p="$3" borderRadius="$2">
                <SizableText size="$bodySm" color="$textCaution">
                  Loading account info...
                </SizableText>
              </YStack>
            )}

            {/* Authorization Details */}
            <AuthorizationDetails request={request} />

            {/* Mode Selection */}
            <YStack gap="$3">
              <SizableText size="$headingSm" fontWeight="600">
                Authorization Mode
              </SizableText>

              <XStack gap="$2">
                {[
                  EAgentAuthorizationMode.IsolatedSubWallet,
                  EAgentAuthorizationMode.VaultContract,
                  EAgentAuthorizationMode.SessionKey,
                ].map((mode) => (
                  <Button
                    key={mode}
                    flex={1}
                    variant={selectedMode === mode ? 'primary' : 'secondary'}
                    onPress={() => setSelectedMode(mode)}
                    size="small"
                  >
                    {mode === EAgentAuthorizationMode.IsolatedSubWallet && 'Sub-Wallet'}
                    {mode === EAgentAuthorizationMode.VaultContract && 'Vault'}
                    {mode === EAgentAuthorizationMode.SessionKey && 'Session Key'}
                  </Button>
                ))}
              </XStack>

              <ModeExplanation mode={selectedMode} />
            </YStack>

            {/* Biometric Authentication Option */}
            {platformEnv.isNative && platformEnv.supportsBiometric && (
              <XStack
                justifyContent="space-between"
                alignItems="center"
                bg="$bgSubdued"
                p="$3"
                borderRadius="$2"
              >
                <YStack flex={1} gap="$1">
                  <SizableText size="$bodyMd" fontWeight="500">
                    Require Biometric Confirmation
                  </SizableText>
                  <SizableText size="$bodySm" color="$textSubdued">
                    Use Face ID / Touch ID for additional security
                  </SizableText>
                </YStack>
                <Switch value={useBiometric} onChange={setUseBiometric} />
              </XStack>
            )}

            {/* Security Notice */}
            <YStack bg="$bgCaution" p="$3" borderRadius="$2">
              <SizableText size="$bodySm" color="$textCaution">
                By authorizing, you grant the AI agent permission to execute
                transactions within the specified limits. You can revoke this
                authorization at any time.
              </SizableText>
            </YStack>

            {/* Action Buttons */}
            <XStack gap="$3">
              <Button
                flex={1}
                variant="secondary"
                onPress={handleReject}
                disabled={isProcessing}
              >
                Reject
              </Button>
              <Button
                flex={1}
                variant="primary"
                onPress={handleConfirm}
                disabled={isProcessing || !resolvedAccount}
              >
                {isProcessing ? (
                  <XStack gap="$2" alignItems="center">
                    <Spinner size="small" />
                    <SizableText>Authorizing...</SizableText>
                  </XStack>
                ) : (
                  'Authorize'
                )}
              </Button>
            </XStack>
          </YStack>
        </Page>
      }
    />
  );
}
