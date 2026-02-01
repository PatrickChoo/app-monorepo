import type { ITabSubNavigatorConfig } from '@onekeyhq/components';
import { LazyLoadPage } from '@onekeyhq/kit/src/components/LazyLoadPage';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import {
  ETabAgentSessionRoutes,
  type ITabAgentSessionParamList,
} from '@onekeyhq/shared/src/routes';

const AgentDashboard = LazyLoadPage(
  () => import('../../../views/AgentSession/pages/AgentDashboard'),
);

const AuthorizationDetail = LazyLoadPage(
  () => import('../../../views/AgentSession/pages/AuthorizationDetail'),
);

const DemoScenarios = LazyLoadPage(
  () => import('../../../views/AgentSession/pages/DemoScenarios'),
);

export const agentSessionRouters: ITabSubNavigatorConfig<
  ETabAgentSessionRoutes,
  ITabAgentSessionParamList
>[] = [
  {
    name: ETabAgentSessionRoutes.TabAgentDashboard,
    rewrite: '/',
    component: AgentDashboard,
    headerShown: !platformEnv.isNative,
  },
  {
    name: ETabAgentSessionRoutes.TabAuthorizationDetail,
    rewrite: '/authorization/:authorizationId',
    component: AuthorizationDetail,
    headerShown: !platformEnv.isNative,
  },
  {
    name: ETabAgentSessionRoutes.TabDemoScenarios,
    rewrite: '/demo-scenarios',
    component: DemoScenarios,
    headerShown: !platformEnv.isNative,
  },
];
