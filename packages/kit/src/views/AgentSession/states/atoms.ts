import type {
  EAgentAuthorizationMode,
  IAgentAuthorization,
  IAgentAuthorizationRequest,
} from '../types';
import { createJotaiContext } from '../../../states/jotai/utils/createJotaiContext';

const {
  Provider: ProviderJotaiContextAgentSession,
  contextAtom,
  contextAtomComputed,
  contextAtomMethod,
} = createJotaiContext();

export { ProviderJotaiContextAgentSession, contextAtomMethod };

// ===== Active Authorizations =====
export const {
  atom: activeAuthorizationsAtom,
  use: useActiveAuthorizationsAtom,
} = contextAtom<IAgentAuthorization[]>([]);

// ===== Pending Authorization Request =====
export const {
  atom: pendingAuthorizationRequestAtom,
  use: usePendingAuthorizationRequestAtom,
} = contextAtom<IAgentAuthorizationRequest | null>(null);

// ===== Authorization History =====
export const {
  atom: authorizationHistoryAtom,
  use: useAuthorizationHistoryAtom,
} = contextAtom<IAgentAuthorization[]>([]);

// ===== Computed: Get Authorization by ID =====
export const getAuthorizationById = ({
  id,
  authorizations,
}: {
  id: string;
  authorizations: IAgentAuthorization[];
}) => authorizations.find((auth) => auth.id === id);

export const useAuthorizationById = (id: string) => {
  const [authorizations] = useActiveAuthorizationsAtom();
  return getAuthorizationById({ id, authorizations });
};

// ===== Computed: Authorizations by Mode =====
export const {
  atom: authorizationsByModeAtom,
  use: useAuthorizationsByModeAtom,
} = contextAtomComputed<Map<EAgentAuthorizationMode, IAgentAuthorization[]>>(
  (get) => {
    const authorizations = get(activeAuthorizationsAtom());
    const byMode = new Map<EAgentAuthorizationMode, IAgentAuthorization[]>();
    
    authorizations.forEach((auth) => {
      const existing = byMode.get(auth.mode) || [];
      byMode.set(auth.mode, [...existing, auth]);
    });
    
    return byMode;
  },
);

// ===== Computed: Total Allocated/Spent Amounts =====
export const {
  atom: totalAmountsAtom,
  use: useTotalAmountsAtom,
} = contextAtomComputed<{
  totalAllocatedUsd: number;
  totalSpentUsd: number;
  totalRemainingUsd: number;
}>((get) => {
  const authorizations = get(activeAuthorizationsAtom());
  
  const totals = authorizations.reduce(
    (acc, auth) => ({
      totalAllocatedUsd:
        acc.totalAllocatedUsd + parseFloat(auth.allocatedAmountUsd || '0'),
      totalSpentUsd: acc.totalSpentUsd + parseFloat(auth.spentAmountUsd || '0'),
      totalRemainingUsd:
        acc.totalRemainingUsd + parseFloat(auth.remainingAmountUsd || '0'),
    }),
    { totalAllocatedUsd: 0, totalSpentUsd: 0, totalRemainingUsd: 0 },
  );
  
  return totals;
});
