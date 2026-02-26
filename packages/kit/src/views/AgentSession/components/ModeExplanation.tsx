import { useMemo } from 'react';

import { Alert, SizableText, YStack } from '@onekeyhq/components';

import { EAgentAuthorizationMode } from '../types';

interface IModeExplanationProps {
  mode: EAgentAuthorizationMode;
}

export function ModeExplanation({ mode }: IModeExplanationProps) {
  const modeInfo = useMemo(() => {
    switch (mode) {
      case EAgentAuthorizationMode.IsolatedSubWallet:
        return {
          title: '🔐 Isolated Sub-Wallet',
          description:
            'A dedicated sub-wallet will be created with limited funds. The AI agent can only access funds in this sub-wallet.',
          benefits: [
            'Simple to understand and implement',
            'Clear fund isolation',
            'Easy to monitor and top up',
          ],
          security: 'Medium - Limited by the amount you allocate',
          icon: '💼',
        };

      case EAgentAuthorizationMode.VaultContract:
        return {
          title: '🏦 Vault Contract',
          description:
            'Funds are locked in a smart contract with enforced spending rules. The AI agent must follow contract rules for every transaction.',
          benefits: [
            'Smart contract enforced limits',
            'Programmable spending rules',
            'On-chain transparency',
          ],
          security: 'High - Contract-enforced rules',
          icon: '🛡️',
        };

      case EAgentAuthorizationMode.SessionKey:
        return {
          title: '🔑 Session Key (Account Abstraction)',
          description:
            'Uses Account Abstraction with a temporary session key. The AI agent gets limited permissions through the session key.',
          benefits: [
            'Most flexible authorization',
            'Granular permission control',
            'Revocable at any time',
          ],
          security: 'Very High - Time-limited session with strict permissions',
          icon: '⚡',
        };

      default:
        return null;
    }
  }, [mode]);

  if (!modeInfo) return null;

  return (
    <YStack gap="$3">
      <Alert
        type="info"
        title={modeInfo.title}
        description={modeInfo.description}
      />
      
      <YStack gap="$2" bg="$bgSubdued" p="$3" borderRadius="$2">
        <SizableText size="$bodySm" fontWeight="600">
          Benefits:
        </SizableText>
        {modeInfo.benefits.map((benefit, index) => (
          <SizableText key={index} size="$bodySm" color="$textSubdued">
            • {benefit}
          </SizableText>
        ))}
      </YStack>

      <YStack bg="$bgSubdued" p="$3" borderRadius="$2">
        <SizableText size="$bodySm" fontWeight="600">
          {modeInfo.icon} Security Level:
        </SizableText>
        <SizableText size="$bodySm" color="$textSubdued" mt="$1">
          {modeInfo.security}
        </SizableText>
      </YStack>
    </YStack>
  );
}
