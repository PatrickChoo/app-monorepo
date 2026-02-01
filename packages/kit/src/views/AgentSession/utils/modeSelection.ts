import {
  EAgentAuthorizationMode,
  type IAgentAuthorizationRequest,
  type IModeSelectionResult,
} from '../types';

// Chains that support Account Abstraction (ERC-4337 or native AA)
const AA_SUPPORTED_CHAINS = [
  'eip155:1', // Ethereum Mainnet
  'eip155:137', // Polygon
  'eip155:42161', // Arbitrum
  'eip155:10', // Optimism
  'eip155:8453', // Base
  'eip155:324', // zkSync Era (native AA)
  'eip155:59144', // Linea
];

// Chains that support Vault contracts
const VAULT_SUPPORTED_CHAINS = [
  'eip155:1', // Ethereum Mainnet
  'eip155:137', // Polygon
  'eip155:42161', // Arbitrum
  'eip155:10', // Optimism
  'eip155:56', // BNB Chain
  'eip155:43114', // Avalanche
  'eip155:250', // Fantom
  'eip155:8453', // Base
];

// EVM chains that support sub-wallet pattern
const EVM_CHAINS = [
  'eip155:1',
  'eip155:137',
  'eip155:42161',
  'eip155:10',
  'eip155:56',
  'eip155:43114',
  'eip155:250',
  'eip155:8453',
  'eip155:324',
  'eip155:59144',
];

// Non-EVM chains (only support Mode A - isolated sub-wallet)
const NON_EVM_CHAINS = [
  'solana:mainnet',
  'bitcoin:mainnet',
  'cosmos:cosmoshub-4',
  'near:mainnet',
];

/**
 * Automatically selects the best authorization mode based on:
 * 1. Chain capabilities (AA support, smart contract support)
 * 2. Requested action type (swap, transfer, stake)
 * 3. Security requirements
 *
 * Selection Logic:
 * - Swap actions on AA-supported chains → Mode C (Session Key)
 * - Transfer actions on Vault-supported chains → Mode B (Vault Contract)
 * - Non-AA/Non-EVM chains → Mode A (Isolated Sub-Wallet)
 */
export function chooseAuthorizationMode(
  request: IAgentAuthorizationRequest,
  action: 'swap' | 'transfer' | 'stake' | 'custom' = 'transfer',
): IModeSelectionResult {
  const { chainId } = request;

  // Check if the chain is non-EVM (only Mode A supported)
  if (NON_EVM_CHAINS.includes(chainId)) {
    return {
      mode: EAgentAuthorizationMode.IsolatedSubWallet,
      reason: `Non-EVM chain (${request.networkName}) - using isolated sub-wallet for maximum compatibility`,
      isSupported: true,
    };
  }

  // For swap actions on AA-supported chains, prefer Mode C (Session Key)
  if (action === 'swap' && AA_SUPPORTED_CHAINS.includes(chainId)) {
    return {
      mode: EAgentAuthorizationMode.SessionKey,
      reason: `Swap action on ${request.networkName} - using Session Key for optimal UX with scoped permissions`,
      isSupported: true,
    };
  }

  // For stake actions on AA-supported chains, prefer Mode C (Session Key)
  if (action === 'stake' && AA_SUPPORTED_CHAINS.includes(chainId)) {
    return {
      mode: EAgentAuthorizationMode.SessionKey,
      reason: `Stake action on ${request.networkName} - using Session Key for recurring operations`,
      isSupported: true,
    };
  }

  // For transfer actions on Vault-supported chains, prefer Mode B
  if (action === 'transfer' && VAULT_SUPPORTED_CHAINS.includes(chainId)) {
    return {
      mode: EAgentAuthorizationMode.VaultContract,
      reason: `Transfer action on ${request.networkName} - using Vault Contract for spending limits`,
      isSupported: true,
      fallbackMode: EAgentAuthorizationMode.IsolatedSubWallet,
    };
  }

  // For any EVM chain, we can fall back to Mode A
  if (EVM_CHAINS.includes(chainId)) {
    return {
      mode: EAgentAuthorizationMode.IsolatedSubWallet,
      reason: `EVM chain ${request.networkName} - using isolated sub-wallet`,
      isSupported: true,
    };
  }

  // Default fallback: Mode A (works on all chains)
  return {
    mode: EAgentAuthorizationMode.IsolatedSubWallet,
    reason: `Default mode - using isolated sub-wallet for compatibility`,
    isSupported: true,
  };
}

/**
 * Get human-readable mode name
 */
export function getModeName(mode: EAgentAuthorizationMode): string {
  switch (mode) {
    case EAgentAuthorizationMode.IsolatedSubWallet:
      return 'Isolated Sub-Wallet';
    case EAgentAuthorizationMode.VaultContract:
      return 'Vault Contract';
    case EAgentAuthorizationMode.SessionKey:
      return 'Session Key (AA)';
    default:
      return 'Unknown';
  }
}

/**
 * Get mode description
 */
export function getModeDescription(mode: EAgentAuthorizationMode): string {
  switch (mode) {
    case EAgentAuthorizationMode.IsolatedSubWallet:
      return 'Creates a dedicated wallet for AI with a fixed balance. AI can only spend the transferred amount.';
    case EAgentAuthorizationMode.VaultContract:
      return 'Deposits funds into a smart contract that enforces spending limits and whitelisted operations.';
    case EAgentAuthorizationMode.SessionKey:
      return 'Uses Account Abstraction to create a time-limited session key with scoped permissions for AI.';
    default:
      return '';
  }
}

/**
 * Get mode icon name
 */
export function getModeIcon(
  mode: EAgentAuthorizationMode,
): 'WalletOutline' | 'SafeOutline' | 'KeyOutline' {
  switch (mode) {
    case EAgentAuthorizationMode.IsolatedSubWallet:
      return 'WalletOutline';
    case EAgentAuthorizationMode.VaultContract:
      return 'SafeOutline';
    case EAgentAuthorizationMode.SessionKey:
      return 'KeyOutline';
    default:
      return 'WalletOutline';
  }
}
