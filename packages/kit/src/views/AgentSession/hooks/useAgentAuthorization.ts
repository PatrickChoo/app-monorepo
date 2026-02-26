/**
 * Agent Authorization Hooks
 * 
 * React hooks for managing agent authorizations in the UI
 */

import { useCallback, useEffect } from 'react';

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';

import type {
  IAgentAuthorizationRequest,
  IAgentAuthorization,
} from '../types';
import { type EAgentAuthorizationMode } from '../types';
import * as storage from '../services/storage';
import {
  useActiveAuthorizationsAtom,
  usePendingAuthorizationRequestAtom,
  useAuthorizationHistoryAtom,
} from '../states/atoms';

/**
 * Hook to load authorizations from storage on mount
 */
export function useLoadAuthorizations() {
  const [, setActiveAuthorizations] = useActiveAuthorizationsAtom();
  const [, setHistory] = useAuthorizationHistoryAtom();

  useEffect(() => {
    async function loadData() {
      try {
        const active =
          await backgroundApiProxy.serviceAgentSession.getActiveAuthorizations();
        const history =
          await backgroundApiProxy.serviceAgentSession.getAuthorizationHistory();

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
 * Hook to request authorization (triggers modal via bridge)
 *
 * Uses authorizationBridge which manages the Promise lifecycle.
 * The bridge sets the pending request atom and resolves when the user confirms/rejects.
 *
 * @returns Function to request authorization and Promise that resolves when user confirms/rejects
 */
export function useRequestAuthorization() {
  return useCallback(
    async (request: IAgentAuthorizationRequest): Promise<{
      confirmed: boolean;
      selectedMode?: EAgentAuthorizationMode;
      useBiometric?: boolean;
    }> => {
      const { requestAuthorizationFromUI } = await import(
        '../skills/authorizationBridge'
      );
      return requestAuthorizationFromUI(request);
    },
    [],
  );
}

/**
 * Hook to handle modal confirmation
 *
 * Resolution is handled by authorizationBridge (confirm/reject calls from Provider).
 * This hook only manages the atom state cleanup.
 */
export function useHandleAuthorizationConfirm() {
  const [pendingRequest, setPendingRequest] =
    usePendingAuthorizationRequestAtom();

  const confirm = useCallback(
    async (_params: {
      useBiometric: boolean;
      selectedMode: EAgentAuthorizationMode;
    }) => {
      if (!pendingRequest) {
        return;
      }
      // Clear pending request (bridge handles Promise resolution)
      setPendingRequest(null);
    },
    [pendingRequest, setPendingRequest],
  );

  const reject = useCallback(() => {
    if (!pendingRequest) {
      return;
    }
    // Clear pending request (bridge handles Promise resolution)
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
