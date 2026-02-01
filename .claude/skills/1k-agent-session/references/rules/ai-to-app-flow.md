# AI → Skill → App Flow

## Overview

This document describes the complete flow from AI receiving a user request to OneKey App executing the transaction.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ User: "Swap 0.1 ETH to USDC on Ethereum"                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ AI Agent (Claude/GPT)                                            │
│ - Parses intent: swap, Ethereum, 0.1 ETH → USDC                 │
│ - Determines: Need OneKey authorization                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Skill Function: demoAuthorizationScenario('ethereum-swap')      │
│                                                                  │
│ 1. Load scenario config:                                        │
│    - chainId: 'eip155:1'                                        │
│    - action: 'swap'                                             │
│    - amount: '0.1 ETH'                                          │
│                                                                  │
│ 2. Call chooseMode('eip155:1', 'swap')                          │
│    → Result: Mode C (Session Key)                               │
│    → Reason: "Swap on AA-supported chain"                       │
│                                                                  │
│ 3. Build authorization request:                                 │
│    {                                                             │
│      agentId: 'claude-agent-123',                               │
│      agentName: 'Claude Assistant',                             │
│      chainId: 'eip155:1',                                       │
│      requestedMode: 'SessionKey',                               │
│      requestedAmount: '0.1',                                    │
│      tokenSymbol: 'ETH',                                        │
│      rules: {                                                   │
│        methodWhitelist: ['swap', 'approve'],                    │
│        spendingLimitUsd: 500,                                   │
│        ttlSeconds: 3600                                         │
│      }                                                           │
│    }                                                             │
│                                                                  │
│ 4. Call runModeC(request)                                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ OneKey App API                                                   │
│                                                                  │
│ runModeC() implementation:                                      │
│ 1. Check if AA wallet exists                                    │
│    - If not: Prompt user to create AA wallet                    │
│                                                                  │
│ 2. Generate session key pair                                    │
│    sessionKey = {                                               │
│      publicKey: '0x...',                                        │
│      privateKey: '0x...' (stored securely)                      │
│    }                                                             │
│                                                                  │
│ 3. Show Authorization Modal (1Password-style)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Authorization Modal (User sees)                                 │
│                                                                  │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 🤖 AI Agent Authorization Request                         ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                            ┃  │
│  ┃ Agent: Claude Assistant                                   ┃  │
│  ┃ Purpose: Swap 0.1 ETH to USDC                             ┃  │
│  ┃                                                            ┃  │
│  ┃ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ┃  │
│  ┃                                                            ┃  │
│  ┃ Authorization Mode: Session Key (AA)                      ┃  │
│  ┃ ✓ Time-limited session key with scoped permissions        ┃  │
│  ┃                                                            ┃  │
│  ┃ Permissions:                                               ┃  │
│  ┃ • Allowed Actions: swap, approve                          ┃  │
│  ┃ • Spending Limit: $500 USD                                ┃  │
│  ┃ • Valid For: 1 hour                                       ┃  │
│  ┃ • Chain: Ethereum Mainnet                                 ┃  │
│  ┃                                                            ┃  │
│  ┃ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ┃  │
│  ┃                                                            ┃  │
│  ┃ ⚠️ AI will be able to execute transactions within these   ┃  │
│  ┃    limits without asking for approval each time.          ┃  │
│  ┃                                                            ┃  │
│  ┃                                                            ┃  │
│  ┃  [  Reject  ]                      [  Authorize  ]        ┃  │
│  ┃                                                            ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ User Action: Clicks "Authorize"                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ OneKey App                                                       │
│                                                                  │
│ 4. Register session key on AA wallet:                           │
│    tx = await aaWallet.registerSessionKey({                     │
│      sessionPublicKey,                                          │
│      permissions                                                │
│    });                                                           │
│    await tx.wait();                                             │
│                                                                  │
│ 5. Create authorization record:                                 │
│    authorization = {                                             │
│      id: 'auth-abc123',                                         │
│      mode: 'SessionKey',                                        │
│      status: 'Active',                                          │
│      chainId: 'eip155:1',                                       │
│      agentId: 'claude-agent-123',                               │
│      sessionKeyPublicKey: '0x...',                              │
│      allocatedAmount: '0.1',                                    │
│      spentAmount: '0',                                          │
│      remainingAmount: '0.1',                                    │
│      createdAt: 1234567890,                                     │
│      expiresAt: 1234571490 // +1 hour                           │
│    };                                                            │
│                                                                  │
│ 6. Store authorization in state:                                │
│    await saveAuthorization(authorization);                      │
│                                                                  │
│ 7. Return result                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Skill Function: Receives result                                 │
│                                                                  │
│ result = {                                                       │
│   success: true,                                                │
│   authorizationId: 'auth-abc123',                               │
│   mode: 'SessionKey',                                           │
│   sessionKeyPublicKey: '0x...',                                 │
│   expiresAt: 1234571490                                         │
│ }                                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ AI Agent: Receives result                                        │
│                                                                  │
│ - Stores authorization ID                                       │
│ - Confirms to user: "✅ Authorized! Session key valid for 1hr"  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ User: "Ok, now execute the swap"                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ AI Agent                                                         │
│ - Calls: executeWithSessionKey(authId, swapParams)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Skill Function: executeWithSessionKey()                         │
│                                                                  │
│ 1. Load authorization by ID                                     │
│ 2. Validate: Not expired, has remaining balance                 │
│ 3. Build swap transaction                                       │
│ 4. Sign with session key                                        │
│ 5. Submit to bundler                                            │
│ 6. Update spent amount                                          │
│ 7. Return transaction hash                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ AI Agent                                                         │
│ - Confirms to user: "✅ Swap executed! Tx: 0x..."               │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Step-by-Step

### Step 1: User Intent → AI

**User says**: "Swap 0.1 ETH to USDC on Ethereum"

**AI processes**:
- Extracts: action=swap, chain=Ethereum, amount=0.1, from=ETH, to=USDC
- Recognizes: Needs crypto wallet operation → Call OneKey Skill

### Step 2: AI → Skill

**AI calls**:
```javascript
const result = await demoAuthorizationScenario('ethereum-swap');
```

**Skill receives**:
- scenarioId: `'ethereum-swap'`

### Step 3: Skill Logic

**Skill executes**:

```typescript
async function demoAuthorizationScenario(scenarioId: string) {
  // 1. Load scenario
  const scenario = DEMO_SCENARIOS.find(s => s.id === scenarioId);
  
  // 2. Choose mode
  const modeResult = chooseMode(scenario.chainId, scenario.action);
  // Returns: { mode: 'SessionKey', reason: '...', isSupported: true }
  
  // 3. Build request
  const request: IAgentAuthorizationRequest = {
    agentId: getCurrentAgentId(),
    agentName: 'Claude Assistant',
    chainId: scenario.chainId,
    networkName: scenario.networkName,
    requestedMode: modeResult.mode,
    requestedAmount: scenario.amount,
    tokenSymbol: scenario.tokenSymbol,
    rules: {
      methodWhitelist: ['swap', 'approve'],
      spendingLimitUsd: 500,
      ttlSeconds: 3600
    },
    purpose: scenario.description,
    scenarioId: scenario.id
  };
  
  // 4. Execute mode
  if (modeResult.mode === 'SessionKey') {
    return await runModeC(request);
  }
  // ... other modes
}
```

### Step 4: Skill → OneKey App

**Skill calls OneKey App API**:

```typescript
async function runModeC(request: IAgentAuthorizationRequest) {
  // This calls into OneKey App backend
  const appApi = getOneKeyAppApi();
  
  return await appApi.createAgentAuthorization(request);
}
```

### Step 5: OneKey App Shows Modal

**App logic**:

```typescript
async function createAgentAuthorization(request: IAgentAuthorizationRequest) {
  // 1. Validate request
  validateAuthorizationRequest(request);
  
  // 2. Generate session key
  const sessionKey = await generateSessionKeyPair();
  
  // 3. Show modal and wait for user confirmation
  const confirmed = await showAuthorizationModal({
    agentName: request.agentName,
    mode: request.requestedMode,
    chainId: request.chainId,
    amount: request.requestedAmount,
    rules: request.rules
  });
  
  if (!confirmed) {
    throw new Error('User rejected authorization');
  }
  
  // 4. Register session key on AA wallet
  await registerSessionKeyOnChain(sessionKey.publicKey, request.rules);
  
  // 5. Save authorization
  const authorization = await saveAuthorization({
    mode: 'SessionKey',
    sessionKeyPublicKey: sessionKey.publicKey,
    ...request
  });
  
  // 6. Return result
  return {
    success: true,
    authorizationId: authorization.id,
    mode: authorization.mode,
    sessionKeyPublicKey: sessionKey.publicKey,
    expiresAt: authorization.expiresAt
  };
}
```

### Step 6: App → Skill → AI

**Result flows back**:

```
OneKey App
  ↓ returns IAuthorizationResult
Skill Function
  ↓ returns IAuthorizationResult
AI Agent
  ↓ parses result
User (sees confirmation)
```

### Step 7: Subsequent Executions

**User**: "Execute the swap now"

**Flow**:
1. AI calls: `executeWithSessionKey(authId, { from: 'ETH', to: 'USDC', amount: '0.1' })`
2. Skill validates authorization is still active
3. Skill builds transaction
4. Skill signs with session key (no user interaction!)
5. Skill submits to bundler
6. Returns tx hash to AI
7. AI confirms to user

## Error Handling

### Authorization Rejected
```typescript
try {
  const result = await demoAuthorizationScenario('ethereum-swap');
} catch (error) {
  if (error.code === 'USER_REJECTED') {
    return "User declined the authorization. No permissions were granted.";
  }
}
```

### Chain Not Supported
```typescript
const modeResult = chooseMode('eip155:999', 'swap');
if (!modeResult.isSupported) {
  // Fallback to Mode A
  return await runModeA(request);
}
```

### Insufficient Balance
```typescript
if (userBalance < request.requestedAmount) {
  throw new InsufficientBalanceError(
    `Need ${request.requestedAmount} but have ${userBalance}`
  );
}
```

### Session Expired
```typescript
if (Date.now() > authorization.expiresAt) {
  throw new SessionExpiredError(
    'Session key has expired. Please re-authorize.'
  );
}
```

## State Management

### Authorization State

```typescript
// Jotai atom
export const agentAuthorizationsAtom = atom<IAgentAuthorization[]>([]);

// Add authorization
const addAuthorization = (auth: IAgentAuthorization) => {
  set(agentAuthorizationsAtom, (prev) => [...prev, auth]);
};

// Get active authorizations
const getActiveAuthorizations = () => {
  const all = get(agentAuthorizationsAtom);
  return all.filter(a => 
    a.status === 'Active' && 
    Date.now() < (a.expiresAt || Infinity)
  );
};

// Update spent amount
const updateSpentAmount = (authId: string, spentAmount: string) => {
  set(agentAuthorizationsAtom, (prev) => 
    prev.map(a => a.id === authId 
      ? { ...a, spentAmount, remainingAmount: subtract(a.allocatedAmount, spentAmount) }
      : a
    )
  );
};
```

## UI Components

### Authorization List Page

```
┌─────────────────────────────────────────┐
│ AI Agent Authorizations                 │
├─────────────────────────────────────────┤
│                                          │
│ 🤖 Claude Assistant                     │
│ • Ethereum - Session Key                │
│ • $250 / $500 remaining                 │
│ • Expires in 45 min                     │
│   [ Revoke ]                            │
│                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│ 🤖 GPT-4 Agent                          │
│ • Polygon - Vault Contract              │
│ • 8.5 / 10 MATIC remaining              │
│ • No expiration                         │
│   [ Revoke ]                            │
│                                          │
└─────────────────────────────────────────┘
```

## Security Considerations

1. **Session key storage**: Never expose private keys to AI
2. **Permission validation**: Always validate before execution
3. **Spending limits**: Track and enforce limits
4. **User confirmation**: Always show modal before authorizing
5. **Revocation**: User can revoke anytime
6. **Audit log**: Track all AI transactions

## Testing Flow

```bash
# 1. Mock AI call
curl -X POST http://localhost:3000/skill/demo-authorization \
  -d '{"scenarioId": "ethereum-swap"}'

# 2. Check modal appears in app

# 3. Confirm authorization

# 4. Verify authorization stored
curl http://localhost:3000/authorizations

# 5. Execute transaction
curl -X POST http://localhost:3000/skill/execute \
  -d '{"authId": "auth-abc123", "params": {...}}'

# 6. Verify tx hash returned
```
