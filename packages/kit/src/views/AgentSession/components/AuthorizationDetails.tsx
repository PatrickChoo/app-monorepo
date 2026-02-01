import { useMemo } from 'react';

import { SizableText, Stack, XStack, YStack } from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';

import type { IAgentAuthorizationRequest } from '../types';

interface IAuthorizationDetailsProps {
  request: IAgentAuthorizationRequest;
}

export function AuthorizationDetails({ request }: IAuthorizationDetailsProps) {
  const detailItems = useMemo(() => {
    const items = [
      {
        label: 'Agent',
        value: request.agentName || request.agentId,
        icon: '🤖',
      },
      {
        label: 'Network',
        value: request.networkName,
        icon: '⛓️',
      },
      {
        label: 'Amount',
        value: request.requestedAmount
          ? `${request.requestedAmount} ${request.tokenSymbol || ''}`
          : request.requestedAmountUsd
            ? `≈ $${request.requestedAmountUsd} USD`
            : 'Not specified',
        icon: '💰',
      },
    ];

    if (request.purpose) {
      items.push({
        label: 'Purpose',
        value: request.purpose,
        icon: '📋',
      });
    }

    if (request.rules?.spendingLimitUsd) {
      items.push({
        label: 'Daily Limit',
        value: `$${request.rules.spendingLimitUsd} USD`,
        icon: '⏱️',
      });
    }

    if (request.rules?.expiresAt) {
      const expiryDate = new Date(request.rules.expiresAt);
      items.push({
        label: 'Expires',
        value: expiryDate.toLocaleDateString(),
        icon: '📅',
      });
    }

    return items;
  }, [request]);

  return (
    <YStack gap="$3" bg="$bgSubdued" p="$4" borderRadius="$3">
      <SizableText size="$headingSm" fontWeight="600">
        Authorization Details
      </SizableText>
      
      {detailItems.map((item, index) => (
        <XStack key={index} justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center" flex={1}>
            <SizableText size="$bodyLg">{item.icon}</SizableText>
            <SizableText size="$bodyMd" color="$textSubdued">
              {item.label}
            </SizableText>
          </XStack>
          <Stack flex={1.5}>
            <SizableText
              size="$bodyMd"
              fontWeight="500"
              textAlign="right"
              numberOfLines={2}
            >
              {item.value}
            </SizableText>
          </Stack>
        </XStack>
      ))}
    </YStack>
  );
}
