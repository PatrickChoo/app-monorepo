/**
 * AgentAccountCard - Agent 账户卡片
 * 
 * 显示单个 Agent 授权信息：
 * - Agent 名称和状态
 * - 派生地址
 * - 余额
 * - 权限和到期时间
 * - 快捷操作按钮
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  Box,
  Button,
  HStack,
  Icon,
  Pressable,
  Skeleton,
  Text,
  VStack,
} from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import type { IAgentAuthorization } from '@onekeyhq/kit-bg/src/dbs/simple/entity/SimpleDbEntityAgentAuthorizations';

interface AgentAccountCardProps {
  authorization: IAgentAuthorization;
  walletId: string;
  networkId: string;
  balance?: { balance: string; symbol: string };
  onPress?: () => void;
  onRevoke?: (authId: string) => void;
}

export default function AgentAccountCard({
  authorization,
  walletId,
  networkId,
  balance,
  onPress,
  onRevoke,
}: AgentAccountCardProps) {
  const loading = !balance;
  const [isRevoking, setIsRevoking] = useState(false);

  // 状态指示器颜色
  const statusColor = {
    active: '$iconSuccess',
    paused: '$iconCaution',
    expired: '$iconCritical',
  }[authorization.status] || '$iconDisabled';

  // 状态文本
  const statusText = {
    active: '已激活',
    paused: '已暂停',
    expired: '已过期',
  }[authorization.status] || '未知';

  // 到期时间
  const expiresIn = authorization.expiresAt 
    ? Math.ceil((authorization.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const handleRecharge = useCallback((e: any) => {
    e?.stopPropagation();
    // TODO: 打开充值流程
    console.log('Recharge:', authorization.agentName);
  }, [authorization.agentName]);

  const handlePause = useCallback((e: any) => {
    e?.stopPropagation();
    // TODO: 暂停/恢复授权
    console.log('Pause:', authorization.agentName);
  }, [authorization.agentName]);

  const handleRevoke = useCallback(async (e: any) => {
    e?.stopPropagation();
    
    // Confirm before revoking
    if (!confirm(`确定要撤销 "${authorization.agentName}" 的授权吗？\n\n这将立即停止 Agent 的所有权限。`)) {
      return;
    }

    try {
      setIsRevoking(true);
      
      if (onRevoke) {
        await onRevoke(authorization.id);
      }
    } catch (error) {
      console.error('Failed to revoke authorization:', error);
      // TODO: Show error toast
    } finally {
      setIsRevoking(false);
    }
  }, [authorization.agentName, authorization.id, onRevoke]);

  return (
    <Pressable onPress={onPress}>
      <Box
        bg="$bgSubdued"
        borderRadius="$3"
        p="$4"
        mb="$3"
        borderWidth={StyleSheet.hairlineWidth}
        borderColor="$borderSubdued"
      >
        {/* 头部：名称和状态 */}
        <HStack alignItems="center" justifyContent="space-between" mb="$3">
          <HStack alignItems="center" space="$2" flex={1}>
            <Icon name="CircleSolid" size="$2" color={statusColor} />
            <Text variant="headingMd" fontWeight="600" numberOfLines={1}>
              {authorization.agentName}
            </Text>
          </HStack>
          
          <Box bg="$bgInfo" borderRadius="$2" px="$2" py="$0.5">
            <Text variant="bodySmMedium" color="$textInfo">
              {statusText}
            </Text>
          </Box>
        </HStack>

        {/* 地址 */}
        <HStack alignItems="center" space="$2" mb="$2">
          <Text variant="bodySm" color="$textSubdued">
            地址:
          </Text>
          <Text variant="bodySmMedium" color="$text" flex={1} numberOfLines={1}>
            {authorization.subAccountAddress || 'Deriving...'}
          </Text>
          <Text variant="bodySm" color="$textDisabled">
            (m/44'/60'/0'/0/{authorization.derivationIndex})
          </Text>
        </HStack>

        {/* 余额 */}
        <HStack alignItems="baseline" space="$2" mb="$3">
          <Text variant="bodySm" color="$textSubdued">
            余额:
          </Text>
          {loading ? (
            <Skeleton width="$16" height="$4" />
          ) : (
            <>
              <Text variant="headingMd" fontWeight="700">
                {balance?.balance || '0'}
              </Text>
              <Text variant="bodyMd" color="$textSubdued">
                {balance?.symbol || 'ETH'}
              </Text>
            </>
          )}
        </HStack>

        {/* 权限和到期时间 */}
        <HStack space="$4" mb="$3" flexWrap="wrap">
          <VStack flex={1} minWidth="120">
            <Text variant="bodySm" color="$textSubdued">
              权限
            </Text>
            <Text variant="bodySmMedium" color="$text">
              {authorization.permissions?.join(', ') || 'Transfer, Swap'}
            </Text>
          </VStack>
          
          {expiresIn !== null && (
            <VStack flex={1} minWidth="100">
              <Text variant="bodySm" color="$textSubdued">
                到期
              </Text>
              <Text 
                variant="bodySmMedium" 
                color={expiresIn < 3 ? '$textCritical' : '$text'}
              >
                {expiresIn > 0 ? `${expiresIn}天后` : '已过期'}
              </Text>
            </VStack>
          )}
        </HStack>

        {/* 快捷操作按钮 */}
        <HStack space="$2">
          <Button
            size="small"
            variant="secondary"
            flex={1}
            onPress={handleRecharge}
            iconBefore="PlusCircleOutline"
          >
            充值
          </Button>
          
          <Button
            size="small"
            variant="secondary"
            flex={1}
            onPress={handlePause}
            iconBefore={authorization.status === 'paused' ? 'PlayOutline' : 'PauseOutline'}
          >
            {authorization.status === 'paused' ? '恢复' : '暂停'}
          </Button>
          
          <Button
            size="small"
            variant="secondary"
            onPress={onPress}
            iconBefore="ChevronRightOutline"
            disabled={isRevoking}
          >
            详情
          </Button>

          {authorization.status !== 'Revoked' && onRevoke && (
            <Button
              size="small"
              variant="destructive"
              onPress={handleRevoke}
              iconBefore="XCircleOutline"
              disabled={isRevoking}
            >
              {isRevoking ? '...' : '撤销'}
            </Button>
          )}
        </HStack>
      </Box>
    </Pressable>
  );
}
