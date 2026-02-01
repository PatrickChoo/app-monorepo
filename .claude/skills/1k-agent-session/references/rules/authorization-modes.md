# Authorization Modes

## Overview

OneKey supports three authorization modes for AI agent interactions. The mode is **automatically selected** based on chain capabilities and action type.

## Mode A: Isolated Sub-Wallet

### Concept
Create a dedicated wallet for AI with a fixed balance. AI can only spend what's in this wallet.

### How It Works
```
┌──────────────┐
│ Main Wallet  │
│ (User owns)  │
└──────┬───────┘
       │ Transfer 0.1 ETH
       ▼
┌──────────────┐
│  Sub-Wallet  │
│ (AI uses)    │
└──────────────┘
```

### Characteristics
- **Universal**: Works on all chains (EVM, non-EVM)
- **Simple**: Just create wallet + transfer funds
- **Isolated**: AI can't access main wallet
- **Transparent**: User sees exact balance

### When Selected
- Non-EVM chains (Bitcoin, Solana, Cosmos, Near)
- Chains without AA or Vault support
- User explicitly requests Mode A

### Implementation
```typescript
// Create sub-wallet from master seed with derivation path
const subWallet = await wallet.deriveAccount({
  path: `m/44'/60'/0'/0/${nextIndex}`,
  purpose: 'ai-agent-isolation'
});

// Transfer initial funds
await wallet.sendTransaction({
  to: subWallet.address,
  value: '0.1' // ETH
});

// Store authorization
await saveAuthorization({
  mode: 'IsolatedSubWallet',
  subWalletAddress: subWallet.address,
  allocatedAmount: '0.1',
  remainingAmount: '0.1'
});
```

### Pros & Cons
✅ Works everywhere
✅ Simple to understand
✅ Complete isolation
❌ Requires on-chain transfer (gas cost)
❌ Can't enforce granular permissions
❌ AI has full control of sub-wallet

## Mode B: Vault Contract

### Concept
Deposit funds into a smart contract that enforces spending rules, contract whitelist, and method restrictions.

### How It Works
```
┌──────────────┐
│ Main Wallet  │
└──────┬───────┘
       │ Deposit
       ▼
┌──────────────────────┐
│  Vault Contract      │
│  ┌────────────────┐  │
│  │ Rules:         │  │
│  │ - Max: $100/day│  │
│  │ - Whitelist:   │  │
│  │   Uniswap ✓    │  │
│  │   SushiSwap ✗  │  │
│  └────────────────┘  │
└──────────────────────┘
       │
       ▼ AI executes through Vault
  ┌────────────┐
  │  Uniswap   │ ✓ Allowed
  └────────────┘
```

### Characteristics
- **Programmable**: Enforce rules on-chain
- **Granular**: Whitelist contracts/methods
- **Recoverable**: User can withdraw anytime
- **Transparent**: All rules visible on-chain

### When Selected
- EVM chains with smart contract support
- Transfer actions (simpler than swaps)
- When spending limits are critical

### Implementation
```typescript
// Deploy or use existing Vault
const vaultAddress = await deployVault({
  owner: userAddress,
  chainId: 'eip155:137' // Polygon
});

// Deposit funds
await depositToVault({
  vaultAddress,
  amount: '100', // MATIC
  token: 'native'
});

// Set rules
await setVaultRules({
  vaultAddress,
  rules: {
    dailyLimit: parseUnits('100', 18),
    contractWhitelist: [
      '0x...' // Allowed DEX
    ],
    methodWhitelist: [
      '0xa9059cbb', // transfer(address,uint256)
      '0x095ea7b3'  // approve(address,uint256)
    ]
  }
});

// AI executes transaction through Vault
await executeFromVault({
  vaultAddress,
  target: '0x...', // Must be whitelisted
  data: '0xa9059cbb...' // Must be whitelisted method
});
```

### Vault Contract Interface
```solidity
interface IOneKeyVault {
    struct Rules {
        uint256 dailyLimit;
        address[] contractWhitelist;
        bytes4[] methodWhitelist;
    }
    
    function deposit() external payable;
    function setRules(Rules calldata rules) external;
    function execute(address target, bytes calldata data) external;
    function withdraw(uint256 amount) external;
}
```

### Pros & Cons
✅ On-chain rule enforcement
✅ Granular permissions
✅ User can withdraw anytime
❌ Requires smart contract deployment
❌ Higher gas costs
❌ Only works on EVM chains

## Mode C: Session Key (Account Abstraction)

### Concept
Generate a temporary session key for AI with scoped permissions (methods, spending limits, TTL).

### How It Works
```
┌──────────────────┐
│  AA Wallet       │
│  (User's)        │
└────────┬─────────┘
         │ Register Session Key
         ▼
┌──────────────────────────┐
│  Session Key             │
│  ┌────────────────────┐  │
│  │ Permissions:       │  │
│  │ - swap() ✓         │  │
│  │ - transfer() ✗     │  │
│  │ - Max: $50         │  │
│  │ - TTL: 1 hour      │  │
│  └────────────────────┘  │
└──────────────────────────┘
         │
         ▼ AI signs with session key
    ┌────────────┐
    │  Bundler   │ Validates & executes
    └────────────┘
```

### Characteristics
- **Gasless**: Bundler handles gas (optional)
- **Scoped**: Precise permission control
- **Time-limited**: Automatic expiration
- **Revocable**: User can revoke anytime

### When Selected
- AA-supported chains (Ethereum, Polygon, Arbitrum, etc.)
- Swap/DeFi actions (frequent operations)
- When UX is critical (no manual signing)

### Implementation
```typescript
// Ensure AA wallet exists
const aaWallet = await ensureAAWallet({
  chainId: 'eip155:1' // Ethereum
});

// Generate ephemeral session key
const sessionKey = generateKeyPair();

// Register session key with permissions
await registerSessionKey({
  aaWalletAddress: aaWallet.address,
  sessionPublicKey: sessionKey.publicKey,
  permissions: {
    allowedMethods: [
      'swap(address,address,uint256,uint256,address)',
      'approve(address,uint256)'
    ],
    spendingLimit: parseUnits('50', 6), // $50 USDC
    validAfter: Math.floor(Date.now() / 1000),
    validUntil: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  }
});

// AI executes with session key
const userOp = await buildUserOperation({
  sender: aaWallet.address,
  callData: encodeSwapCall(...),
  signature: signWithSessionKey(sessionKey.privateKey, userOpHash)
});

await bundler.sendUserOperation(userOp);
```

### Session Key Contract Interface
```solidity
interface ISessionKeyPlugin {
    struct SessionKeyPermission {
        bytes4[] allowedMethods;
        uint256 spendingLimit;
        uint48 validAfter;
        uint48 validUntil;
    }
    
    function registerSessionKey(
        address sessionKey,
        SessionKeyPermission calldata permission
    ) external;
    
    function revokeSessionKey(address sessionKey) external;
    
    function validateSessionKey(
        address sessionKey,
        bytes4 method,
        uint256 value
    ) external view returns (bool);
}
```

### Pros & Cons
✅ Best UX (no manual signing)
✅ Granular permissions
✅ Time-limited
✅ Gasless option via bundler
❌ Requires AA wallet
❌ Limited chain support
❌ More complex implementation

## Mode Selection Matrix

| Chain Type | Action | Mode | Reason |
|------------|--------|------|--------|
| Ethereum | swap | C | AA + Session Key for best UX |
| Ethereum | transfer | B | Vault for spending limits |
| Polygon | swap | C | AA + Session Key |
| Polygon | transfer | B | Vault for simplicity |
| Arbitrum | swap | C | AA + Session Key |
| BNB Chain | transfer | B | Vault (no AA) |
| Bitcoin | any | A | Non-EVM, only sub-wallet |
| Solana | any | A | Non-EVM, only sub-wallet |

## Security Comparison

| Feature | Mode A | Mode B | Mode C |
|---------|--------|--------|--------|
| Isolation | ✅ Full | ✅ Full | ⚠️ Permission-based |
| Spending Limits | ❌ | ✅ | ✅ |
| Method Whitelist | ❌ | ✅ | ✅ |
| Time Limits | ❌ | ❌ | ✅ |
| Revocable | ⚠️ Drain sub-wallet | ✅ Withdraw | ✅ Revoke key |
| Gas Cost | Medium | High | Low (gasless) |

## Migration Between Modes

User can switch modes for the same AI agent:

```typescript
// Revoke Mode C authorization
await revokeSessionKey(sessionKeyAddress);

// Switch to Mode B
const newAuth = await runModeB({
  agentId: 'same-agent',
  chainId: 'eip155:1',
  action: 'transfer'
});
```

## Fallback Strategy

If selected mode fails, fallback to Mode A:

```typescript
let mode = chooseMode(chainId, action);

try {
  if (mode === 'SessionKey') {
    return await runModeC(request);
  } else if (mode === 'VaultContract') {
    return await runModeB(request);
  }
} catch (error) {
  console.log('Falling back to Mode A');
  return await runModeA(request);
}
```
