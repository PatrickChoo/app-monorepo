/**
 * AgentTab - AI Agent 账户管理 Tab
 * 
 * 功能：
 * - 显示所有 Agent 授权账户列表
 * - 总览统计（授权数量、锁定资产、消耗）
 * - 创建新 Agent 账户
 * - 快捷操作（充值、暂停、详情）
 */

import React, { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl } from 'react-native';

import { Box, Button, Empty, Pressable, Spinner, Text, VStack } from '@onekeyhq/components';
import { useAgentAuthorizations } from '@onekeyhq/kit/src/hooks/useAgentSession';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';

import type { IAgentAuthorization } from '@onekeyhq/kit-bg/src/dbs/simple/entity/SimpleDbEntityAgentAuthorizations';

import AgentOverview from './components/AgentOverview';
import AgentAccountCard from './components/AgentAccountCard';
import EmptyAgentState from './components/EmptyAgentState';

interface AgentTabProps {
  walletId: string;
  accountId: string;
  networkId: string;
}

export default function AgentTab({ walletId, accountId, networkId }: AgentTabProps) {
  const { 
    authorizations, 
    balances,
    loading, 
    refreshing,
    refresh 
  } = useAgentAuthorizations(walletId);

  const [error, setError] = React.useState<string | null>(null);

  const handleCreateAgent = useCallback(() => {
    // TODO: 打开创建 Agent 流程
    console.log('Create Agent');
  }, []);

  const handleAgentPress = useCallback((auth: IAgentAuthorization) => {
    // TODO: 打开 Agent 详情页
    console.log('Agent detail:', auth.agentName);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    refresh();
  }, [refresh]);

  const handleRevoke = useCallback(async (authId: string) => {
    try {
      await backgroundApiProxy.serviceAgentSession.revokeAuthorization(authId);
      
      // Refresh the list after revocation
      refresh();
      
      // TODO: Show success toast
      console.log('Authorization revoked successfully:', authId);
    } catch (error) {
      console.error('Failed to revoke authorization:', error);
      throw error; // Re-throw for the card to handle
    }
  }, [refresh]);

  const renderHeader = useMemo(() => {
    if (!authorizations?.length) return null;
    
    return <AgentOverview authorizations={authorizations} />;
  }, [authorizations]);

  const renderItem = useCallback(({ item }: { item: IAgentAuthorization }) => (
    <AgentAccountCard 
      authorization={item}
      balance={balances[item.agentAccountId]}
      onPress={() => handleAgentPress(item)}
      onRevoke={handleRevoke}
      walletId={walletId}
      networkId={networkId}
    />
  ), [handleAgentPress, handleRevoke, balances, walletId, networkId]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <Box flex={1} justifyContent="center" alignItems="center" py="$20">
          <Spinner size="large" />
          <Text variant="bodyMd" color="$textSubdued" mt="$4">
            加载 Agent 账户...
          </Text>
        </Box>
      );
    }

    if (error) {
      return (
        <Box flex={1} justifyContent="center" alignItems="center" py="$20">
          <VStack space="$4" alignItems="center">
            <Text variant="headingMd" fontWeight="600">
              加载失败
            </Text>
            <Text variant="bodyMd" color="$textSubdued" textAlign="center">
              {error}
            </Text>
            <Button variant="primary" onPress={handleRetry}>
              重试
            </Button>
          </VStack>
        </Box>
      );
    }

    return <EmptyAgentState onCreatePress={handleCreateAgent} />;
  }, [loading, error, handleCreateAgent, handleRetry]);

  return (
    <Box flex={1} bg="$bgApp">
      <FlatList
        data={authorizations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ 
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
        }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={refresh}
          />
        }
      />
    </Box>
  );
}
