/**
 * Demo Scenarios for AI Agent Authorization
 * 
 * These scenarios demonstrate the three authorization modes:
 * - Mode A: Isolated Sub-Wallet
 * - Mode B: Vault Contract
 * - Mode C: Session Key (AA)
 */

import { EAgentAuthorizationMode } from '../types';
import type { IDemoScenario } from '../types';

/**
 * Demo Scenarios Configuration
 * 
 * Each scenario represents a typical use case that triggers
 * a specific authorization mode based on chain and action type.
 */
export const DEMO_SCENARIOS: IDemoScenario[] = [
  // Mode C Demo: Ethereum + Swap → Session Key (AA)
  {
    id: 'ethereum-swap',
    name: 'Ethereum Swap (Uniswap)',
    description: 'Swap 0.1 ETH to USDC on Ethereum mainnet using Session Key authorization',
    chainId: 'eip155:1',
    networkName: 'Ethereum',
    suggestedMode: EAgentAuthorizationMode.SessionKey,
    action: 'swap',
    tokenSymbol: 'ETH',
    amount: '0.1',
  },
  
  // Mode B Demo: Polygon + Transfer → Vault Contract
  {
    id: 'polygon-transfer',
    name: 'Polygon Transfer',
    description: 'Transfer 10 MATIC on Polygon using Vault Contract with spending limits',
    chainId: 'eip155:137',
    networkName: 'Polygon',
    suggestedMode: EAgentAuthorizationMode.VaultContract,
    action: 'transfer',
    tokenSymbol: 'MATIC',
    amount: '10',
  },
  
  // Mode A Demo: Bitcoin → Isolated Sub-Wallet
  {
    id: 'bitcoin-transfer',
    name: 'Bitcoin Transfer',
    description: 'Transfer 0.001 BTC using Isolated Sub-Wallet (non-EVM chain)',
    chainId: 'bitcoin:mainnet',
    networkName: 'Bitcoin',
    suggestedMode: EAgentAuthorizationMode.IsolatedSubWallet,
    action: 'transfer',
    tokenSymbol: 'BTC',
    amount: '0.001',
  },
  
  // Additional scenarios for comprehensive testing
  
  // Mode C: Arbitrum + Swap
  {
    id: 'arbitrum-swap',
    name: 'Arbitrum Swap',
    description: 'Swap on Arbitrum using Session Key for optimal gas efficiency',
    chainId: 'eip155:42161',
    networkName: 'Arbitrum',
    suggestedMode: EAgentAuthorizationMode.SessionKey,
    action: 'swap',
    tokenSymbol: 'ETH',
    amount: '0.05',
  },
  
  // Mode B: BNB Chain + Transfer
  {
    id: 'bnb-transfer',
    name: 'BNB Chain Transfer',
    description: 'Transfer on BNB Chain using Vault Contract (no native AA)',
    chainId: 'eip155:56',
    networkName: 'BNB Chain',
    suggestedMode: EAgentAuthorizationMode.VaultContract,
    action: 'transfer',
    tokenSymbol: 'BNB',
    amount: '0.5',
  },
  
  // Mode A: Solana
  {
    id: 'solana-transfer',
    name: 'Solana Transfer',
    description: 'Transfer SOL using Isolated Sub-Wallet (non-EVM)',
    chainId: 'solana:mainnet',
    networkName: 'Solana',
    suggestedMode: EAgentAuthorizationMode.IsolatedSubWallet,
    action: 'transfer',
    tokenSymbol: 'SOL',
    amount: '0.1',
  },
  
  // Mode C: Base + Stake
  {
    id: 'base-stake',
    name: 'Base Staking',
    description: 'Stake ETH on Base using Session Key for recurring operations',
    chainId: 'eip155:8453',
    networkName: 'Base',
    suggestedMode: EAgentAuthorizationMode.SessionKey,
    action: 'stake',
    tokenSymbol: 'ETH',
    amount: '0.1',
  },
];

/**
 * Get scenario by ID
 */
export function getScenarioById(scenarioId: string): IDemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === scenarioId);
}

/**
 * Get scenarios by mode
 */
export function getScenariosByMode(
  mode: EAgentAuthorizationMode,
): IDemoScenario[] {
  return DEMO_SCENARIOS.filter((s) => s.suggestedMode === mode);
}

/**
 * Get scenarios by chain
 */
export function getScenariosByChain(chainId: string): IDemoScenario[] {
  return DEMO_SCENARIOS.filter((s) => s.chainId === chainId);
}
