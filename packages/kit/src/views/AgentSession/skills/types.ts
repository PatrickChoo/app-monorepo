/**
 * Skill-specific Types
 */

import type { EAgentAuthorizationMode } from '../types';

/**
 * Result returned from authorization functions
 */
export interface IAuthorizationResult {
  success: boolean;
  authorizationId: string;
  mode: EAgentAuthorizationMode;
  
  // Mode-specific fields
  subWalletAddress?: string; // Mode A
  vaultContractAddress?: string; // Mode B
  sessionKeyPublicKey?: string; // Mode C
  
  // Common fields
  expiresAt?: number;
  allocatedAmount?: string;
  error?: string;
}

/**
 * Parameters for executing transactions with an existing authorization
 */
export interface IExecutionParams {
  action: 'swap' | 'transfer' | 'stake' | 'custom';
  
  // For swaps
  fromToken?: string;
  toToken?: string;
  
  // For transfers
  recipient?: string;
  
  // Common
  amount: string;
  
  // Optional
  slippage?: number;
  deadline?: number;
  customData?: Record<string, unknown>;
}
