/**
 * Settings Service
 * 
 * Manages Agent Session settings including audit logging preferences
 */

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';

export interface IAgentSessionSettings {
  // Audit logging
  auditLoggingEnabled: boolean;
  auditLogRetentionDays: number;
  autoCleanupEnabled: boolean;
  
  // Future settings
  // notificationsEnabled?: boolean;
  // defaultPermissionMode?: 'ask-every-time' | 'always-allow';
}

const DEFAULT_SETTINGS: IAgentSessionSettings = {
  auditLoggingEnabled: true,  // Enabled by default
  auditLogRetentionDays: 90,  // 90 days default
  autoCleanupEnabled: true,   // Auto-cleanup enabled
};

/**
 * Get Agent Session settings
 */
export async function getAgentSessionSettings(): Promise<IAgentSessionSettings> {
  try {
    const settings = await backgroundApiProxy.simpleDb.agentSettings.getSettings();
    return settings || DEFAULT_SETTINGS;
  } catch (error) {
    console.error('[Settings] Failed to get settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update Agent Session settings
 */
export async function updateAgentSessionSettings(
  updates: Partial<IAgentSessionSettings>,
): Promise<void> {
  try {
    const current = await getAgentSessionSettings();
    const updated = { ...current, ...updates };
    await backgroundApiProxy.simpleDb.agentSettings.updateSettings(updated);
    console.log('[Settings] Updated:', updates);
  } catch (error) {
    console.error('[Settings] Failed to update settings:', error);
    throw error;
  }
}

/**
 * Reset settings to default
 */
export async function resetAgentSessionSettings(): Promise<void> {
  await backgroundApiProxy.simpleDb.agentSettings.updateSettings(DEFAULT_SETTINGS);
  console.log('[Settings] Reset to defaults');
}

/**
 * Check if audit logging is enabled
 * 
 * This should be called before adding audit logs
 */
export async function isAuditLoggingEnabled(): Promise<boolean> {
  const settings = await getAgentSessionSettings();
  return settings.auditLoggingEnabled;
}
