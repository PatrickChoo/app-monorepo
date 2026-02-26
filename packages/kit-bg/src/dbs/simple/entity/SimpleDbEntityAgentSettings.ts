/**
 * Agent Settings Entity
 *
 * Stores user preferences for AI agent session management.
 */

import { backgroundMethod } from '@onekeyhq/shared/src/background/backgroundDecorators';

import { SimpleDbEntityBase } from '../base/SimpleDbEntityBase';

export interface IAgentSettings {
  // Default authorization mode preference
  defaultMode?: string;
  // Whether to require biometric confirmation
  requireBiometric?: boolean;
  // Auto-revoke after inactivity (seconds, 0 = disabled)
  autoRevokeAfterSeconds?: number;
  // Maximum concurrent authorizations
  maxConcurrentAuthorizations?: number;
  // Audit log retention days
  auditLogRetentionDays?: number;
}

export class SimpleDbEntityAgentSettings extends SimpleDbEntityBase<IAgentSettings> {
  entityName = 'agentSettings';

  override enableCache = false;

  @backgroundMethod()
  async getSettings(): Promise<IAgentSettings> {
    const data = await this.getRawData();
    return data ?? {};
  }

  @backgroundMethod()
  async updateSettings(
    updates: Partial<IAgentSettings>,
  ): Promise<void> {
    const current = await this.getSettings();
    await this.setRawData({ ...current, ...updates });
  }

  @backgroundMethod()
  async resetSettings(): Promise<void> {
    await this.setRawData({});
  }
}
