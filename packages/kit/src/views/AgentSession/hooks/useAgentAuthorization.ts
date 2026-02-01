/**
 * Agent Authorization Hooks
 * 
 * React hooks for managing agent authorizations in the UI
 */

import { useCallback, useEffect } from 'react';

import type {
  IAgentAuthorizationRequest,
  IAgentAuthorization,
  EAgentAuthorizationMode,
} from '../types';
import {
  useActiveAuthorizationsAtom,
  usePendingAuthorizationRequestAtom,
  useAuthorizationHistoryAtom,
} from '../states/atoms';
import * as storage from '../services/storage';

/**
 * Hook to load authorizations from storage on mount
 */
export function useLoadAuthorizations() {
  const [, setActiveAuthorizations] = useActiveAuthorizationsAtom();
  const [, setHistory] = useAuthorizationHistoryAtom();

  useEffect(() => {
    async function loadData() {
      try {
        const active = await storage.getActiveAuthorizations();
        const history = await storage.getAuthorizationHistory();
        
        setActiveAuthorizations(active);
        setHistory(history);
      } catch (error) {
        console.error('[AgentSession] Failed to load authorizations:', error);
      }
    }

    void loadData();
  }, [setActiveAuthorizations, setHistory]);
}

/**
 * Hook to request authorization (triggers modal)
 * 
 * @returns Function to request authorization and Promise that resolves when user confirms/rejects
 */
export function useRequestAuthorization() {
  const [, setPendingRequest] = usePendingAuthorizationRequestAtom();

  return useCallback(
    (request: IAgentAuthorizationRequest): Promise<{
      confirmed: boolean;
      selectedMode?: EAgentAuthorizationMode;
      useBiometric?: boolean;
    }> => {
      return new Promise((resolve) => {
        // Store resolve function in the request object
        const requestWithCallback = {
          ...request,
          _resolve: resolve,
        };

        setPendingRequest(requestWithCallback as any);
      });
    },
    [setPendingRequest],
  );
}

/**
 * Hook to handle modal confirmation
 */
export function useHandleAuthorizationConfirm() {
  const [pendingRequest, setPendingRequest] =
    usePendingAuthorizationRequestAtom();

  const confirm = useCallback(
    async (params: {
      useBiometric: boolean;
      selectedMode: EAgentAuthorizationMode;
    }) => {
      if (!pendingRequest) {
        return;
      }

      // Call the resolve function stored in the request
      const resolve = (pendingRequest as any)._resolve;
      if (resolve) {
        resolve({
          confirmed: true,
          selectedMode: params.selectedMode,
          useBiometric: params.useBiometric,
        });
      }

      // Clear pending request
      setPendingRequest(null);
    },
    [pendingRequest, setPendingRequest],
  );

  const reject = useCallback(() => {
    if (!pendingRequest) {
      return;
    }

    // Call the resolve function with rejected status
    const resolve = (pendingRequest as any)._resolve;
    if (resolve) {
      resolve({
        confirmed: false,
      });
    }

    // Clear pending request
    setPendingRequest(null);
  }, [pendingRequest, setPendingRequest]);

  return { confirm, reject };
}

/**
 * Hook to add a new authorization
 */
export function useAddAuthorization() {
  const [activeAuthorizations, setActiveAuthorizations] =
    useActiveAuthorizationsAtom();

  return useCallback(
    async (authorization: IAgentAuthorization) => {
      await storage.addAuthorization(authorization);
      setActiveAuthorizations([...activeAuthorizations, authorization]);
    },
    [activeAuthorizations, setActiveAuthorizations],
  );
}

/**
 * Hook to update an authorization
 */
export function useUpdateAuthorization() {
  const [activeAuthorizations, setActiveAuthorizations] =
    useActiveAuthorizationsAtom();

  return useCallback(
    async (
      authorizationId: string,
      updates: Partial<IAgentAuthorization>,
    ) => {
      await storage.updateAuthorization(authorizationId, updates);

      const updated = activeAuthorizations.map((auth) =>
        auth.id === authorizationId
          ? { ...auth, ...updates, updatedAt: Date.now() }
          : auth,
      );

      setActiveAuthorizations(updated);
    },
    [activeAuthorizations, setActiveAuthorizations],
  );
}

/**
 * Hook to revoke an authorization
 */
export function useRevokeAuthorization() {
  const updateAuthorization = useUpdateAuthorization();

  return useCallback(
    async (authorizationId: string) => {
      await updateAuthorization(authorizationId, {
        status: 'Revoked',
      });
    },
    [updateAuthorization],
  );
}

/**
 * Hook to get authorization by ID
 */
export function useGetAuthorizationById(authorizationId?: string) {
  const [activeAuthorizations] = useActiveAuthorizationsAtom();

  if (!authorizationId) {
    return null;
  }

  return (
    activeAuthorizations.find((auth) => auth.id === authorizationId) || null
  );
}
