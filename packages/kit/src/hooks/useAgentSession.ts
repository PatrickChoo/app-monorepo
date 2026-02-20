/**
 * useAgentSession - Agent 授权相关 Hooks
 */

import { useCallback, useEffect, useState } from 'react';

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import type { IAgentAuthorization } from '@onekeyhq/kit-bg/src/dbs/simple/entity/SimpleDbEntityAgentAuthorizations';

/**
 * 查询钱包的所有 Agent 授权（含余额）
 */
export function useAgentAuthorizations(walletId: string) {
  const [authorizations, setAuthorizations] = useState<IAgentAuthorization[]>([]);
  const [balances, setBalances] = useState<Record<string, { balance: string; symbol: string }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAuthorizations = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Get authorizations
      const auths = await backgroundApiProxy.serviceAgentSession
        .getAuthorizationsByWallet(walletId);
      
      setAuthorizations(auths || []);

      // Fetch balances for all agent accounts
      if (auths && auths.length > 0) {
        const balancePromises = auths.map(async (auth) => {
          try {
            const balance = await backgroundApiProxy.serviceAgentSession
              .getAgentAccountBalance({
                accountId: auth.agentAccountId,
                networkId: auth.chainId,
              });
            return { accountId: auth.agentAccountId, balance };
          } catch (error) {
            console.error('Failed to fetch balance for account:', auth.agentAccountId, error);
            return { accountId: auth.agentAccountId, balance: { balance: '0', symbol: 'ETH' } };
          }
        });

        const balanceResults = await Promise.all(balancePromises);
        const balanceMap = balanceResults.reduce((acc, result) => {
          acc[result.accountId] = result.balance;
          return acc;
        }, {} as Record<string, { balance: string; symbol: string }>);

        setBalances(balanceMap);
      }
    } catch (error) {
      console.error('Failed to fetch agent authorizations:', error);
      setAuthorizations([]);
      setBalances({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [walletId]);

  useEffect(() => {
    void fetchAuthorizations();
  }, [fetchAuthorizations]);

  const refresh = useCallback(() => {
    void fetchAuthorizations(true);
  }, [fetchAuthorizations]);

  return {
    authorizations,
    balances,
    loading,
    refreshing,
    refresh,
  };
}

/**
 * 检查钱包是否有 Agent 授权（用于判断是否显示 Tab）
 */
export function useHasAgentAuthorizations(walletId: string | undefined) {
  const [hasAuthorizations, setHasAuthorizations] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletId) {
      setHasAuthorizations(false);
      setLoading(false);
      return;
    }

    const checkAuthorizations = async () => {
      try {
        setLoading(true);
        const auths = await backgroundApiProxy.serviceAgentSession
          .getAuthorizationsByWallet(walletId);
        
        setHasAuthorizations(auths && auths.length > 0);
      } catch (error) {
        console.error('Failed to check agent authorizations:', error);
        setHasAuthorizations(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthorizations();
  }, [walletId]);

  return { hasAuthorizations, loading };
}

/**
 * 获取单个 Agent 授权详情
 */
export function useAgentAuthorization(authorizationId: string | undefined) {
  const [authorization, setAuthorization] = useState<IAgentAuthorization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorizationId) {
      setAuthorization(null);
      setLoading(false);
      return;
    }

    const fetchAuthorization = async () => {
      try {
        setLoading(true);
        const auth = await backgroundApiProxy.serviceAgentSession
          .getAuthorization(authorizationId);
        
        setAuthorization(auth || null);
      } catch (error) {
        console.error('Failed to fetch agent authorization:', error);
        setAuthorization(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorization();
  }, [authorizationId]);

  return { authorization, loading };
}
