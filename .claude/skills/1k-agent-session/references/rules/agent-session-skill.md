# Agent Session Skill Implementation

## Overview

The Agent Session Skill is the bridge between AI and OneKey App, handling:
- Authorization mode selection
- Transaction execution across different authorization modes
- Demo scenario orchestration

## File Structure

```
packages/kit/src/views/AgentSession/skills/
├── index.ts                          # Main Skill export
├── demoScenarios.ts                  # Demo scenario functions
├── modeExecutors/
│   ├── modeA.ts                     # Isolated sub-wallet execution
│   ├── modeB.ts                     # Vault contract execution
│   └── modeC.ts                     # Session key (AA) execution
└── types.ts                          # Skill-specific types
```

## Core Functions

### 1. demoAuthorizationScenario()

**Purpose**: Entry point for AI to trigger demo scenarios

**Signature**:
```typescript
async function demoAuthorizationScenario(
  scenarioId: string
): Promise<IAuthorizationResult>
```

**Scenarios**:
- `ethereum-swap` - Ethereum mainnet swap (Mode C)
- `polygon-transfer` - Polygon transfer (Mode B)
- `bitcoin-transfer` - Bitcoin transfer (Mode A)

**Flow**:
1. Load scenario configuration
2. Call `chooseMode()` to determine authorization mode
3. Create authorization request
4. Call appropriate mode executor
5. Return result to AI

### 2. chooseMode()

**Purpose**: Automatically select authorization mode based on chain and action

**Signature**:
```typescript
function chooseMode(
  chainId: string,
  action: 'swap' | 'transfer' | 'stake' | 'custom'
): IModeSelectionResult
```

**Location**: Already implemented in `utils/modeSelection.ts`

**Selection Logic**:
```
┌─────────────────┬──────────┬──────────────────┐
│ Chain           │ Action   │ Selected Mode    │
├─────────────────┼──────────┼──────────────────┤
│ Ethereum        │ swap     │ Mode C (Session) │
│ Polygon         │ transfer │ Mode B (Vault)   │
│ BNB Chain       │ transfer │ Mode B (Vault)   │
│ Bitcoin         │ transfer │ Mode A (Sub-Wallet)│
│ Solana          │ any      │ Mode A (Sub-Wallet)│
└─────────────────┴──────────┴──────────────────┘
```

### 3. runModeA() - Isolated Sub-Wallet

**Purpose**: Execute transaction using isolated sub-wallet

**Implementation**:
```typescript
async function runModeA(
  request: IAgentAuthorizationRequest
): Promise<IAuthorizationResult> {
  // 1. Generate new sub-wallet
  const subWallet = await createSubWallet();
  
  // 2. Transfer funds from main wallet to sub-wallet
  await transferToSubWallet(subWallet.address, request.requestedAmount);
  
  // 3. Create authorization record
  const authorization = await createAuthorization({
    mode: EAgentAuthorizationMode.IsolatedSubWallet,
    subWalletAddress: subWallet.address,
    ...request
  });
  
  // 4. Return authorization details
  return {
    success: true,
    authorizationId: authorization.id,
    mode: EAgentAuthorizationMode.IsolatedSubWallet,
    subWalletAddress: subWallet.address
  };
}
```

**Key APIs**:
- `createSubWallet()` - Generate new wallet from master seed
- `transferToSubWallet()` - Transfer initial funds
- `createAuthorization()` - Store authorization in app state

### 4. runModeB() - Vault Contract

**Purpose**: Execute transaction through Vault smart contract

**Implementation**:
```typescript
async function runModeB(
  request: IAgentAuthorizationRequest
): Promise<IAuthorizationResult> {
  // 1. Deploy or use existing Vault contract
  const vaultAddress = await getOrDeployVault(request.chainId);
  
  // 2. Deposit funds into Vault
  await depositToVault(vaultAddress, request.requestedAmount);
  
  // 3. Set spending rules on Vault
  await setVaultRules(vaultAddress, {
    spendingLimit: request.rules?.spendingLimitUsd,
    contractWhitelist: request.rules?.contractWhitelist,
    methodWhitelist: request.rules?.methodWhitelist
  });
  
  // 4. Create authorization record
  const authorization = await createAuthorization({
    mode: EAgentAuthorizationMode.VaultContract,
    vaultContractAddress: vaultAddress,
    ...request
  });
  
  return {
    success: true,
    authorizationId: authorization.id,
    mode: EAgentAuthorizationMode.VaultContract,
    vaultContractAddress: vaultAddress
  };
}
```

**Key APIs**:
- `getOrDeployVault()` - Get existing or deploy new Vault
- `depositToVault()` - Deposit funds
- `setVaultRules()` - Configure spending rules

### 5. runModeC() - Session Key (AA)

**Purpose**: Execute transaction using Account Abstraction + Session Key

**Implementation**:
```typescript
async function runModeC(
  request: IAgentAuthorizationRequest
): Promise<IAuthorizationResult> {
  // 1. Ensure AA wallet is initialized
  const aaWallet = await getOrCreateAAWallet(request.chainId);
  
  // 2. Generate session key pair
  const sessionKey = await generateSessionKey();
  
  // 3. Register session key on AA wallet with permissions
  await registerSessionKey(aaWallet.address, {
    publicKey: sessionKey.publicKey,
    permissions: {
      methodWhitelist: request.rules?.methodWhitelist,
      spendingLimit: request.rules?.spendingLimitUsd,
      ttl: request.rules?.ttlSeconds
    }
  });
  
  // 4. Create authorization record
  const authorization = await createAuthorization({
    mode: EAgentAuthorizationMode.SessionKey,
    sessionKeyPublicKey: sessionKey.publicKey,
    ...request
  });
  
  return {
    success: true,
    authorizationId: authorization.id,
    mode: EAgentAuthorizationMode.SessionKey,
    sessionKeyPublicKey: sessionKey.publicKey,
    expiresAt: Date.now() + (request.rules?.ttlSeconds || 3600) * 1000
  };
}
```

**Key APIs**:
- `getOrCreateAAWallet()` - Get or initialize AA wallet
- `generateSessionKey()` - Create ephemeral key pair
- `registerSessionKey()` - Register on AA wallet contract

## Demo Scenarios Configuration

```typescript
export const DEMO_SCENARIOS: IDemoScenario[] = [
  {
    id: 'ethereum-swap',
    name: 'Ethereum Swap (Uniswap)',
    description: 'Swap 0.1 ETH to USDC on Ethereum mainnet using Session Key',
    chainId: 'eip155:1',
    networkName: 'Ethereum',
    suggestedMode: EAgentAuthorizationMode.SessionKey,
    action: 'swap',
    tokenSymbol: 'ETH',
    amount: '0.1'
  },
  {
    id: 'polygon-transfer',
    name: 'Polygon Transfer',
    description: 'Transfer 10 MATIC on Polygon using Vault Contract',
    chainId: 'eip155:137',
    networkName: 'Polygon',
    suggestedMode: EAgentAuthorizationMode.VaultContract,
    action: 'transfer',
    tokenSymbol: 'MATIC',
    amount: '10'
  },
  {
    id: 'bitcoin-transfer',
    name: 'Bitcoin Transfer',
    description: 'Transfer 0.001 BTC using Isolated Sub-Wallet',
    chainId: 'bitcoin:mainnet',
    networkName: 'Bitcoin',
    suggestedMode: EAgentAuthorizationMode.IsolatedSubWallet,
    action: 'transfer',
    tokenSymbol: 'BTC',
    amount: '0.001'
  }
];
```

## Error Handling

```typescript
try {
  const result = await demoAuthorizationScenario('ethereum-swap');
  return result;
} catch (error) {
  if (error instanceof ChainNotSupportedError) {
    // Fallback to Mode A
    return runModeA(request);
  }
  if (error instanceof InsufficientBalanceError) {
    throw new Error('Insufficient balance for authorization');
  }
  throw error;
}
```

## Testing

```typescript
// Example AI call
const result = await demoAuthorizationScenario('ethereum-swap');

// Expected result
{
  success: true,
  authorizationId: 'auth-123',
  mode: 'SessionKey',
  sessionKeyPublicKey: '0x...',
  expiresAt: 1234567890
}
```

## Next Steps

1. Implement actual wallet/contract integration
2. Add UI confirmation modals
3. Implement authorization state management
4. Add transaction execution logic
5. Build authorization management UI
