/**
 * Agent Authorization Storage Service
 * 
 * Handles persistent storage of authorization records using AsyncStorage
 */

import { getAppStorage } from '@onekeyhq/kit-bg/src/dbs/local/appStorage';
import type {
  IAgentAuthorization,
  EAgentAuthorizationStatus,
} from '../types';

const STORAGE_KEY_PREFIX = 'agent_session_';
const STORAGE_KEY_AUTHORIZATIONS = `${STORAGE_KEY_PREFIX}authorizations`;
const STORAGE_KEY_HISTORY = `${STORAGE_KEY_PREFIX}history`;

/**
 * Get all authorizations from storage
 */
export async function getStoredAuthorizations(): Promise<IAgentAuthorization[]> {
  try {
    const storage = await getAppStorage();
    const data = await storage.getItem(STORAGE_KEY_AUTHORIZATIONS);
    
    if (!data) {
      return [];
    }
    
    return JSON.parse(data) as IAgentAuthorization[];
  } catch (error) {
    console.error('[AgentSession] Failed to load authorizations:', error);
    return [];
  }
}

/**
 * Save authorizations to storage
 */
export async function saveAuthorizations(
  authorizations: IAgentAuthorization[],
): Promise<void> {
  try {
    const storage = await getAppStorage();
    await storage.setItem(
      STORAGE_KEY_AUTHORIZATIONS,
      JSON.stringify(authorizations),
    );
  } catch (error) {
    console.error('[AgentSession] Failed to save authorizations:', error);
    throw error;
  }
}

/**
 * Add a new authorization
 */
export async function addAuthorization(
  authorization: IAgentAuthorization,
): Promise<void> {
  const authorizations = await getStoredAuthorizations();
  authorizations.push(authorization);
  await saveAuthorizations(authorizations);
  
  // Also add to history
  await addToHistory(authorization);
}

/**
 * Update an existing authorization
 */
export async function updateAuthorization(
  authorizationId: string,
  updates: Partial<IAgentAuthorization>,
): Promise<void> {
  const authorizations = await getStoredAuthorizations();
  const index = authorizations.findIndex((auth) => auth.id === authorizationId);
  
  if (index === -1) {
    throw new Error(`Authorization not found: ${authorizationId}`);
  }
  
  authorizations[index] = {
    ...authorizations[index],
    ...updates,
    updatedAt: Date.now(),
  };
  
  await saveAuthorizations(authorizations);
  
  // Update history as well
  await updateHistory(authorizationId, updates);
}

/**
 * Delete an authorization
 */
export async function deleteAuthorization(authorizationId: string): Promise<void> {
  const authorizations = await getStoredAuthorizations();
  const filtered = authorizations.filter((auth) => auth.id !== authorizationId);
  await saveAuthorizations(filtered);
}

/**
 * Get authorization by ID
 */
export async function getAuthorizationById(
  authorizationId: string,
): Promise<IAgentAuthorization | null> {
  const authorizations = await getStoredAuthorizations();
  return authorizations.find((auth) => auth.id === authorizationId) || null;
}

/**
 * Get active authorizations (not expired or revoked)
 */
export async function getActiveAuthorizations(): Promise<IAgentAuthorization[]> {
  const authorizations = await getStoredAuthorizations();
  const now = Date.now();
  
  return authorizations.filter((auth) => {
    // Filter out expired and revoked
    if (auth.status === 'Expired' || auth.status === 'Revoked') {
      return false;
    }
    
    // Check if expired by time
    if (auth.rules.expiresAt && auth.rules.expiresAt < now) {
      // Auto-update status
      void updateAuthorization(auth.id, { status: 'Expired' });
      return false;
    }
    
    return true;
  });
}

/**
 * Get authorization history
 */
export async function getAuthorizationHistory(): Promise<IAgentAuthorization[]> {
  try {
    const storage = await getAppStorage();
    const data = await storage.getItem(STORAGE_KEY_HISTORY);
    
    if (!data) {
      return [];
    }
    
    return JSON.parse(data) as IAgentAuthorization[];
  } catch (error) {
    console.error('[AgentSession] Failed to load history:', error);
    return [];
  }
}

/**
 * Add to history
 */
async function addToHistory(authorization: IAgentAuthorization): Promise<void> {
  try {
    const history = await getAuthorizationHistory();
    history.push(authorization);
    
    const storage = await getAppStorage();
    await storage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('[AgentSession] Failed to add to history:', error);
  }
}

/**
 * Update history entry
 */
async function updateHistory(
  authorizationId: string,
  updates: Partial<IAgentAuthorization>,
): Promise<void> {
  try {
    const history = await getAuthorizationHistory();
    const index = history.findIndex((auth) => auth.id === authorizationId);
    
    if (index !== -1) {
      history[index] = {
        ...history[index],
        ...updates,
        updatedAt: Date.now(),
      };
      
      const storage = await getAppStorage();
      await storage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    }
  } catch (error) {
    console.error('[AgentSession] Failed to update history:', error);
  }
}

/**
 * Clear all data (for testing/reset)
 */
export async function clearAllData(): Promise<void> {
  try {
    const storage = await getAppStorage();
    await storage.removeItem(STORAGE_KEY_AUTHORIZATIONS);
    await storage.removeItem(STORAGE_KEY_HISTORY);
  } catch (error) {
    console.error('[AgentSession] Failed to clear data:', error);
    throw error;
  }
}
