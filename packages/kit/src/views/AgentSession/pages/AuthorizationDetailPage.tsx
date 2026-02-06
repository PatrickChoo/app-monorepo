import { useCallback, useState } from 'react';

import { useRoute } from '@react-navigation/core';
import { useIntl } from 'react-intl';

import {
  Badge,
  Button,
  Dialog,
  Page,
  SizableText,
  Stack,
  XStack,
  YStack,
} from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';

import { useAuthorizationById, useActiveAuthorizationsAtom } from '../states/atoms';
import { EAgentAuthorizationMode, EAgentAuthorizationStatus } from '../types';

export default function AuthorizationDetailPage() {
  const intl = useIntl();
  const route = useRoute();
  const { id } = route.params as { id: string };
  
  const authorization = useAuthorizationById(id);
  const [, setAuthorizations] = useActiveAuthorizationsAtom();
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  const handleRevoke = useCallback(() => {
    setShowRevokeDialog(true);
  }, []);

  const confirmRevoke = useCallback(() => {
    // Update authorization status to revoked
    setAuthorizations((prev) =>
      prev.map((auth) =>
        auth.id === id
          ? { ...auth, status: EAgentAuthorizationStatus.Revoked }
          : auth,
      ),
    );
    setShowRevokeDialog(false);
    // TODO: Navigate back
  }, [id, setAuthorizations]);

  const handleTopUp = useCallback(() => {
    // TODO: Implement top-up functionality
    console.log('Top up authorization:', id);
  }, [id]);

  if (!authorization) {
    return (
      <Page>
        <Page.Header title="Authorization Details" />
        <Page.Body>
          <YStack flex={1} justifyContent="center" alignItems="center" p="$5">
            <SizableText size="$bodyLg" color="$textSubdued">
              Authorization not found
            </SizableText>
          </YStack>
        </Page.Body>
      </Page>
    );
  }

  const getModeLabel = (mode: EAgentAuthorizationMode) => {
    switch (mode) {
      case EAgentAuthorizationMode.IsolatedSubWallet:
        return 'Mode A: Isolated Sub-Wallet';
      case EAgentAuthorizationMode.VaultContract:
        return 'Mode B: Vault Contract';
      case EAgentAuthorizationMode.SessionKey:
        return 'Mode C: Session Key';
      default:
        return mode;
    }
  };

  const getModeDescription = (mode: EAgentAuthorizationMode) => {
    switch (mode) {
      case EAgentAuthorizationMode.IsolatedSubWallet:
        return 'AI operates with a dedicated sub-wallet containing limited funds';
      case EAgentAuthorizationMode.VaultContract:
        return 'Funds locked in smart contract with enforced spending rules';
      case EAgentAuthorizationMode.SessionKey:
        return 'Account Abstraction wallet with temporary session key';
      default:
        return '';
    }
  };

  const getStatusColor = (status: EAgentAuthorizationStatus) => {
    switch (status) {
      case EAgentAuthorizationStatus.Active:
        return '$bgSuccess';
      case EAgentAuthorizationStatus.Expired:
        return '$bgSubdued';
      case EAgentAuthorizationStatus.Revoked:
        return '$bgCritical';
      case EAgentAuthorizationStatus.Pending:
        return '$bgCaution';
      default:
        return '$bgSubdued';
    }
  };

  const isActive = authorization.status === EAgentAuthorizationStatus.Active;
  const spentPercentage = authorization.allocatedAmountUsd
    ? (parseFloat(authorization.spentAmountUsd || '0') /
        parseFloat(authorization.allocatedAmountUsd)) *
      100
    : 0;

  return (
    <Page>
      <Page.Header title="Authorization Details" />
      <Page.Body>
        <YStack gap="$4" p="$4">
          {/* Header Card */}
          <YStack gap="$3" bg="$bgSubdued" p="$4" borderRadius="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <XStack gap="$2" alignItems="center">
                <SizableText size="$heading3xl">🤖</SizableText>
                <YStack>
                  <SizableText size="$headingLg" fontWeight="700">
                    {authorization.agentName}
                  </SizableText>
                  <SizableText size="$bodySm" color="$textSubdued">
                    {authorization.agentId}
                  </SizableText>
                </YStack>
              </XStack>
              <Badge bg={getStatusColor(authorization.status)}>
                {authorization.status}
              </Badge>
            </XStack>
          </YStack>

          {/* Mode Info */}
          <YStack gap="$2" bg="$bg" p="$4" borderRadius="$3" borderWidth={1} borderColor="$borderSubdued">
            <SizableText size="$headingSm" fontWeight="600">
              {getModeLabel(authorization.mode)}
            </SizableText>
            <SizableText size="$bodySm" color="$textSubdued">
              {getModeDescription(authorization.mode)}
            </SizableText>
            
            {/* Mode-specific address/key */}
            {authorization.agentAccountAddress && (
              <YStack gap="$1" mt="$2">
                <SizableText size="$bodySm" color="$textSubdued">
                  Agent Account Address:
                </SizableText>
                <SizableText size="$bodySm" fontFamily="$mono">
                  {authorization.agentAccountAddress}
                </SizableText>
              </YStack>
            )}
            {authorization.vaultContractAddress && (
              <YStack gap="$1" mt="$2">
                <SizableText size="$bodySm" color="$textSubdued">
                  Vault Contract:
                </SizableText>
                <SizableText size="$bodySm" fontFamily="$mono">
                  {authorization.vaultContractAddress}
                </SizableText>
              </YStack>
            )}
            {authorization.sessionKeyPublicKey && (
              <YStack gap="$1" mt="$2">
                <SizableText size="$bodySm" color="$textSubdued">
                  Session Key:
                </SizableText>
                <SizableText size="$bodySm" fontFamily="$mono" numberOfLines={1}>
                  {authorization.sessionKeyPublicKey}
                </SizableText>
              </YStack>
            )}
          </YStack>

          {/* Network */}
          <YStack gap="$2" bg="$bg" p="$4" borderRadius="$3" borderWidth={1} borderColor="$borderSubdued">
            <SizableText size="$bodySm" color="$textSubdued">
              Network
            </SizableText>
            <XStack gap="$2" alignItems="center">
              <SizableText>⛓️</SizableText>
              <SizableText size="$bodyLg" fontWeight="500">
                {authorization.networkName}
              </SizableText>
              <Badge variant="secondary" size="small">
                {authorization.chainId}
              </Badge>
            </XStack>
          </YStack>

          {/* Spending Overview */}
          <YStack gap="$3" bg="$bg" p="$4" borderRadius="$3" borderWidth={1} borderColor="$borderSubdued">
            <SizableText size="$headingSm" fontWeight="600">
              Spending Overview
            </SizableText>
            
            {/* Progress Bar */}
            <YStack gap="$2">
              <Stack bg="$bgSubdued" h="$2" borderRadius="$1" overflow="hidden">
                <Stack
                  bg="$bgSuccess"
                  h="$2"
                  width={`${Math.min(spentPercentage, 100)}%`}
                />
              </Stack>
              <SizableText size="$bodySm" color="$textSubdued">
                {spentPercentage.toFixed(1)}% used
              </SizableText>
            </YStack>

            {/* Amounts */}
            <YStack gap="$2">
              <XStack justifyContent="space-between">
                <SizableText size="$bodyMd" color="$textSubdued">
                  Allocated
                </SizableText>
                <SizableText size="$bodyMd" fontWeight="600">
                  ${authorization.allocatedAmountUsd || '0.00'}{' '}
                  {authorization.tokenSymbol && `(${authorization.tokenSymbol})`}
                </SizableText>
              </XStack>
              <XStack justifyContent="space-between">
                <SizableText size="$bodyMd" color="$textSubdued">
                  Spent
                </SizableText>
                <SizableText size="$bodyMd" fontWeight="600" color="$textCaution">
                  ${authorization.spentAmountUsd || '0.00'}
                </SizableText>
              </XStack>
              <XStack justifyContent="space-between">
                <SizableText size="$bodyMd" color="$textSubdued">
                  Remaining
                </SizableText>
                <SizableText size="$bodyMd" fontWeight="600" color="$textSuccess">
                  ${authorization.remainingAmountUsd || '0.00'}
                </SizableText>
              </XStack>
            </YStack>
          </YStack>

          {/* Rules & Limits */}
          <YStack gap="$3" bg="$bg" p="$4" borderRadius="$3" borderWidth={1} borderColor="$borderSubdued">
            <SizableText size="$headingSm" fontWeight="600">
              Rules & Limits
            </SizableText>
            
            {authorization.rules.spendingLimitUsd && (
              <XStack justifyContent="space-between">
                <SizableText size="$bodyMd" color="$textSubdued">
                  Daily Spending Limit
                </SizableText>
                <SizableText size="$bodyMd" fontWeight="500">
                  ${authorization.rules.spendingLimitUsd} USD
                </SizableText>
              </XStack>
            )}
            
            {authorization.rules.expiresAt && (
              <XStack justifyContent="space-between">
                <SizableText size="$bodyMd" color="$textSubdued">
                  Expires
                </SizableText>
                <SizableText size="$bodyMd" fontWeight="500">
                  {new Date(authorization.rules.expiresAt).toLocaleDateString()}
                </SizableText>
              </XStack>
            )}

            {authorization.rules.contractWhitelist && authorization.rules.contractWhitelist.length > 0 && (
              <YStack gap="$1">
                <SizableText size="$bodyMd" color="$textSubdued">
                  Allowed Contracts
                </SizableText>
                {authorization.rules.contractWhitelist.map((contract, index) => (
                  <SizableText key={index} size="$bodySm" fontFamily="$mono">
                    {contract}
                  </SizableText>
                ))}
              </YStack>
            )}
          </YStack>

          {/* Timestamps */}
          <YStack gap="$2" bg="$bgSubdued" p="$3" borderRadius="$2">
            <XStack justifyContent="space-between">
              <SizableText size="$bodySm" color="$textSubdued">
                Created
              </SizableText>
              <SizableText size="$bodySm">
                {new Date(authorization.createdAt).toLocaleString()}
              </SizableText>
            </XStack>
            <XStack justifyContent="space-between">
              <SizableText size="$bodySm" color="$textSubdued">
                Last Updated
              </SizableText>
              <SizableText size="$bodySm">
                {new Date(authorization.updatedAt).toLocaleString()}
              </SizableText>
            </XStack>
          </YStack>

          {/* Action Buttons */}
          {isActive && (
            <XStack gap="$3">
              {authorization.mode === EAgentAuthorizationMode.IsolatedSubWallet && (
                <Button flex={1} variant="secondary" onPress={handleTopUp}>
                  Top Up
                </Button>
              )}
              <Button flex={1} variant="destructive" onPress={handleRevoke}>
                Revoke Authorization
              </Button>
            </XStack>
          )}
        </YStack>
      </Page.Body>

      {/* Revoke Confirmation Dialog */}
      <Dialog
        visible={showRevokeDialog}
        onClose={() => setShowRevokeDialog(false)}
        title="Revoke Authorization?"
        description="This will immediately revoke the AI agent's access. This action cannot be undone."
        renderContent={
          <XStack gap="$3" p="$5">
            <Button flex={1} variant="secondary" onPress={() => setShowRevokeDialog(false)}>
              Cancel
            </Button>
            <Button flex={1} variant="destructive" onPress={confirmRevoke}>
              Revoke
            </Button>
          </XStack>
        }
      />
    </Page>
  );
}
