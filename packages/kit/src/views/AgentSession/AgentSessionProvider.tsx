import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';

import { ProviderJotaiContextAgentSession } from './states/atoms';
import { AuthorizationModal } from './components/AuthorizationModal';
import {
  usePendingAuthorizationRequestAtom,
  useLoadAuthorizations,
  useHandleAuthorizationConfirm,
} from './hooks/useAgentAuthorization';
import { registerPendingRequestSetter } from './states/atomSetters';
import {
  confirmAuthorizationFromUI,
  rejectAuthorizationFromUI,
} from './skills/authorizationBridge';

/**
 * Inner component that has access to atoms
 */
function AgentSessionProviderInner({ children }: PropsWithChildren) {
  const [pendingRequest, setPendingRequest] = usePendingAuthorizationRequestAtom();
  const { confirm, reject } = useHandleAuthorizationConfirm();

  // Load authorizations from storage on mount
  useLoadAuthorizations();

  // Register the setter for use outside React components
  useEffect(() => {
    registerPendingRequestSetter(setPendingRequest);
  }, [setPendingRequest]);

  // Handle modal confirmation
  const handleConfirm = async (params: {
    useBiometric: boolean;
    selectedMode: any;
  }) => {
    // Notify the bridge
    confirmAuthorizationFromUI({
      useBiometric: params.useBiometric,
      selectedMode: params.selectedMode,
    });

    // Update atom state
    await confirm(params);
  };

  // Handle modal rejection
  const handleReject = () => {
    // Notify the bridge
    rejectAuthorizationFromUI();

    // Update atom state
    reject();
  };

  return (
    <>
      {children}

      {/* Global Authorization Modal */}
      {pendingRequest && (
        <AuthorizationModal
          request={pendingRequest}
          visible={!!pendingRequest}
          onConfirm={handleConfirm}
          onReject={handleReject}
        />
      )}
    </>
  );
}

/**
 * Main Provider
 */
export function AgentSessionProvider({ children }: PropsWithChildren) {
  return (
    <ProviderJotaiContextAgentSession>
      <AgentSessionProviderInner>{children}</AgentSessionProviderInner>
    </ProviderJotaiContextAgentSession>
  );
}
