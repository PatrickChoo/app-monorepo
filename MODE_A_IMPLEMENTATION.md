# Mode A Implementation Guide

**Strategy**: Focus ONLY on Mode A (Isolated Agent Account). Mode B/C are paused.

## Current Status (2026-02-21 03:45)

### ✅ Phase 1: Core Functionality - COMPLETED

#### 1.1 Password Integration ✅
- **Commit**: `21a3d8343`
- **Changes**:
  - Enhanced `promptPassword()` with `EReasonForNeedPassword` parameter
  - Added `exportPrivateKey()` function for always-allow mode
  - Better security context in password prompts

**Files Modified**:
- `packages/kit/src/views/AgentSession/services/wallet.ts`

**API**:
```typescript
// Enhanced password prompt with reason
export async function promptPassword(
  reason?: EReasonForNeedPassword,
): Promise<string>

// Export private key (always-allow mode)
export async function exportPrivateKey(params: {
  accountId: string;
  password: string;
}): Promise<string>
```

#### 1.2 Test Script Created ✅
- **Commit**: `ef87fc4eb`
- **File**: `packages/kit/src/views/AgentSession/scripts/testModeA.ts`

**Test Flow**:
1. Check main account balance
2. Create agent authorization
3. Verify agent account balance
4. Test agent account transaction
5. Final balance verification

**Usage**:
```bash
cd /Users/patrick/onekey-app
npx ts-node packages/kit/src/views/AgentSession/scripts/testModeA.ts
```

**Configuration** (update before running):
```typescript
const TEST_CONFIG = {
  network: {
    id: 'evm--11155111', // Sepolia testnet
  },
  wallet: {
    walletId: 'hd-1',           // Your wallet ID
    mainAccountId: '...',        // Your account ID
    mainAccountAddress: '0x...', // Your address
  },
  agent: {
    id: 'test-agent-001',
    name: 'Test Agent',
  },
  amounts: {
    initialFunding: '0.01',  // 0.01 ETH
    testTransfer: '0.005',   // 0.005 ETH
  },
};
```

---

## 📋 Phase 2: UI Integration - IN PROGRESS

### ✅ Existing UI Components (from db847a361)

**Created Components**:
- `AgentTab.tsx` - Main tab interface
- `AgentOverview.tsx` - Statistics summary
- `AgentAccountCard.tsx` - Account card with balance
- `EmptyAgentState.tsx` - Empty state guidance
- `useAgentSession.ts` - Data query hook

**Location**: `packages/kit/src/views/Home/pages/AgentSession/`

### 🚧 UI Tasks Remaining

#### 2.1 AuthorizationModal Integration
**File**: `packages/kit/src/views/AgentSession/components/AuthorizationModal.tsx`

**Requirements**:
- Show agent info (name, description, purpose)
- Display funding amount and token
- Show derivation path preview
- Permission mode selector (ask-every-time / always-allow)
- Risk warnings for always-allow mode
- Approve/Reject buttons

**Data Flow**:
```typescript
// AI requests authorization
const request: IAgentAuthorizationRequest = {
  agentId: 'ai-001',
  agentName: 'Trading Assistant',
  suggestedAmount: '1000000000000000000', // 1 ETH
  chainId: 'evm--1',
  purpose: 'Execute token swaps',
};

// Show modal to user
const userApproved = await showAuthorizationModal(request);

// If approved, create authorization
if (userApproved) {
  const result = await createAgentAuthorization(request, userConfig);
}
```

#### 2.2 AgentTab Data Integration
**File**: `packages/kit/src/views/Home/pages/AgentSession/AgentTab.tsx`

**Requirements**:
- Connect to real authorization data (not mock)
- Display active authorizations
- Show agent account balances
- Link to authorization details
- Revoke authorization action

**Data Source**:
```typescript
import { getAllAuthorizations } from '@onekeyhq/kit/src/views/AgentSession/services/storage';
import { getAccountBalance } from '@onekeyhq/kit/src/views/AgentSession/services/wallet';

// In component
const authorizations = await getAllAuthorizations();
const balance = await getAccountBalance({
  accountId: auth.agentAccountId,
  networkId: auth.chainId,
});
```

#### 2.3 Authorization Details Page
**File**: `packages/kit/src/views/AgentSession/pages/AuthorizationDetailPage.tsx`

**Requirements**:
- Show complete authorization info
- Display agent account details
- Show funding transaction
- Display current balance
- Transaction history
- Revoke button

**Layout**:
```
┌─────────────────────────────────┐
│ Authorization Details           │
├─────────────────────────────────┤
│ Agent: Trading Assistant        │
│ Status: Active                  │
│ Created: 2026-02-21 03:00       │
├─────────────────────────────────┤
│ Agent Account                   │
│ Address: 0x1234...5678          │
│ Path: m/44'/60'/0'/0/10000      │
│ Balance: 0.95 ETH               │
├─────────────────────────────────┤
│ Funding                         │
│ Initial: 1.00 ETH               │
│ TX: 0xabcd...ef12               │
├─────────────────────────────────┤
│ Permission                      │
│ Mode: Ask Every Time            │
│ Private Key: Not Exported       │
├─────────────────────────────────┤
│ [Revoke Authorization]          │
└─────────────────────────────────┘
```

#### 2.4 Empty State Guidance
**Status**: ✅ Component exists
**Improvements Needed**:
- Add "Get Started" tutorial link
- Link to documentation
- Example use cases

---

## 🛡️ Phase 3: Production Readiness - TODO

### 3.1 Audit Logging
**Status**: ✅ Service implemented
**Location**: `packages/kit/src/views/AgentSession/services/storage.ts`

**Logged Events**:
- `derive-account` - Account derivation
- `fund-account` - Funding transaction
- `export-private-key` - Private key export (sensitive!)
- `create-authorization` - Authorization created
- `authorization-failed` - Creation failed
- `revoke-authorization` - Authorization revoked

**Viewer**:
- File: `packages/kit/src/views/AgentSession/pages/AuditLogViewer.tsx`
- Style: 1Password-inspired audit log
- Features: Filter by agent, action, date
- Export: CSV export capability

**Tasks**:
- [ ] Add transaction-level logging
- [ ] Add performance metrics
- [ ] Add security alerts (unusual activity)

### 3.2 Error Handling
**Current State**: Basic try-catch blocks

**Improvements Needed**:
- [ ] Network error retry logic
- [ ] Gas estimation with buffer
- [ ] Balance check before transfer
- [ ] Transaction timeout handling
- [ ] User-friendly error messages

**Example**:
```typescript
// Before transfer, check balance
const balance = await getAccountBalance({
  accountId: fromAccountId,
  networkId,
});

if (BigInt(balance.balance) < BigInt(amount)) {
  throw new Error('Insufficient balance for transfer');
}

// Estimate gas and add 20% buffer
const gasEstimate = await estimateGas(tx);
const gasWithBuffer = gasEstimate * 120n / 100n;

// Retry on network errors
let retries = 3;
while (retries > 0) {
  try {
    const result = await broadcastTransaction(signedTx);
    break;
  } catch (error) {
    if (isNetworkError(error) && retries > 1) {
      retries--;
      await delay(2000);
      continue;
    }
    throw error;
  }
}
```

### 3.3 Testing
**Unit Tests**:
- [ ] WalletService tests
- [ ] Authorization service tests
- [ ] Storage service tests
- [ ] Utility function tests

**Integration Tests**:
- [ ] Full authorization flow
- [ ] Revocation flow
- [ ] Balance queries
- [ ] Transaction creation

**E2E Tests**:
- [x] Manual testnet script (`testModeA.ts`) ✅
- [ ] Automated UI test
- [ ] Multi-chain test (Ethereum, Polygon, etc.)

**Test Coverage Goal**: 80%+

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All Phase 1 tasks complete
- [ ] All Phase 2 tasks complete
- [ ] All Phase 3 tasks complete
- [ ] Manual testnet testing passed
- [ ] Code review completed
- [ ] Documentation updated

### Testnet Deployment
- [ ] Deploy to Sepolia testnet
- [ ] Deploy to Mumbai testnet (Polygon)
- [ ] Test with multiple agents
- [ ] Test edge cases
- [ ] Performance testing
- [ ] Security audit

### Mainnet Preparation
- [ ] Final code review
- [ ] Security audit completed
- [ ] User documentation
- [ ] Support team training
- [ ] Monitoring dashboards ready
- [ ] Rollback plan prepared

### Mainnet Launch
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Monitor error rates
- [ ] Monitor gas costs
- [ ] User feedback collection
- [ ] Bug fix pipeline ready

---

## 📖 Architecture Summary

### Service Layer
```
createAgentAuthorization()
  ↓
  ├── deriveAccountForAgent()     (wallet.ts)
  ├── transferBetweenAccounts()   (wallet.ts)
  ├── exportPrivateKey()          (wallet.ts - optional)
  ├── registerAgentAccount()      (agentAccountRegistry.ts)
  ├── addAuthorization()          (storage.ts)
  └── addAuditLog()               (storage.ts)
```

### Data Flow
```
AI Agent
  ↓ IAgentAuthorizationRequest
User Approval (AuthorizationModal)
  ↓ IUserAuthorizationConfig
createAgentAuthorization()
  ↓ Derive + Fund + Register
IAuthorizationResult
  ↓ (includes privateKey if always-allow)
AI Agent
```

### Storage
```
SimpleDb
  ├── agentAccountRegistry      (Account → Agent mapping)
  ├── authorizations            (Authorization records)
  └── auditLogs                 (Security audit trail)
```

---

## 🔑 Key Design Decisions

### 1. Derivation Index Range
**Decision**: Start from index 10,000  
**Reason**: Avoids collision with user's normal accounts (typically 0-99)

### 2. Account Naming
**Format**: `🤖 {AgentName} #{Index} [{Markers}]`  
**Example**: `🤖 Trading Bot #10000 [🔑🟢]`  
**Markers**:
- 🔑 = Private key exported
- 🟢 = Active
- 🔴 = Revoked
- 🟠 = One-time used

**Benefits**:
- Clear visual indicator in account list
- Shows security status at a glance
- Easy to identify agent accounts

### 3. Permission Modes
**Ask Every Time**:
- User approves each transaction via password
- More secure
- Better for high-value operations

**Always Allow**:
- Private key exported to AI
- AI can sign transactions independently
- Higher risk, higher convenience
- Suitable for low-value automated tasks

**Default**: Ask Every Time

### 4. No Automatic Cleanup
**Decision**: Keep revoked accounts and authorizations  
**Reason**:
- Audit trail preservation
- Forensics if something goes wrong
- User can manually archive/delete

---

## 🐛 Known Limitations

### 1. Password Prompt Context
**Issue**: `promptPasswordVerify()` may not show custom reason text  
**Impact**: User doesn't see detailed context  
**Workaround**: Add explanation in authorization modal  
**Future**: Investigate OneKey password UI customization

### 2. Transaction Status
**Issue**: No built-in transaction confirmation waiting  
**Impact**: Balance checks may be stale  
**Current**: Manual delay (15 seconds) in test script  
**Future**: Implement proper transaction receipt polling

### 3. Gas Estimation
**Issue**: No gas estimation before transfer  
**Impact**: Transactions may fail due to insufficient gas  
**Current**: Relies on OneKey's default gas estimation  
**Future**: Add explicit gas checks and user warnings

### 4. Multi-Chain Support
**Status**: Theoretically supports all OneKey chains  
**Tested**: Only Sepolia (EVM)  
**TODO**: Test on Polygon, BSC, Bitcoin, Solana

---

## 📚 Additional Documentation

**Related Files**:
- `AGENT_SESSION_COMPLETION_REPORT.md` - Original completion report
- `AGENT_SESSION_IMPLEMENTATION.md` - Original implementation guide
- `CLAUDE.md` - Claude coding session notes

**Code Locations**:
- Services: `packages/kit/src/views/AgentSession/services/`
- Components: `packages/kit/src/views/AgentSession/components/`
- Pages: `packages/kit/src/views/AgentSession/pages/`
- Database: `packages/kit-bg/src/dbs/simple/entity/SimpleDbEntityAgentAccountRegistry.ts`

**Testing**:
- Test Script: `packages/kit/src/views/AgentSession/scripts/testModeA.ts`
- Unit Tests: `packages/kit/src/views/AgentSession/__tests__/`

---

## 🎯 Next Steps

**Immediate** (Today):
1. ~~Complete Phase 1.1 (Password Integration)~~ ✅
2. ~~Complete Phase 1.2 (Test Script)~~ ✅
3. Start Phase 2.1 (AuthorizationModal UI)

**Short Term** (This Week):
4. Complete Phase 2 (UI Integration)
5. Manual testnet testing with real OneKey wallet
6. Fix any bugs found during testing

**Medium Term** (Next Week):
7. Complete Phase 3 (Production Readiness)
8. Internal code review
9. Security audit

**Long Term**:
10. Testnet beta testing
11. Documentation finalization
12. Mainnet launch planning

---

**Last Updated**: 2026-02-21 03:45  
**Status**: Phase 1 Complete ✅ | Phase 2 In Progress 🚧 | Phase 3 TODO 📝
