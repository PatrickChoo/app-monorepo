// AI Agent Authorization Mode Types

export enum EAgentAuthorizationMode {
  // Mode A: Isolated Sub-Wallet - AI operates with a dedicated sub-wallet with limited funds
  IsolatedSubWallet = 'IsolatedSubWallet',
  // Mode B: Vault Contract - Funds in smart contract with enforced rules
  VaultContract = 'VaultContract',
  // Mode C: Account Abstraction + Session Key - AA wallet with session key for AI
  SessionKey = 'SessionKey',
}

export enum EAgentAuthorizationStatus {
  Pending = 'Pending',
  Active = 'Active',
  Expired = 'Expired',
  Revoked = 'Revoked',
}

export interface IAgentAuthorizationRule {
  // Spending limit in USD equivalent
  spendingLimitUsd?: number;
  // Whitelist of allowed contract addresses
  contractWhitelist?: string[];
  // Whitelist of allowed method signatures
  methodWhitelist?: string[];
  // Time-to-live in seconds
  ttlSeconds?: number;
  // Expiration timestamp
  expiresAt?: number;
}

export interface IAgentAuthorization {
  id: string;
  mode: EAgentAuthorizationMode;
  status: EAgentAuthorizationStatus;
  // Chain the authorization is for
  chainId: string;
  networkName: string;
  // The AI agent/skill identifier
  agentId: string;
  agentName: string;
  agentDescription?: string;
  // Authorization rules
  rules?: IAgentAuthorizationRule;
  // Amount authorized/allocated
  allocatedAmount?: string;
  allocatedAmountUsd?: string;
  // Amount already spent
  spentAmount?: string;
  spentAmountUsd?: string;
  // Remaining allowance
  remainingAmount?: string;
  remainingAmountUsd?: string;
  // Token symbol for the allocation
  tokenSymbol?: string;
  // Timestamps
  createdAt: number;
  updatedAt: number;
  
  // For Mode A: Agent account address (derived from user's wallet)
  agentAccountAddress?: string;
  // For Mode A: Agent account ID (OneKey internal tracking)
  agentAccountId?: string;
  // For Mode A: BIP44 derivation path of the agent account
  agentAccountPath?: string;
  // For Mode A: Derivation index in agent-dedicated range (10,000+)
  agentAccountIndex?: number;
  // For Mode A: Source wallet ID (which wallet the agent account is derived from)
  sourceWalletId?: string;
  // For Mode A: Funding source account ID
  fundingAccountId?: string;
  // For Mode A: Funding source account address
  fundingAccountAddress?: string;
  // For Mode A/B: Transaction hash of funding operation
  fundingTxHash?: string;
  
  // For Mode A: Permission mode
  permissionMode?: 'ask-every-time' | 'always-allow';
  // For Mode A: Whether private key was exported
  privateKeyExported?: boolean;
  
  // For Mode A: Purpose of authorization
  purpose?: string;
  
  // For Mode B: vault contract address
  vaultContractAddress?: string;
  // For Mode C: session key public key
  sessionKeyPublicKey?: string;
}

export interface IAgentAuthorizationRequest {
  agentId: string;
  agentName: string;
  chainId: string;
  networkName: string;
  requestedMode?: EAgentAuthorizationMode;
  requestedAmount?: string;
  requestedAmountUsd?: string;
  tokenSymbol?: string;
  rules?: Partial<IAgentAuthorizationRule>;
  // Purpose/reason for the authorization
  purpose?: string;
  // Demo scenario identifier
  scenarioId?: string;
}

export interface IDemoScenario {
  id: string;
  name: string;
  description: string;
  chainId: string;
  networkName: string;
  suggestedMode: EAgentAuthorizationMode;
  action: 'swap' | 'transfer' | 'stake' | 'custom';
  tokenSymbol: string;
  amount: string;
}

// Mode selection logic result
export interface IModeSelectionResult {
  mode: EAgentAuthorizationMode;
  reason: string;
  // Whether the chain supports the selected mode
  isSupported: boolean;
  // Fallback mode if primary is not supported
  fallbackMode?: EAgentAuthorizationMode;
}
