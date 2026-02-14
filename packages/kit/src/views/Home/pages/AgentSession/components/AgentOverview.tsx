/**
 * AgentOverview - Agent 授权总览
 * 
 * 显示统计信息：
 * - 已创建授权数量
 * - 总锁定资产
 * - 已消耗金额
 * - 新建授权按钮
 */

import React, { useMemo } from 'react';

import { Box, Button, HStack, Icon, Text, VStack } from '@onekeyhq/components';
import type { IAgentAuthorization } from '@onekeyhq/kit-bg/src/dbs/simple/entity/SimpleDbEntityAgentAuthorizations';

interface AgentOverviewProps {
  authorizations: IAgentAuthorization[];
  onCreatePress?: () => void;
}

export default function AgentOverview({ 
  authorizations,
  onCreatePress,
}: AgentOverviewProps) {
  const stats = useMemo(() => {
    const totalCount = authorizations.length;
    const activeCount = authorizations.filter(auth => auth.status === 'active').length;
    
    // TODO: 计算总锁定资产和消耗（需要查询链上余额）
    const totalLocked = 0;
    const totalSpent = 0;

    return { totalCount, activeCount, totalLocked, totalSpent };
  }, [authorizations]);

  return (
    <Box mb="$4">
      {/* 标题和介绍 */}
      <VStack space="$2" mb="$4">
        <HStack alignItems="center" space="$2">
          <Icon name="RobotOutline" size="$6" color="$iconSubdued" />
          <Text variant="headingMd" fontWeight="600">
            AI Agent 账户
          </Text>
        </HStack>
        <Text variant="bodyMd" color="$textSubdued">
          从主钱包派生的隔离子账户，用于 AI 授权
        </Text>
      </VStack>

      {/* 统计卡片 */}
      <Box
        bg="$bgSubdued"
        borderRadius="$3"
        p="$4"
        mb="$4"
      >
        <HStack space="$6" flexWrap="wrap">
          <VStack flex={1} minWidth="100">
            <Text variant="bodySmMedium" color="$textSubdued">
              已创建授权
            </Text>
            <Text variant="headingLg" fontWeight="700">
              {stats.activeCount}/{stats.totalCount}
            </Text>
          </VStack>

          <VStack flex={1} minWidth="100">
            <Text variant="bodySmMedium" color="$textSubdued">
              总锁定资产
            </Text>
            <Text variant="headingLg" fontWeight="700">
              ${stats.totalLocked.toFixed(2)}
            </Text>
          </VStack>

          <VStack flex={1} minWidth="100">
            <Text variant="bodySmMedium" color="$textSubdued">
              已消耗
            </Text>
            <Text variant="headingLg" fontWeight="700" color="$textCaution">
              ${stats.totalSpent.toFixed(2)}
            </Text>
          </VStack>
        </HStack>
      </Box>

      {/* 新建按钮 */}
      <Button
        variant="primary"
        size="large"
        onPress={onCreatePress}
        iconBefore="PlusSmallOutline"
      >
        新建 Agent 账户
      </Button>
    </Box>
  );
}
