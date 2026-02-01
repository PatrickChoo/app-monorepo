import { useCallback, useState } from 'react';

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
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import type { IAgentAuthorizationRequest } from '../types';
import { EAgentAuthorizationMode } from '../types';

import { AuthorizationDetails } from './AuthorizationDetails';
import { ModeExplanation } from './ModeExplanation';

interface IAuthorizationModalProps {
  request: IAgentAuthorizationRequest;
  visible: boolean;
  onConfirm: (params: {
    useBiometric: boolean;
    selectedMode: EAgentAuthorizationMode;
  }) => Promise<void>;
  onReject: () => void;
}

export function AuthorizationModal({
  request,
  visible,
  onConfirm,
  onReject,
}: IAuthorizationModalProps) {
  const [useBiometric, setUseBiometric] = useState(
    platformEnv.isNative && platformEnv.supportsBiometric,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMode, setSelectedMode] = useState<EAgentAuthorizationMode>(
    request.requestedMode || EAgentAuthorizationMode.IsolatedSubWallet,
  );

  const handleConfirm = useCallback(async () => {
    try {
      setIsProcessing(true);
      await onConfirm({ useBiometric, selectedMode });
      
      Toast.success({
        title: 'Authorization Successful',
        message: `AI agent authorized with ${selectedMode} mode`,
      });
    } catch (error) {
      console.error('Authorization confirmation failed:', error);
      
      // User-friendly error messages
      let errorMessage = 'Failed to authorize agent. Please try again.';
      
      if (error instanceof Error) {
        // Handle specific error cases
        if (error.message.includes('password')) {
          errorMessage = 'Invalid password. Please check and try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (error.message.includes('insufficient')) {
          errorMessage = 'Insufficient balance to complete authorization.';
        } else if (error.message.includes('bytecode')) {
          errorMessage = 'Mode B (Vault Contract) is not yet fully implemented.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Toast.error({
        title: 'Authorization Failed',
        message: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onConfirm, useBiometric, selectedMode]);

  const handleReject = useCallback(() => {
    onReject();
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

            {/* Authorization Details */}
            <AuthorizationDetails request={request} />

            {/* Mode Selection */}
            <YStack gap="$3">
              <SizableText size="$headingSm" fontWeight="600">
                Authorization Mode
              </SizableText>
              
              {/* Mode Selector Buttons */}
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
                    {mode === EAgentAuthorizationMode.IsolatedSubWallet && 'Mode A'}
                    {mode === EAgentAuthorizationMode.VaultContract && 'Mode B'}
                    {mode === EAgentAuthorizationMode.SessionKey && 'Mode C'}
                  </Button>
                ))}
              </XStack>

              {/* Mode Explanation */}
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
                ⚠️ By authorizing, you grant the AI agent permission to execute
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
                disabled={isProcessing}
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
