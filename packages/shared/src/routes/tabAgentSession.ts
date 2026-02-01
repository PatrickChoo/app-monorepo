export enum ETabAgentSessionRoutes {
  TabAgentDashboard = 'TabAgentDashboard',
  TabAuthorizationList = 'TabAuthorizationList',
  TabAuthorizationDetail = 'TabAuthorizationDetail',
  TabDemoScenarios = 'TabDemoScenarios',
}

export type ITabAgentSessionParamList = {
  [ETabAgentSessionRoutes.TabAgentDashboard]: undefined;
  [ETabAgentSessionRoutes.TabAuthorizationList]: undefined;
  [ETabAgentSessionRoutes.TabAuthorizationDetail]: {
    id: string;
  };
  [ETabAgentSessionRoutes.TabDemoScenarios]: undefined;
};
