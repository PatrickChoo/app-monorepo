# AI Agent Session - Architecture Design

## Overview

This document describes the architectural design of the AI Agent Session feature in OneKey. It covers system components, data flows, security models, and implementation details.

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         OneKey App                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │   UI Layer   │◄────────┤ Agent Skills │                │
│  │              │         │  (AI Logic)  │                │
│  └──────┬───────┘         └──────┬───────┘                │
│         │                        │                         │
│         │  ┌─────────────────────▼────────────┐           │
│         │  │  Authorization Bridge            │           │
│         │  │  (requestAuthorizationFromUI)    │           │
│         │  └─────────────────┬────────────────┘           │
│         │                    │                             │
│         ▼                    ▼                             │
│  ┌─────────────────────────────────────┐                  │
│  │   Agent Session Provider            │                  │
│  │   - State Management (Jotai)        │                  │
│  │   - Authorization Modal             │                  │
│  │   - Wallet Service Integration      │                  │
│  └─────────────┬───────────────────────┘                  │
│                │                                            │
│                ▼                                            │
│  ┌─────────────────────────────────────┐                  │
│  │   Mode Implementations              │                  │
│  ├─────────────────────────────────────┤                  │
│  │  Mode A │  Mode B  │  Mode C        │                  │
│  │ SubWallet│ Contract │ SessionKey    │                  │
│  └─────────────┬───────────────────────┘                  │
│                │                                            │
│                ▼                                            │
│  ┌─────────────────────────────────────┐                  │
│  │   Background API Proxy              │                  │
│  │   - serviceWallet                   │                  │
│  │   - serviceSend                     │                  │
│  │   - serviceAccount                  │                  │
│  └─────────────┬───────────────────────┘                  │
│                │                                            │
└────────────────┼────────────────────────────────────────────┘
                 │
                 ▼
         ┌──────────────┐
         │  Blockchain  │
         │   Networks   │
         └──────────────┘
```

---

## 📦 Component Breakdown

### 1. UI Layer

**Location**: `packages/kit/src/views/AgentSession/components/`

**Components**:
- `AuthorizationModal.tsx` - Main authorization confirmation dialog
- `AuthorizationDetails.tsx` - Displays request details
- `ModeExplanation.tsx` - Explains each authorization mode
- `AuthorizationListItem.tsx` - List item for active authorizations
- `AuthorizationStatusBadge.tsx` - Status indicator

**Responsibilities**:
- Render authorization UI
- Collect user input (mode selection, biometric preference)
- Display transaction history
- Show spending analytics

**State Management**:
- Uses Jotai atoms for local state
- Integrates with `AgentSessionProvider` for global state

---

### 2. Authorization Bridge

**Location**: `packages/kit/src/views/AgentSession/skills/authorizationBridge.ts`

**Purpose**: Connects AI agent logic (non-React) with UI (React components)

**Key Functions**:

```typescript
// Request authorization from UI (called by agent)
async function requestAuthorizationFromUI(
  request: IAgentAuthorizationRequest
): Promise<AuthorizationResolver>

// Confirm authorization (called by modal)
function confirmAuthorizationFromUI(params: {
  useBiometric: boolean;
  selectedMode: EAgentAuthorizationMode;
}): void

// Reject authorization (called by modal)
function rejectAuthorizationFromUI(): void
```

**Design Pattern**: Promise-based bridge with resolver callbacks

**Why This Pattern?**:
- AI agent code runs outside React component lifecycle
- Needs to wait for user interaction
- Promise provides clean async/await interface
- Resolver callbacks avoid circular dependencies

---

### 3. State Management

**Location**: `packages/kit/src/views/AgentSession/states/`

**Files**:
- `atoms.ts` - Jotai atom definitions
- `atomSetters.ts` - External setters for non-React code

**Key Atoms**:

```typescript
// Pending authorization request (triggers modal)
const pendingAuthorizationRequestAtom = 
  atom<IAgentAuthorizationRequest | null>(null)

// List of all authorizations
const authorizationsAtom = 
  atom<IAgentAuthorization[]>([])

// Selected authorization for details view
const selectedAuthorizationAtom = 
  atom<string | null>(null) // Authorization ID
```

**Memory Safety**:
- Setters registered on component mount
- **Cleaned up on unmount** to prevent memory leaks
- `registerPendingRequestSetter(null)` in cleanup function

---

### 4. Mode Implementations

#### Mode A: Isolated Sub-Wallet

**Location**: `packages/kit/src/views/AgentSession/services/wallet.ts`

**Implementation**:

```typescript
async function createIsolatedSubWallet(params: {
  mainAccountId: string;
  networkId: string;
  allocatedAmount: string;
  password: string;
}): Promise<{
  subWalletAddress: string;
  subWalletAccountId: string;
  subWalletPath: string;
  fundingTxHash: string;
}>
```

**Steps**:
1. Derive new sub-wallet using BIP44 path
2. Create account in vault
3. Transfer allocated amount from main wallet
4. Return sub-wallet details + funding tx hash

**BIP44 Path Strategy**:
```
m/44'/[coin_type]'/0'/0/[index]
                         ^^^^^^
                         Sub-wallet index
```

**Security**:
- Sub-wallet has independent private key
- AI agent operates within sub-wallet scope only
- Main wallet never exposed

---

#### Mode B: Vault Contract

**Location**: 
- Contract: `packages/kit/src/views/AgentSession/contracts/VaultContract.sol`
- ABI: `packages/kit/src/views/AgentSession/contracts/vaultABI.ts`
- Service: `packages/kit/src/views/AgentSession/services/contract.ts`

**Smart Contract Design**:

```solidity
contract AgentVault {
    address public owner;           // User's main wallet
    bool public paused;             // Emergency pause
    
    uint256 public dailyLimit;      // Spending limit (wei)
    uint256 public dailySpent;      // Amount spent today
    uint256 public lastResetDay;    // Last daily reset timestamp
    
    // Execute transaction (only owner can call)
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyOwner whenNotPaused returns (bool)
    
    // Batch execute multiple transactions
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external onlyOwner whenNotPaused returns (bool[])
}
```

**Deployment Process**:
1. Compile contract bytecode (already done: `vaultABI.ts`)
2. Encode constructor parameters (daily limit)
3. Build deployment transaction
4. Sign with user's wallet
5. Broadcast and wait for confirmation
6. Calculate contract address (deterministic)
7. Fund contract with initial allocation

**Execution Process**:
1. Encode target function call
2. Call `vault.execute(target, value, encodedCall)`
3. Vault enforces daily limit
4. Vault forwards call to target contract
5. Return success/failure

**Gas Optimization**:
- Minimal storage variables
- Batch execution support
- No unnecessary checks

**Current Status**: 
- ✅ Contract compiled
- ✅ Bytecode available
- ⚠️ Deployment integration in progress
- ⚠️ Execution flow partially implemented

---

#### Mode C: Session Key (Future)

**Status**: Planned, not yet implemented

**Planned Architecture**:
- ERC-4337 Account Abstraction wallet
- Temporary session keys with expiration
- Fine-grained permission policies
- Instant revocation via key invalidation

---

### 5. Wallet Service Integration

**Location**: `packages/kit/src/views/AgentSession/services/wallet.ts`

**Integration Points**:

```typescript
// OneKey Background API
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy'

// Key services used:
- backgroundApiProxy.serviceAccount    // Account management
- backgroundApiProxy.serviceWallet     // Wallet operations
- backgroundApiProxy.serviceSend       // Transaction broadcasting
- backgroundApiProxy.servicePassword   // Password verification
```

**Key Operations**:

1. **Derive Sub-Wallet**:
   ```typescript
   await backgroundApiProxy.serviceAccount.deriveAccount({
     networkId,
     path: "m/44'/60'/0'/0/10" // Example
   })
   ```

2. **Build Transaction**:
   ```typescript
   await backgroundApiProxy.serviceSend.buildUnsignedTx({
     accountId,
     networkId,
     transfersInfo: [...]
   })
   ```

3. **Sign Transaction**:
   ```typescript
   await vault.signTransaction({
     unsignedTx,
     password
   })
   ```

4. **Broadcast**:
   ```typescript
   await backgroundApiProxy.serviceSend.broadcastTransaction({
     accountId,
     networkId,
     signedTx
   })
   ```

---

## 🔄 Data Flow Diagrams

### Authorization Request Flow

```
┌─────────┐                                    ┌──────────────┐
│ AI Agent│                                    │     User     │
└────┬────┘                                    └──────┬───────┘
     │                                                │
     │ 1. requestAuthorizationFromUI()                │
     ├───────────────────────────────────────────────►│
     │                                                │
     │                                     2. Modal appears
     │                                                │
     │                              3. User reviews & selects mode
     │                                                │
     │                                     4. Tap "Authorize"
     │                                                │
     │ 5. confirmAuthorizationFromUI()                │
     │◄───────────────────────────────────────────────┤
     │                                                │
     │ 6. Return { confirmed: true, mode, biometric } │
     ├───────────────────────────────────────────────►│
     │                                                │
     │ 7. Execute wallet setup (Mode A/B)             │
     ├─────────────────────►┌─────────┐              │
     │                      │ Wallet  │              │
     │                      │ Service │              │
     │◄─────────────────────┤         │              │
     │ 8. Return sub-wallet/contract  │              │
     │    details                     │              │
     │                      └─────────┘              │
     │                                                │
     │ 9. Store authorization                         │
     ├───────────────────►┌──────────┐               │
     │                    │ Storage  │               │
     │                    └──────────┘               │
     │                                                │
     │ 10. Success toast                              │
     ├───────────────────────────────────────────────►│
     │                                                │
```

---

### Mode A: Sub-Wallet Creation Flow

```
User Confirms Authorization
         │
         ▼
┌────────────────────────┐
│ createIsolatedSubWallet│
└───────────┬────────────┘
            │
            ▼
┌──────────────────────────────┐
│ 1. Derive new account        │
│    Path: m/44'/60'/0'/0/N    │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ 2. Build funding transaction │
│    From: Main wallet         │
│    To: Sub-wallet            │
│    Amount: Allocated amount  │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ 3. Sign with password        │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ 4. Broadcast to network      │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ 5. Wait for confirmation     │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ 6. Return details:           │
│    - subWalletAddress        │
│    - subWalletAccountId      │
│    - subWalletPath           │
│    - fundingTxHash           │
└──────────────────────────────┘
```

---

### Mode B: Vault Contract Deployment Flow

```
User Confirms Authorization
         │
         ▼
┌────────────────────────┐
│ deployVaultContract    │
└───────────┬────────────┘
            │
            ▼
┌──────────────────────────────┐
│ 1. Encode constructor params │
│    - dailyLimit (uint256)    │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ 2. Prepare deployment tx     │
│    From: Main wallet         │
│    To: 0x (empty)            │
│    Data: bytecode + params   │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ 3. Sign with password        │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ 4. Broadcast to network      │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ 5. Wait for confirmation     │
│    (may take 30-60s)         │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ 6. Calculate contract address│
│    (deterministic)           │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ 7. Fund contract             │
│    Send initial allocation   │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ 8. Return details:           │
│    - contractAddress         │
│    - deploymentTxHash        │
│    - fundingTxHash           │
└──────────────────────────────┘
```

---

## 🗄️ Data Models

### Type Definitions

**Location**: `packages/kit/src/views/AgentSession/types/index.ts`

#### `IAgentAuthorization`

```typescript
interface IAgentAuthorization {
  id: string;                           // Unique authorization ID
  mode: EAgentAuthorizationMode;        // A/B/C
  status: EAgentAuthorizationStatus;    // Pending/Active/Expired/Revoked
  
  // Chain info
  chainId: string;                      // e.g., 'evm-1' (Ethereum)
  networkName: string;                  // e.g., 'Ethereum Mainnet'
  
  // Agent info
  agentId: string;                      // Agent identifier
  agentName: string;                    // Display name
  
  // Authorization rules
  rules: IAgentAuthorizationRule;
  
  // Financial tracking
  allocatedAmount?: string;             // Total allocated (in base unit)
  allocatedAmountUsd?: string;          // USD equivalent
  spentAmount?: string;                 // Total spent
  spentAmountUsd?: string;              // USD equivalent
  remainingAmount?: string;             // Remaining balance
  remainingAmountUsd?: string;          // USD equivalent
  tokenSymbol?: string;                 // e.g., 'ETH'
  
  // Timestamps
  createdAt: number;                    // Unix timestamp (ms)
  updatedAt: number;                    // Unix timestamp (ms)
  
  // Mode-specific fields
  
  // Mode A: Isolated Sub-Wallet
  subWalletAddress?: string;            // Sub-wallet address
  subWalletAccountId?: string;          // OneKey account ID
  subWalletPath?: string;               // BIP44 derivation path
  fundingTxHash?: string;               // Initial funding tx
  
  // Mode B: Vault Contract
  vaultContractAddress?: string;        // Deployed contract address
  
  // Mode C: Session Key
  sessionKeyPublicKey?: string;         // Session key for AA
}
```

#### `IAgentAuthorizationRule`

```typescript
interface IAgentAuthorizationRule {
  // Spending limits
  spendingLimitUsd?: number;            // Max USD to spend
  
  // Whitelists (Mode B/C only)
  contractWhitelist?: string[];         // Allowed contract addresses
  methodWhitelist?: string[];           // Allowed method signatures
  
  // Time constraints
  ttlSeconds?: number;                  // Time-to-live
  expiresAt?: number;                   // Expiration timestamp
}
```

---

### Storage Schema

**Location**: Device local storage (AsyncStorage / MMKV)

**Key**: `AGENT_AUTHORIZATIONS`

**Value**: JSON array of `IAgentAuthorization` objects

**Example**:
```json
{
  "AGENT_AUTHORIZATIONS": [
    {
      "id": "auth-123",
      "mode": "IsolatedSubWallet",
      "status": "Active",
      "chainId": "evm-1",
      "networkName": "Ethereum Mainnet",
      "agentId": "trading-bot-1",
      "agentName": "DeFi Trading Bot",
      "rules": {
        "spendingLimitUsd": 1000
      },
      "allocatedAmount": "500000000000000000",  // 0.5 ETH in wei
      "tokenSymbol": "ETH",
      "subWalletAddress": "0x1234...",
      "subWalletAccountId": "hd-1--m/44'/60'/0'/0/10",
      "subWalletPath": "m/44'/60'/0'/0/10",
      "fundingTxHash": "0xabcd...",
      "createdAt": 1704153600000,
      "updatedAt": 1704153600000
    }
  ]
}
```

**Persistence Strategy**:
- Write on authorization creation
- Update on status changes
- Read on app launch
- Sync across devices via cloud backup (future)

---

## 🔒 Security Architecture

### Threat Model

| Threat                          | Mitigation                                |
|---------------------------------|-------------------------------------------|
| AI agent malicious behavior     | Mode A: Isolated balance; Mode B: Rules  |
| Unlimited spending              | Enforced limits in both modes             |
| Unauthorized contract calls     | Mode B: Contract whitelist                |
| Private key exposure            | Keys never leave secure enclave           |
| Man-in-the-middle attacks       | HTTPS + signed transactions               |
| Replay attacks                  | Nonce management                          |
| Phishing authorization requests | Clear UI with agent verification          |

---

### Security Layers

#### Layer 1: UI Confirmation

**What**: User must explicitly confirm every authorization request

**How**:
- Modal with clear request details
- Mode selection with explanations
- Optional biometric requirement

**Prevents**:
- Silent authorizations
- Unclear agent permissions

---

#### Layer 2: Isolated Execution (Mode A)

**What**: AI operates in dedicated sub-wallet with limited funds

**How**:
- Separate BIP44 derivation path
- Independent balance
- Main wallet never touched

**Prevents**:
- Unlimited spending
- Main wallet compromise

---

#### Layer 3: On-Chain Rules (Mode B)

**What**: Smart contract enforces spending rules

**How**:
- Daily spending limit checked on-chain
- Contract whitelist enforced
- Only owner can execute

**Prevents**:
- Exceeding daily limits
- Interacting with malicious contracts
- Unauthorized transfers

---

#### Layer 4: Revocation

**What**: User can instantly stop AI access

**How**:
- Mode A: Withdraw funds from sub-wallet
- Mode B: Pause contract or withdraw
- Mode C: Invalidate session key

**Prevents**:
- Continued unauthorized access
- Funds stuck with malicious agent

---

### Password & Biometric Flow

```
User Taps "Authorize"
         │
         ▼
    ┌─────────────┐
    │ Biometric   │
    │ Enabled?    │
    └──┬──────────┘
       │
  ┌────┴────┐
  │         │
 Yes       No
  │         │
  ▼         ▼
┌──────────────┐   ┌──────────────┐
│Request Face/ │   │Request       │
│Touch ID      │   │Password      │
└──┬───────────┘   └──┬───────────┘
   │                  │
   ├──────────────────┤
   │
   ▼
┌──────────────┐
│Verify        │
│Credentials   │
└──┬───────────┘
   │
   ▼
┌──────────────┐
│Sign          │
│Transaction   │
└──────────────┘
```

---

## 📊 Performance Considerations

### Optimization Strategies

1. **Lazy Loading**:
   - Authorization list loaded on-demand
   - Transaction history paginated
   - Contract ABIs dynamically imported

2. **Caching**:
   - Authorization data cached in memory
   - Network requests deduplicated
   - Gas price estimates cached (5 min TTL)

3. **Background Processing**:
   - Contract deployment runs async
   - Transaction confirmations polled in background
   - Balance updates batched

4. **Memory Management**:
   - Atom setters cleaned up on unmount
   - Event listeners removed properly
   - Large objects (bytecode) lazy-loaded

---

### Performance Metrics

| Metric                        | Target    | Actual    |
|-------------------------------|-----------|-----------|
| Modal render time             | < 300ms   | ~200ms    |
| Sub-wallet creation           | < 10s     | ~5s       |
| Contract deployment (Mainnet) | < 120s    | ~45-90s   |
| Authorization list load       | < 1s      | ~500ms    |
| Transaction history load      | < 2s      | ~1s       |
| Revocation + withdrawal       | < 30s     | ~15-25s   |

---

## 🧩 Extension Points

### Adding a New Authorization Mode

1. **Define mode enum**:
   ```typescript
   // types/index.ts
   enum EAgentAuthorizationMode {
     // ...
     NewMode = 'NewMode',
   }
   ```

2. **Implement mode logic**:
   ```typescript
   // services/newMode.ts
   export async function createNewModeAuthorization(params) {
     // Your implementation
   }
   ```

3. **Add to mode selector**:
   ```tsx
   // components/AuthorizationModal.tsx
   <Button onPress={() => setSelectedMode(EAgentAuthorizationMode.NewMode)}>
     New Mode
   </Button>
   ```

4. **Add explanation**:
   ```tsx
   // components/ModeExplanation.tsx
   case EAgentAuthorizationMode.NewMode:
     return <Text>Explanation of new mode...</Text>
   ```

5. **Handle in confirmation**:
   ```typescript
   // hooks/useAgentAuthorization.ts
   if (mode === EAgentAuthorizationMode.NewMode) {
     await createNewModeAuthorization({ ... })
   }
   ```

---

### Adding a New Agent Skill

1. **Create skill file**:
   ```typescript
   // skills/myNewSkill.ts
   import { requestAuthorizationFromUI } from './authorizationBridge';
   
   export async function executeMySkill(params) {
     const authRequest = {
       agentId: 'my-new-skill',
       agentName: 'My New Skill',
       // ... other params
     };
     
     const response = await requestAuthorizationFromUI(authRequest);
     
     if (!response.confirmed) {
       throw new Error('User rejected authorization');
     }
     
     // Execute skill logic with authorized wallet
   }
   ```

2. **Register in index**:
   ```typescript
   // skills/index.ts
   export * from './myNewSkill';
   ```

3. **Use in app**:
   ```typescript
   import { executeMySkill } from './skills';
   
   await executeMySkill({ ... });
   ```

---

## 🔧 Developer Tools

### Debug Mode

Enable detailed logging:

```typescript
// Set environment variable
process.env.AGENT_SESSION_DEBUG = 'true'

// Logs will include:
// - Authorization requests
// - Wallet operations
// - Transaction details
// - State changes
```

### Testing Utilities

```typescript
// Test helper for mocking authorizations
import { createMockAuthorization } from './utils/testHelpers';

const mockAuth = createMockAuthorization({
  mode: EAgentAuthorizationMode.IsolatedSubWallet,
  allocatedAmount: '1000000000000000000', // 1 ETH
});
```

---

## 📚 References

### Related OneKey Documentation

- [Wallet Architecture](../../../docs/WALLET_ARCHITECTURE.md)
- [Transaction Flow](../../../docs/TRANSACTION_FLOW.md)
- [Security Model](../../../docs/SECURITY.md)

### External Standards

- [BIP44 - Multi-Account Hierarchy](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
- [ERC-4337 - Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)
- [EIP-1193 - Ethereum Provider API](https://eips.ethereum.org/EIPS/eip-1193)

### Smart Contract Resources

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Ethereum Smart Contract Best Practices](https://consensys.github.io/smart-contract-best-practices/)

---

## 🗺️ Roadmap

### Current Status (v1.0)

- ✅ Mode A: Isolated Sub-Wallet (stable)
- ⚠️ Mode B: Vault Contract (contract compiled, integration in progress)
- 🚧 Mode C: Session Key (planned)

### Upcoming Features (v1.1)

- [ ] Transaction batching for gas optimization
- [ ] Cross-chain authorization coordination
- [ ] Authorization templates (preset configurations)
- [ ] Enhanced spending analytics dashboard

### Future Vision (v2.0)

- [ ] Mode C: Full AA wallet integration
- [ ] Multi-signature authorizations
- [ ] Delegated authorization (share with team)
- [ ] AI agent marketplace integration
- [ ] Privacy-preserving authorizations (zk-proofs)

---

## 🤝 Contributing

### Architecture Decision Records (ADRs)

When making significant architectural changes:

1. Create ADR document: `docs/adr/NNNN-title.md`
2. Follow template:
   ```markdown
   # NNNN. [Title]
   
   ## Status
   [Proposed | Accepted | Deprecated]
   
   ## Context
   [What problem are we solving?]
   
   ## Decision
   [What did we decide?]
   
   ## Consequences
   [What are the trade-offs?]
   ```
3. Submit PR for review

### Code Review Checklist

For Agent Session PRs, ensure:

- [ ] Type safety: All new types properly defined
- [ ] Memory safety: useEffect cleanup functions added
- [ ] Error handling: Toast notifications for user-facing errors
- [ ] Security: No exposure of private keys or sensitive data
- [ ] Testing: Unit tests for critical paths
- [ ] Documentation: Update relevant .md files

---

## 📞 Support

**Questions about architecture?**

- **GitHub Discussions**: [Architecture Q&A](https://github.com/OneKeyHQ/app-monorepo/discussions)
- **Developer Telegram**: @OneKeyDev
- **Email**: dev@onekey.so

---

**Last Updated**: 2024-02-01
**Version**: 1.0.0
**Author**: OneKey Team
