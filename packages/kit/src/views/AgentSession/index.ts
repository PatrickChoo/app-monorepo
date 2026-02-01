/**
 * Agent Session - Main Export
 */

// Provider
export { AgentSessionProvider } from './AgentSessionProvider';

// Hooks
export * from './hooks';

// Skills (for AI to call)
export {
  demoAuthorizationScenario,
  executeWithAuthorization,
  revokeAuthorization,
  getActiveAuthorizations,
  DEMO_SCENARIOS,
} from './skills';

// Types
export * from './types';

// Pages (for routing)
export { AuthorizationListPage } from './pages/AuthorizationListPage';
export { AuthorizationDetailPage } from './pages/AuthorizationDetailPage';
