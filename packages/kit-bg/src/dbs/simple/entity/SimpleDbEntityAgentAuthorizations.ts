/**
 * Agent Authorizations Entity
 * 
 * Stores AI agent authorization records with full details.
 */

import { backgroundMethod } from '@onekeyhq/shared/src/background/backgroundDecorators';
import type { IAgentAuthorization } from '@onekeyhq/kit/src/views/AgentSession/types';
import { EAgentAuthorizationStatus } from '@onekeyhq/kit/src/views/AgentSession/types';

import { SimpleDbEntityBase } from '../base/SimpleDbEntityBase';

export interface IAgentAuthorizationsList {
  authorizations: IAgentAuthorization[];
}

export class SimpleDbEntityAgentAuthorizations extends SimpleDbEntityBase<IAgentAuthorizationsList> {
  entityName = 'agentAuthorizations';

  override enableCache = false;

  @backgroundMethod()
  async addAuthorization(authorization: IAgentAuthorization) {
    const data = await this.getRawData();
    const authorizations = data?.authorizations ?? [];

    // Check if already exists
    if (authorizations.find((a) => a.id === authorization.id)) {
      console.warn('[AgentAuthorizations] Authorization already exists:', authorization.id);
      return;
    }

    // Add to front
    authorizations.unshift(authorization);

    await this.setRawData({ authorizations });
  }

  @backgroundMethod()
  async getAuthorizationById(id: string): Promise<IAgentAuthorization | null> {
    const data = await this.getRawData();
    const authorizations = data?.authorizations ?? [];

    return authorizations.find((a) => a.id === id) ?? null;
  }

  @backgroundMethod()
  async updateAuthorization(
    id: string,
    updates: Partial<IAgentAuthorization>,
  ): Promise<void> {
    const data = await this.getRawData();
    const authorizations = data?.authorizations ?? [];

    const index = authorizations.findIndex((a) => a.id === id);

    if (index === -1) {
      throw new Error(`Authorization not found: ${id}`);
    }

    // Merge updates
    authorizations[index] = {
      ...authorizations[index],
      ...updates,
      updatedAt: Date.now(),
    };

    await this.setRawData({ authorizations });
  }

  @backgroundMethod()
  async getAllAuthorizations(): Promise<IAgentAuthorization[]> {
    const data = await this.getRawData();
    return data?.authorizations ?? [];
  }

  @backgroundMethod()
  async getActiveAuthorizations(): Promise<IAgentAuthorization[]> {
    const data = await this.getRawData();
    const authorizations = data?.authorizations ?? [];
    const now = Date.now();

    return authorizations.filter((auth) => {
      if (auth.status !== EAgentAuthorizationStatus.Active) {
        return false;
      }

      // Check expiration
      if (auth.rules?.expiresAt && auth.rules.expiresAt < now) {
        // Mark as expired (don't await - do it in background)
        void this.updateAuthorization(auth.id, {
          status: EAgentAuthorizationStatus.Expired,
        });
        return false;
      }

      return true;
    });
  }

  @backgroundMethod()
  async getAuthorizationsByAgent(agentId: string): Promise<IAgentAuthorization[]> {
    const data = await this.getRawData();
    const authorizations = data?.authorizations ?? [];

    return authorizations.filter((a) => a.agentId === agentId);
  }

  @backgroundMethod()
  async revokeAuthorization(id: string): Promise<void> {
    await this.updateAuthorization(id, {
      status: EAgentAuthorizationStatus.Revoked,
    });
  }

  @backgroundMethod()
  async deleteAuthorization(id: string): Promise<void> {
    const data = await this.getRawData();
    const authorizations = data?.authorizations ?? [];

    const newAuthorizations = authorizations.filter((a) => a.id !== id);

    await this.setRawData({ authorizations: newAuthorizations });
  }

  @backgroundMethod()
  async cleanupExpiredAuthorizations(): Promise<number> {
    const data = await this.getRawData();
    const authorizations = data?.authorizations ?? [];
    const now = Date.now();

    let count = 0;

    for (let i = 0; i < authorizations.length; i++) {
      const auth = authorizations[i];
      if (
        auth.status === EAgentAuthorizationStatus.Active &&
        auth.rules?.expiresAt &&
        auth.rules.expiresAt < now
      ) {
        authorizations[i] = {
          ...auth,
          status: EAgentAuthorizationStatus.Expired,
          updatedAt: now,
        };
        count++;
      }
    }

    if (count > 0) {
      await this.setRawData({ authorizations });
    }

    return count;
  }
}
