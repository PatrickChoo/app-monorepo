import type { PropsWithChildren } from 'react';

import { ProviderJotaiContextAgentSession } from './states/atoms';

export function AgentSessionProvider({ children }: PropsWithChildren) {
  return (
    <ProviderJotaiContextAgentSession>
      {children}
    </ProviderJotaiContextAgentSession>
  );
}
