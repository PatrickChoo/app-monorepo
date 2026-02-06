# Code Review Issues: feat/send-recipient-quick-select

**Review Date**: 2026-02-04  
**Reviewer**: Codex (via Clawd)  
**Branch**: `feat/send-recipient-quick-select`  
**Commit**: `a25dd5f9a`

---

## 🔴 Critical Issues

### 1. Address Book Integrity Check Missing

**Severity**: Medium (Security) ~~High~~  
**Status**: 🟡 Open

**Description**:
`getItemsWithoutPassword()` reads raw address book items without `verifyHash()` check. This means tampered/corrupted address book data can be displayed in the send flow without detection.

**Design Context** (updated 2026-02-04):
- ✅ Bypassing password prompt is **intentional** - address book uses app-level unlock only
- ⚠️ Missing hash verification is still a concern - no detection of tampered data

**Location**:
- `packages/kit-bg/src/services/ServiceAddressBook.ts:214` (getItemsWithoutPassword)
- `packages/kit/src/views/Send/pages/SendDataInput/RecipientQuickSelect.tsx:476` (usage)

**Code**:
```typescript
// Current implementation - no hash verification
async getItemsWithoutPassword(params?: {
  networkId?: string;
  exact?: boolean;
}): Promise<{ items: IAddressNetworkItem[] }> {
  const { networkId, exact } = params ?? {};
  let rawItems = await this.getItems(); // ⚠️ No verifyHash call
  // ... filtering logic
}
```

**Recommendation** (updated):
1. Add lightweight `verifyHash()` check (use cached password from app unlock)
2. If hash fails, return empty array and log warning (don't block user)
3. Optional: Add `isSafe` flag to return value for UI feedback
4. ~~No need for "locked" UI state~~ (app unlock is the gate)

**Code suggestion**:
```typescript
async getItemsWithoutPassword(params?: {
  networkId?: string;
  exact?: boolean;
}): Promise<{ items: IAddressNetworkItem[], isSafe?: boolean }> {
  const { networkId, exact } = params ?? {};
  
  // Quick integrity check (non-blocking)
  const password = await this.backgroundApi.servicePassword.getCachedPassword() ?? '';
  const isSafe = await this.verifyHash({ password, returnValue: false });
  
  if (!isSafe) {
    defaultLogger.warn('Address book hash verification failed');
    // Return empty to avoid showing potentially tampered data
    return { items: [], isSafe: false };
  }
  
  let rawItems = await this.getItems();
  // ... existing filtering logic
  
  return { items: processedItems, isSafe: true };
}
```

**Impact**:
- User could send funds to a tampered address
- No detection or warning of data integrity issues
- Lower severity than initially thought (requires both app unlock bypass AND data tampering)

---

## 🟡 Medium Priority Issues

### 2. Performance Bottleneck: Sequential Wallet Loading

**Severity**: Medium (Performance)  
**Status**: 🟡 Open

**Description**:
Account tab loads wallets sequentially with `await` in a loop. With multiple wallets and hidden wallets, this causes noticeable delay.

**Location**:
- `packages/kit/src/views/Send/pages/SendDataInput/RecipientQuickSelect.tsx:224`

**Code**:
```typescript
for (const wallet of wallets) {
  // Sequential await - blocks next iteration
  const mainWalletAccounts = await getWalletNetworkAccounts(wallet, networkId);
  // ... process
  
  for (const hiddenWallet of hiddenWallets) {
    const hiddenAccounts = await getWalletNetworkAccounts(hiddenWallet, networkId);
    // ... process
  }
}
```

**Recommendation**:
```typescript
// Parallelize wallet fetching
const walletGroups = await Promise.all(
  wallets.map(async (wallet) => {
    const mainAccounts = await getWalletNetworkAccounts(wallet, networkId);
    const hiddenGroups = await Promise.all(
      hiddenWallets.map(hw => getWalletNetworkAccounts(hw, networkId))
    );
    return { wallet, mainAccounts, hiddenGroups };
  })
);
```

**Impact**:
- Initial load time increases linearly with wallet count
- Poor UX for users with 5+ wallets

---

### 3. Tab Auto-Switch Jumpy During Loading

**Severity**: Medium (UX)  
**Status**: 🟡 Open

**Description**:
When searching, `tabMatchStatus` updates from child tabs asynchronously. Current tab can switch to "no matches" before other tabs finish loading, causing visible bouncing between tabs.

**Location**:
- `packages/kit/src/views/Send/pages/SendDataInput/RecipientQuickSelect.tsx:607` (tabMatchStatus state)
- `packages/kit/src/views/Send/pages/SendDataInput/RecipientQuickSelect.tsx:670` (auto-switch logic)

**Recommendation**:
1. Add a third state: `loading | hasMatches | noMatches`
2. Only auto-switch after all tabs have reported (use `Promise.allSettled` pattern)
3. Alternative: Debounce the auto-switch by 200ms

**Impact**:
- Jarring UX when typing in search field
- Tab visually jumps back and forth

---

## 🐛 Bugs

### 4. `deleteRecentRecipient` Deletes Entire Network Bucket

**Severity**: High (Bug)  
**Status**: 🔴 Open

**Description**:
`deleteRecentRecipient` deletes the top-level `recentRecipients[recipientId]`, but the actual structure is `{ storageKey: { address: data } }`. If called, it would delete ALL addresses for a network instead of a single address.

**Location**:
- `packages/kit-bg/src/dbs/simple/entity/SimpleDbEntityRecentRecipients.ts:135`

**Code**:
```typescript
async deleteRecentRecipient({ recipientId }: { recipientId: string }) {
  return this.setRawData((rawData) => {
    const data = rawData ?? { recentRecipients: {} };
    // ❌ This deletes the entire storageKey bucket!
    delete data.recentRecipients[recipientId];
    return data;
  });
}
```

**Expected Structure**:
```typescript
{
  recentRecipients: {
    "evm--1": {  // storageKey
      "0x123...": { updatedAt: 1234, networkId: "evm--1" },
      "0x456...": { updatedAt: 5678, networkId: "evm--1" }
    }
  }
}
```

**Recommendation**:
```typescript
async deleteRecentRecipient({ 
  storageKey, 
  address 
}: { 
  storageKey: string;
  address: string;
}) {
  return this.setRawData((rawData) => {
    const data = rawData ?? { recentRecipients: {} };
    if (data.recentRecipients[storageKey]) {
      delete data.recentRecipients[storageKey][address];
      // Clean up empty buckets
      if (Object.keys(data.recentRecipients[storageKey]).length === 0) {
        delete data.recentRecipients[storageKey];
      }
    }
    return data;
  });
}
```

**Impact**:
- If this function is ever called, it will delete ALL recent recipients for a network
- Data loss bug (currently unused, so not triggered yet)

**Action**:
- [ ] Check if this function is used anywhere
- [ ] If unused, remove it or mark as deprecated
- [ ] If needed, fix the signature and implementation

---

### 5. Unstable Keys for Missing Account Data

**Severity**: Low (UX)  
**Status**: 🟢 Open

**Description**:
`keyExtractor` falls back to `Math.random()` for unknown items, causing re-mounting and potential state loss.

**Location**:
- `packages/kit/src/views/Send/pages/SendDataInput/RecipientQuickSelect.tsx:435`

**Code**:
```typescript
keyExtractor={(item) => {
  if ('id' in item) return item.id;
  if ('address' in item) return item.address;
  return `${Math.random()}`; // ⚠️ Non-deterministic
}}
```

**Recommendation**:
```typescript
keyExtractor={(item) => {
  if ('id' in item) return item.id;
  if ('address' in item) return item.address;
  // Deterministic fallback
  return `unknown-${item.name || 'item'}-${Date.now()}`;
}}
```

Or better: filter out malformed items before rendering.

**Impact**:
- Low - only triggers if data structure is corrupted
- Could cause unexpected re-renders

---

## 📋 Missing Features

### 6. No Unit Tests for Quick Select Logic

**Severity**: Medium (Quality)  
**Status**: 🟡 Open

**Description**:
No unit tests found for:
- Quick select filtering/search behavior
- Tab auto-switch logic
- Recent recipients migration
- `deleteRecentRecipient` logic

**Recommendation**:
Add test coverage for:
1. `RecipientQuickSelect` search filtering
2. `SimpleDbEntityRecentRecipients` migration logic
3. Tab auto-switch behavior with mock data
4. Edge cases: empty states, loading states, network filtering

**Files to test**:
- `packages/kit/src/views/Send/pages/SendDataInput/RecipientQuickSelect.tsx`
- `packages/kit/src/views/Send/pages/SendDataInput/RecentRecipients.tsx`
- `packages/kit-bg/src/dbs/simple/entity/SimpleDbEntityRecentRecipients.ts`

---

## ❓ Open Questions

### Q1: Address Book Locked State Bypass ✅ RESOLVED
**Question**: The proposal mentions a "locked" state for address book, but `RecipientQuickSelect` uses `getItemsWithoutPassword()` which bypasses lock checks. Is this intentional?

**Answer** (2026-02-04 11:15): YES - intentional design change.
- Address book will NOT use secondary unlock in the future
- App unlock = address book unlocked
- No password prompt needed for read operations
- `getItemsWithoutPassword()` is the correct approach

**Impact on Issue #1**:
- The "security bypass" concern is partially addressed by this design decision
- However, **hash verification is still needed** to detect tampered data
- Recommendation updated: Add `verifyHash()` check, but no need for "locked" UI state

---

### Q2: `deleteRecentRecipient` Usage
Is this function intended to be unused, or should it be fixed to properly delete a single address?

**Action**: 
- [ ] Search codebase for usage
- [ ] If unused, remove or mark deprecated
- [ ] If needed, fix implementation (see Bug #4)

---

## ✅ Strengths Noted

- Clear send flow gating (amount hidden until address resolves)
- Skeleton loading prevents layout jumps
- Tab visitation caching avoids hook order crashes
- Hash verification is mutex-protected with 30min cache
- Prefetch strategy for common modals

---

## 📊 Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 1 |
| 🟡 Medium | 4 |
| 🟢 Low | 1 |
| **Total** | **6** |

**Changes** (2026-02-04 11:15):
- Issue #1 downgraded from High to Medium (design clarification: app unlock is the gate)
- Q1 resolved: Address book intentionally uses app-level unlock only

---

## Next Steps

1. **Immediate** (before merge):
   - [ ] Fix or remove `deleteRecentRecipient` (Bug #4) - **CRITICAL**
   - [ ] Add hash verification to `getItemsWithoutPassword` (Issue #1) - **RECOMMENDED**

2. **Short-term** (next sprint):
   - [ ] Parallelize wallet loading (Issue #2)
   - [ ] Improve tab auto-switch logic (Issue #3)
   - [ ] Add unit tests (Issue #6)

3. **Long-term**:
   - [ ] Fix unstable keys (Issue #5)
   - [x] ~~Clarify locked state design (Q1)~~ - **RESOLVED**: App unlock is the gate

---

**Review completed**: 2026-02-04 10:25 GMT+8  
**Token usage**: 138K (Codex)
