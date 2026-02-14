/**
 * EmptyAgentState - Agent 账户空状态
 * 
 * 当没有任何 Agent 授权时显示
 */

import React from 'react';

import { Box, Button, Empty, Icon, Text, VStack } from '@onekeyhq/components';

interface EmptyAgentStateProps {
  onCreatePress?: () => void;
}

export default function EmptyAgentState({ onCreatePress }: EmptyAgentStateProps) {
  return (
    <Box flex={1} justifyContent="center" alignItems="center" py="$20">
      <VStack space="$4" alignItems="center" maxWidth="$80">
        <Icon name="RobotOutline" size="$16" color="$iconSubdued" />
        
        <VStack space="$2" alignItems="center">
          <Text variant="headingMd" fontWeight="600" textAlign="center">
            还没有 AI Agent 账户
          </Text>
          
          <Text variant="bodyMd" color="$textSubdued" textAlign="center">
            为 AI 创建隔离子账户，安全地授权自动化操作
          </Text>
        </VStack>

        <Button
          variant="primary"
          size="large"
          onPress={onCreatePress}
          iconBefore="PlusSmallOutline"
        >
          创建第一个 Agent 账户
        </Button>

        {/* 功能说明 */}
        <VStack space="$2" mt="$6" px="$4">
          <FeatureItem 
            icon="ShieldCheckOutline"
            title="安全隔离"
            description="Agent 只能访问子账户，无法触及主钱包"
          />
          <FeatureItem 
            icon="CurrencyDollarOutline"
            title="可控额度"
            description="设置授权额度和有效期，随时暂停或撤销"
          />
          <FeatureItem 
            icon="ChartBarOutline"
            title="透明监控"
            description="实时查看 Agent 的所有交易和余额变化"
          />
        </VStack>
      </VStack>
    </Box>
  );
}

function FeatureItem({ 
  icon, 
  title, 
  description,
}: { 
  icon: string; 
  title: string; 
  description: string;
}) {
  return (
    <Box
      flexDirection="row"
      alignItems="flex-start"
      space="$3"
    >
      <Icon name={icon} size="$5" color="$iconSubdued" />
      <Box flex={1}>
        <Text variant="bodyMdMedium">{title}</Text>
        <Text variant="bodySmRegular" color="$textSubdued">
          {description}
        </Text>
      </Box>
    </Box>
  );
}
