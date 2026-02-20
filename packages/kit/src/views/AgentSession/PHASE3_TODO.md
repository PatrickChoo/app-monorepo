# Phase 3: Production Preparation - TODO

**Status**: In Progress  
**Priority**: Medium  
**Est. Time**: 2-3 hours

---

## 1. Error Handling Enhancements ⚠️

### 1.1 Balance Checks (Before Transfer)
**Priority**: High  
**File**: `services/wallet.ts::transferBetweenAccounts`

```typescript
// TODO: Check source account balance before transfer
// - Query account balance
// - Verify balance >= amount + gas
// - Return user-friendly error if insufficient
```

### 1.2 Gas Estimation
**Priority**: High  
**File**: `services/wallet.ts::transferBetweenAccounts`

```typescript
// TODO: Estimate gas before transaction
// - Call serviceGas.estimateGas()
// - Warn user if gas > 10% of transfer amount
// - Allow user to adjust amount
```

### 1.3 Network Error Retry
**Priority**: Medium  
**File**: `services/wallet.ts`, `services/authorization.ts`

```typescript
// TODO: Implement retry logic for network errors
// - Exponential backoff (1s, 2s, 4s)
// - Max 3 retries
// - Only retry on network errors, not validation errors
```

**Example**:
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1 || !isNetworkError(error)) {
        throw error;
      }
      await sleep(1000 * Math.pow(2, i));
    }
  }
  throw new Error('Unreachable');
}
```

---

## 2. Audit Logging Improvements 📝

### 2.1 Fix "pending" Authorization ID
**Priority**: Medium  
**File**: `services/authorization.ts::createAgentAuthorization`

**Issue**: Audit logs before authorization creation use "pending" as ID, making them hard to correlate if creation fails.

**Solution**: Generate authId earlier:
```typescript
const authId = `auth-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
// Use authId in all audit logs from the start
```

### 2.2 Log Viewer UI
**Priority**: Low  
**File**: `components/AuditLogViewer.tsx` (new)

**Features**:
- Filter by action type
- Search by agent/authorization
- Export to CSV
- Timeline view

---

## 3. Testing ✅

### 3.1 Unit Tests
**Priority**: High  
**File**: `__tests__/authorization.test.ts`

**Coverage**:
- [x] Test framework created
- [ ] Mock implementations
- [ ] Authorization creation (ask-every-time)
- [ ] Authorization creation (always-allow)
- [ ] Private key export
- [ ] Balance errors
- [ ] Password cancellation
- [ ] Revocation flow
- [ ] Account derivation (index >= 10000)
- [ ] Account name formatting

**Run**: `yarn test:unit packages/kit/src/views/AgentSession`

### 3.2 Integration Tests
**Priority**: Medium  
**File**: `__tests__/integration.test.ts` (new)

**Scenarios**:
- [ ] End-to-end authorization flow (mocked RPC)
- [ ] Authorization + transaction + balance check
- [ ] Revocation + balance transfer back
- [ ] Multiple agent accounts for same wallet

### 3.3 E2E Tests
**Priority**: Low (manual testing for now)  
**Network**: Sepolia Testnet

**Checklist**:
- [ ] Create authorization (ask-every-time mode)
- [ ] Create authorization (always-allow mode)
- [ ] Verify agent account balance
- [ ] Execute transaction via agent account
- [ ] Revoke authorization
- [ ] Verify account name updates
- [ ] Check audit logs in SimpleDb

**Script**: Use `scripts/testModeA.ts`

---

## 4. Performance Optimizations ⚡

### 4.1 Parallel Balance Queries
**Status**: ✅ Already implemented  
**File**: `hooks/useAgentSession.ts`

Uses `Promise.all()` to query all balances in parallel.

### 4.2 Caching Strategy
**Priority**: Low  
**File**: `services/ServiceAgentSession.ts`

```typescript
// TODO: Cache balance queries for 10 seconds
// - Use in-memory cache (Map)
// - TTL: 10 seconds
// - Invalidate on refresh
```

### 4.3 Loading Skeleton Improvements
**Priority**: Low  
**File**: `components/AgentAccountCard.tsx`

Currently uses simple Skeleton. Could improve:
- [ ] Shimmer animation
- [ ] More realistic placeholder layout

---

## 5. Security Checklist 🔒

### 5.1 Private Key Handling
**Status**: ✅ Implemented

- [x] Only exported in always-allow mode
- [x] Never logged (audit log only shows metadata)
- [x] Returned once, not stored
- [x] User confirmation required

### 5.2 Authorization Validation
**Status**: ⚠️ Needs review

- [ ] Verify agent signature on requests (future)
- [x] User must confirm every authorization
- [x] Password required for key export
- [ ] Rate limiting on authorization creation (future)

### 5.3 Audit Trail
**Status**: ✅ Implemented

- [x] All actions logged
- [x] Immutable log (append-only)
- [ ] Log export for user (UI needed)

---

## 6. Documentation 📚

### 6.1 User Guide
**Priority**: Medium  
**File**: `docs/USER_GUIDE.md` (new)

**Contents**:
- What is Agent Session Mode A?
- How to create an authorization
- Permission modes explained
- How to revoke an authorization
- Security best practices
- FAQ

### 6.2 Developer Guide
**Status**: ✅ Already exists  
**File**: `MODE_A_IMPLEMENTATION.md`

Up-to-date with Phase 1 & 2.

### 6.3 API Documentation
**Priority**: Low  
**File**: `docs/API.md` (new)

**Contents**:
- Service APIs
- Hook APIs
- Type definitions
- Examples

---

## 7. Known Limitations & Future Work 🚧

### 7.1 Fund Recovery
**Priority**: Medium

**Issue**: When revoking authorization, remaining funds are not automatically transferred back.

**Solution**: Add option to "Revoke & Withdraw" in UI.

**File**: `services/authorization.ts::revokeAgentAuthorization`

```typescript
// TODO: Transfer remaining funds back to user (if password provided)
if (password) {
  const balance = await getAccountBalance(...);
  if (parseFloat(balance) > 0) {
    await transferBetweenAccounts({
      fromAccountId: authorization.agentAccountId,
      toAddress: authorization.fundingAccountAddress,
      amount: balance,
      ...
    });
  }
}
```

### 7.2 Multi-Chain Support
**Priority**: Low (future)

Currently one authorization per chain. Could support:
- [ ] Single authorization for multiple chains
- [ ] Cross-chain fund transfers
- [ ] Unified balance view

### 7.3 Spending Limits
**Priority**: Medium (future)

**Features**:
- [ ] Daily/weekly spending caps
- [ ] Transaction amount limits
- [ ] Gas limits
- [ ] Auto-pause when limit reached

---

## Next Steps

**Immediate** (this session):
1. ✅ Create test framework
2. ✅ Document Phase 3 tasks
3. [ ] Implement basic unit tests (high priority items)
4. [ ] Test compilation

**Short-term** (next session):
5. [ ] Balance check before transfer
6. [ ] Gas estimation
7. [ ] Fix "pending" audit ID issue
8. [ ] Complete unit test coverage

**Medium-term** (before production):
9. [ ] Integration tests
10. [ ] Manual E2E testing on Sepolia
11. [ ] User guide documentation
12. [ ] Code review

---

**Last Updated**: 2026-02-21 05:30  
**Phase**: 3 (Production Preparation)  
**Completion**: 10% (test framework + documentation)
