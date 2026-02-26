import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import {
  Badge,
  Empty,
  Page,
  SizableText,
  Stack,
  XStack,
  YStack,
} from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { ETabAgentSessionRoutes } from '@onekeyhq/shared/src/routes';

import useAppNavigation from '../../../hooks/useAppNavigation';

import { useActiveAuthorizationsAtom, useTotalAmountsAtom } from '../states/atoms';
import type { IAgentAuthorization } from '../types';
import { EAgentAuthorizationMode, EAgentAuthorizationStatus } from '../types';

function AuthorizationListItem({
  authorization,
  onPress,
}: {
  authorization: IAgentAuthorization;
  onPress: (id: string) => void;
}) {
  const getModeLabel = (mode: EAgentAuthorizationMode) => {
    switch (mode) {
      case EAgentAuthorizationMode.IsolatedSubWallet:
        return 'Isolated Sub-Wallet';
      case EAgentAuthorizationMode.VaultContract:
        return 'Vault Contract';
      case EAgentAuthorizationMode.SessionKey:
        return 'Session Key';
      default:
        return mode;
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

  const handlePress = useCallback(() => {
    onPress(authorization.id);
  }, [authorization.id, onPress]);

  return (
    <Stack
      bg="$bg"
      p="$4"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$borderSubdued"
      pressStyle={{ bg: '$bgHover' }}
      onPress={handlePress}
      cursor="pointer"
    >
      <YStack gap="$3">
        {/* Header: Agent name and Status */}
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center" flex={1}>
            <SizableText size="$bodyLg">🤖</SizableText>
            <SizableText size="$bodyLg" fontWeight="600" numberOfLines={1}>
              {authorization.agentName}
            </SizableText>
          </XStack>
          <Badge bg={getStatusColor(authorization.status)} size="small">
            {authorization.status}
          </Badge>
        </XStack>

        {/* Mode and Network */}
        <XStack gap="$2" flexWrap="wrap">
          <Badge variant="secondary" size="small">
            {getModeLabel(authorization.mode)}
          </Badge>
          <Badge variant="secondary" size="small">
            ⛓️ {authorization.networkName}
          </Badge>
        </XStack>

        {/* Amounts */}
        <YStack gap="$1">
          <XStack justifyContent="space-between">
            <SizableText size="$bodySm" color="$textSubdued">
              Allocated
            </SizableText>
            <SizableText size="$bodySm" fontWeight="500">
              ${authorization.allocatedAmountUsd || '0.00'}
            </SizableText>
          </XStack>
          <XStack justifyContent="space-between">
            <SizableText size="$bodySm" color="$textSubdued">
              Remaining
            </SizableText>
            <SizableText size="$bodySm" fontWeight="500" color="$textSuccess">
              ${authorization.remainingAmountUsd || '0.00'}
            </SizableText>
          </XStack>
        </YStack>

        {/* Expiration */}
        {authorization.rules?.expiresAt && (
          <SizableText size="$bodySm" color="$textSubdued">
            Expires: {new Date(authorization.rules.expiresAt).toLocaleDateString()}
          </SizableText>
        )}
      </YStack>
    </Stack>
  );
}

export default function AuthorizationListPage() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const [authorizations] = useActiveAuthorizationsAtom();
  const [totals] = useTotalAmountsAtom();

  const handleItemPress = useCallback((id: string) => {
    navigation.push(ETabAgentSessionRoutes.TabAuthorizationDetail, { id });
  }, [navigation]);

  return (
    <Page>
      <Page.Header
        title="AI Agent Authorizations"
        // TODO: Add action button for creating new authorization
      />
      <Page.Body>
        <YStack gap="$4" p="$4">
          {/* Summary Card */}
          <YStack gap="$3" bg="$bgSubdued" p="$4" borderRadius="$3">
            <SizableText size="$headingMd" fontWeight="600">
              Total Authorizations Summary
            </SizableText>
            <XStack gap="$4" flexWrap="wrap">
              <YStack flex={1} minWidth="$32">
                <SizableText size="$bodySm" color="$textSubdued">
                  Total Allocated
                </SizableText>
                <SizableText size="$headingMd" fontWeight="700">
                  ${totals.totalAllocatedUsd.toFixed(2)}
                </SizableText>
              </YStack>
              <YStack flex={1} minWidth="$32">
                <SizableText size="$bodySm" color="$textSubdued">
                  Total Spent
                </SizableText>
                <SizableText size="$headingMd" fontWeight="700" color="$textCaution">
                  ${totals.totalSpentUsd.toFixed(2)}
                </SizableText>
              </YStack>
              <YStack flex={1} minWidth="$32">
                <SizableText size="$bodySm" color="$textSubdued">
                  Remaining
                </SizableText>
                <SizableText size="$headingMd" fontWeight="700" color="$textSuccess">
                  ${totals.totalRemainingUsd.toFixed(2)}
                </SizableText>
              </YStack>
            </XStack>
          </YStack>

          {/* Authorization List */}
          {authorizations.length === 0 ? (
            <Empty
              title="No Active Authorizations"
              description="Create an authorization to allow AI agents to execute transactions on your behalf."
              icon="InboxOutline"
            />
          ) : (
            <YStack gap="$3">
              {authorizations.map((auth) => (
                <AuthorizationListItem
                  key={auth.id}
                  authorization={auth}
                  onPress={handleItemPress}
                />
              ))}
            </YStack>
          )}
        </YStack>
      </Page.Body>
    </Page>
  );
}
