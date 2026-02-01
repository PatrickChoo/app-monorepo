export enum ETabAgentSessionRoutes {
  TabAgentDashboard = 'TabAgentDashboard',
  TabAuthorizationDetail = 'TabAuthorizationDetail',
  TabDemoScenarios = 'TabDemoScenarios',
}

export type ITabAgentSessionParamList = {
  [ETabAgentSessionRoutes.TabAgentDashboard]: undefined;
  [ETabAgentSessionRoutes.TabAuthorizationDetail]: {
    authorizationId: string;
  };
  [ETabAgentSessionRoutes.TabDemoScenarios]: undefined;
};
