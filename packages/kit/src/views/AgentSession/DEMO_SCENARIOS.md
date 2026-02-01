# AI Agent Session - Demo Scenarios

This document provides practical demonstration scenarios for the AI Agent Session feature. These scenarios help developers, QA testers, and users understand how the feature works in real-world contexts.

---

## 🎯 Scenario Categories

1. **Basic Scenarios** - Simple, single-operation demos
2. **Advanced Scenarios** - Multi-step, complex workflows
3. **Security Scenarios** - Testing authorization boundaries
4. **Error Scenarios** - Handling failures gracefully

---

## 📋 Basic Scenarios

### Scenario 1: Simple Token Transfer

**Goal**: AI agent sends tokens to a recipient

**Setup**:
- Mode: A (Isolated Sub-Wallet)
- Network: Ethereum Goerli (testnet)
- Token: ETH
- Allocation: 0.1 ETH

**Flow**:
1. User invokes AI skill: "Send 0.05 ETH to alice.eth"
2. AI requests authorization:
   ```json
   {
     "agentId": "simple-transfer-bot",
     "agentName": "Simple Transfer Bot",
     "chainId": "evm-5",
     "networkName": "Ethereum Goerli",
     "requestedMode": "IsolatedSubWallet",
     "requestedAmount": "0.1",
     "tokenSymbol": "ETH",
     "purpose": "Send ETH to recipient"
   }
   ```
3. User reviews and confirms
4. OneKey creates sub-wallet and funds it
5. AI executes transfer: 0.05 ETH → alice.eth
6. User sees success notification

**Expected Results**:
- ✅ Sub-wallet created with derivation path `m/44'/60'/0'/0/10` (example)
- ✅ 0.1 ETH transferred to sub-wallet
- ✅ 0.05 ETH sent to recipient
- ✅ ~0.05 ETH remains in sub-wallet
- ✅ Transaction hash recorded

---

### Scenario 2: Token Swap

**Goal**: AI agent swaps ETH for USDC on Uniswap

**Setup**:
- Mode: A (Isolated Sub-Wallet)
- Network: Ethereum Goerli
- Token: ETH
- Allocation: 0.2 ETH

**Flow**:
1. User: "Swap 0.1 ETH for USDC"
2. AI requests authorization with swap details
3. User confirms
4. AI executes Uniswap swap:
   - Approve ETH spending
   - Call `swapExactETHForTokens()`
   - Receive USDC to sub-wallet
5. User sees updated balance

**Expected Results**:
- ✅ Swap executed successfully
- ✅ USDC balance increased
- ✅ ETH balance decreased by 0.1 + gas
- ✅ Transaction visible in history

---

### Scenario 3: NFT Minting

**Goal**: AI agent mints an NFT on behalf of user

**Setup**:
- Mode: A (Isolated Sub-Wallet)
- Network: Polygon Mumbai
- Token: MATIC
- Allocation: 5 MATIC

**Flow**:
1. User: "Mint a Bored Ape NFT"
2. AI requests authorization
3. User confirms
4. AI calls NFT contract `mint()` function
5. NFT transferred to user's main wallet

**Expected Results**:
- ✅ NFT minted successfully
- ✅ NFT appears in user's main wallet
- ✅ Sub-wallet paid gas fees
- ✅ Receipt stored in authorization history

---

## 🚀 Advanced Scenarios

### Scenario 4: DeFi Yield Farming

**Goal**: AI agent deposits assets into Aave and farms yield

**Setup**:
- Mode: B (Vault Contract) - When available
- Network: Ethereum Mainnet
- Token: USDC
- Allocation: 1000 USDC
- Daily Limit: $100

**Flow**:
1. User: "Farm yield on my 1000 USDC with conservative strategy"
2. AI requests authorization with Aave strategy
3. User confirms with Mode B (Vault Contract)
4. Vault contract deployed with rules:
   - Daily spending limit: $100
   - Whitelisted contracts: [Aave Lending Pool]
   - Allowed methods: [deposit, withdraw, claimRewards]
5. AI executes multi-step strategy:
   - Approve USDC spending
   - Deposit 1000 USDC to Aave
   - Monitor yield
   - Claim rewards periodically
   - Compound rewards
6. User monitors performance dashboard

**Expected Results**:
- ✅ Vault contract enforces daily limit
- ✅ AI cannot interact with non-whitelisted contracts
- ✅ Rewards automatically compounded
- ✅ User can withdraw anytime via contract

---

### Scenario 5: Automated Trading Bot

**Goal**: AI executes trading strategy with risk limits

**Setup**:
- Mode: B (Vault Contract)
- Network: Ethereum Mainnet
- Token: ETH
- Allocation: 5 ETH
- Daily Limit: 0.5 ETH

**Flow**:
1. User: "Trade ETH/USDC with momentum strategy, max 0.5 ETH per day"
2. AI requests authorization
3. User configures vault:
   - Daily limit: 0.5 ETH equivalent
   - Whitelisted: Uniswap V3, 1inch
   - Methods: swap, addLiquidity, removeLiquidity
4. AI monitors market and executes trades:
   - Day 1: Buy 0.3 ETH worth of USDC
   - Day 1: Sell 0.2 ETH worth of USDC (profit)
   - Day 2: Buy 0.4 ETH worth (limit allows)
   - Day 2: Attempt 0.3 ETH trade → REJECTED (exceeds daily limit)
5. User reviews P&L reports

**Expected Results**:
- ✅ Trades execute within limits
- ✅ Daily limit enforced by contract
- ✅ Unauthorized contracts blocked
- ✅ Complete audit trail

---

### Scenario 6: Cross-Chain Bridge

**Goal**: AI bridges assets from Ethereum to Polygon

**Setup**:
- Mode: A (Isolated Sub-Wallet) × 2 (one per chain)
- Networks: Ethereum + Polygon
- Tokens: ETH (source), MATIC (destination)
- Allocation: 0.5 ETH, 10 MATIC (for gas)

**Flow**:
1. User: "Bridge 0.3 ETH to Polygon"
2. AI requests TWO authorizations:
   - Authorization 1: Ethereum (0.5 ETH)
   - Authorization 2: Polygon (10 MATIC for gas)
3. User confirms both
4. AI executes bridge:
   - Approve bridge contract on Ethereum
   - Call `deposit()` on bridge
   - Wait for confirmation (10 mins)
   - Claim on Polygon network
5. User receives bridged ETH on Polygon

**Expected Results**:
- ✅ Two sub-wallets created (one per chain)
- ✅ Bridge transaction successful
- ✅ Assets received on destination chain
- ✅ Cross-chain tracking in UI

---

## 🛡️ Security Scenarios

### Scenario 7: Spending Limit Enforcement

**Goal**: Test that AI cannot exceed authorized limits

**Setup**:
- Mode: A (Isolated Sub-Wallet)
- Allocation: 0.1 ETH

**Flow**:
1. AI authorized with 0.1 ETH
2. AI attempts to send 0.15 ETH → **FAILS** (insufficient balance)
3. AI sends 0.05 ETH → ✅ Success
4. AI sends 0.04 ETH → ✅ Success
5. AI sends 0.02 ETH → **FAILS** (only ~0.01 ETH left after gas)

**Expected Results**:
- ✅ Transactions fail when exceeding balance
- ✅ Error messages clear and actionable
- ✅ No funds lost
- ✅ User can add more funds if needed

---

### Scenario 8: Contract Whitelist Enforcement (Mode B)

**Goal**: Test that AI cannot call unauthorized contracts

**Setup**:
- Mode: B (Vault Contract)
- Whitelisted: [Uniswap V3 Router]

**Flow**:
1. AI authorized with Uniswap whitelist
2. AI calls Uniswap swap → ✅ Success
3. AI attempts SushiSwap swap → **BLOCKED** (not whitelisted)
4. AI attempts malicious contract → **BLOCKED**
5. User adds SushiSwap to whitelist
6. AI calls SushiSwap → ✅ Success

**Expected Results**:
- ✅ Only whitelisted contracts callable
- ✅ Clear error messages
- ✅ User can update whitelist anytime
- ✅ Logs show blocked attempts

---

### Scenario 9: Revocation and Cleanup

**Goal**: Test authorization revocation

**Setup**:
- Mode: A (Isolated Sub-Wallet)
- Allocation: 0.5 ETH
- Spent: 0.2 ETH
- Remaining: ~0.3 ETH

**Flow**:
1. AI actively trading
2. User revokes authorization
3. System:
   - Pauses AI execution
   - Initiates fund recovery
   - Transfers 0.3 ETH back to main wallet
   - Marks authorization as "Revoked"
4. AI attempts operation → **FAILS** (authorization revoked)

**Expected Results**:
- ✅ Remaining funds returned
- ✅ AI cannot execute further operations
- ✅ Transaction history preserved
- ✅ Authorization marked "Revoked" in UI

---

## ❌ Error Scenarios

### Scenario 10: Network Disconnection

**Goal**: Handle network failures gracefully

**Flow**:
1. AI requests authorization
2. User confirms
3. During setup, network disconnects
4. Transaction fails to broadcast
5. System retries with exponential backoff
6. User sees "Network error, retrying..." message
7. Network reconnects
8. Transaction broadcasts successfully

**Expected Results**:
- ✅ Graceful error handling
- ✅ Automatic retry
- ✅ Clear user communication
- ✅ No funds lost

---

### Scenario 11: Insufficient Gas

**Goal**: Handle low gas balance in sub-wallet

**Flow**:
1. Sub-wallet has 0.01 ETH
2. AI attempts transaction requiring 0.015 ETH gas
3. Transaction simulation fails pre-broadcast
4. User sees error: "Insufficient gas in sub-wallet"
5. User adds 0.05 ETH via "Add Funds"
6. AI retries successfully

**Expected Results**:
- ✅ Pre-flight gas estimation
- ✅ Clear error messages
- ✅ Easy fund addition
- ✅ Successful retry

---

### Scenario 12: Contract Deployment Failure (Mode B)

**Goal**: Handle vault deployment errors

**Flow**:
1. User authorizes with Mode B
2. Vault contract deployment starts
3. Transaction fails (e.g., nonce conflict)
4. System detects failure
5. User sees error: "Contract deployment failed. Please retry."
6. User retries deployment
7. Deployment succeeds

**Expected Results**:
- ✅ Deployment failure detected
- ✅ User prompted to retry
- ✅ No double-deployment
- ✅ Clear error logs

---

## 🧪 Testing Checklist

Use this checklist to verify all scenarios:

### Mode A (Isolated Sub-Wallet)
- [ ] Basic transfer
- [ ] Token swap
- [ ] NFT minting
- [ ] Multi-chain authorization
- [ ] Fund addition
- [ ] Revocation and cleanup
- [ ] Insufficient balance handling
- [ ] Network disconnection recovery

### Mode B (Vault Contract)
- [ ] Contract deployment
- [ ] Daily limit enforcement
- [ ] Contract whitelist enforcement
- [ ] Method whitelist enforcement
- [ ] Emergency withdrawal
- [ ] Limit adjustment
- [ ] Deployment failure handling
- [ ] Cross-contract interactions

### UI/UX
- [ ] Authorization modal appearance
- [ ] Mode selection
- [ ] Biometric toggle (mobile)
- [ ] Success toast
- [ ] Error toast with actionable messages
- [ ] Transaction history display
- [ ] Spending analytics

### Security
- [ ] Password validation
- [ ] Biometric authentication (if enabled)
- [ ] Unauthorized contract blocking
- [ ] Spending limit enforcement
- [ ] Revocation immediate effect
- [ ] Sensitive data not logged

---

## 📊 Performance Benchmarks

### Expected Performance

| Operation                    | Expected Time | Notes                          |
|------------------------------|---------------|--------------------------------|
| Mode A sub-wallet creation   | < 5s          | Derivation + funding tx        |
| Mode B contract deployment   | 30-60s        | Depends on gas price           |
| Authorization modal display  | < 500ms       | Should be instant              |
| Revocation + fund recovery   | 10-30s        | Withdrawal transaction time    |
| Transaction history load     | < 2s          | From local storage             |

### Gas Cost Estimates

| Operation                | Network          | Estimated Cost |
|--------------------------|------------------|----------------|
| Sub-wallet funding       | Ethereum Mainnet | ~$2-5          |
| Vault deployment         | Ethereum Mainnet | ~$10-30        |
| Vault execution          | Ethereum Mainnet | ~$5-15         |
| Sub-wallet transfer      | Polygon          | ~$0.01-0.10    |

---

## 🔗 Scenario Implementation Status

| Scenario ID | Name                       | Mode | Status             |
|-------------|----------------------------|------|--------------------|
| 1           | Simple Token Transfer      | A    | ✅ Implemented     |
| 2           | Token Swap                 | A    | ✅ Implemented     |
| 3           | NFT Minting                | A    | ✅ Implemented     |
| 4           | DeFi Yield Farming         | B    | ⚠️ In Progress     |
| 5           | Automated Trading Bot      | B    | ⚠️ In Progress     |
| 6           | Cross-Chain Bridge         | A    | 🚧 Planned         |
| 7           | Spending Limit Test        | A    | ✅ Implemented     |
| 8           | Contract Whitelist Test    | B    | ⚠️ In Progress     |
| 9           | Revocation Test            | A    | ✅ Implemented     |
| 10          | Network Disconnection      | A    | ✅ Implemented     |
| 11          | Insufficient Gas           | A    | ✅ Implemented     |
| 12          | Deployment Failure         | B    | ⚠️ In Progress     |

**Legend:**
- ✅ Fully implemented and tested
- ⚠️ Partially implemented / In progress
- 🚧 Planned, not started

---

## 🎬 Demo Script for Presentations

### Quick 5-Minute Demo

**Scenario**: Simple token transfer (Scenario 1)

**Script**:
1. **[0:00-0:30]** Introduction
   - "Today I'll show you OneKey's AI Agent Session feature"
   - "This lets AI safely execute blockchain operations on your behalf"

2. **[0:30-1:30]** Setup
   - Open OneKey app
   - Navigate to Developer Tools → AI Agent Demo
   - Select "Simple Transfer" scenario

3. **[1:30-3:00]** Authorization Flow
   - AI requests: "Send 0.05 ETH to alice.eth"
   - Modal appears with details
   - Review request (agent name, amount, network)
   - Select Mode A (Isolated Sub-Wallet)
   - Tap "Authorize"

4. **[3:00-4:00]** Execution
   - Sub-wallet created automatically
   - Funding transaction broadcasts
   - AI executes transfer
   - Success notification appears

5. **[4:00-5:00]** Review
   - Show transaction history
   - Display remaining balance
   - Demonstrate revocation
   - Wrap up

**Key Talking Points**:
- Security through isolation
- User always in control
- Transparent transaction history
- Easy revocation

---

## 🛠️ Developer Integration Examples

### Triggering a Scenario from Code

```typescript
import { requestAuthorizationFromUI } from './skills/authorizationBridge';
import { EAgentAuthorizationMode } from './types';

async function runTransferScenario() {
  // Scenario 1: Simple Transfer
  const request = {
    agentId: 'simple-transfer-bot',
    agentName: 'Simple Transfer Bot',
    chainId: 'evm-5', // Goerli
    networkName: 'Ethereum Goerli',
    requestedMode: EAgentAuthorizationMode.IsolatedSubWallet,
    requestedAmount: '0.1',
    tokenSymbol: 'ETH',
    purpose: 'Send ETH to recipient',
    scenarioId: 'scenario-1',
  };

  // Request authorization from user
  const response = await requestAuthorizationFromUI(request);

  if (response.confirmed) {
    console.log('✅ User authorized!');
    console.log('Mode:', response.selectedMode);
    console.log('Biometric:', response.useBiometric);
    
    // Now execute the transfer
    // ... agent logic here ...
  } else {
    console.log('❌ User rejected authorization');
  }
}
```

---

## 📞 Feedback and Contributions

Found issues with these scenarios? Want to propose new ones?

- **GitHub Issues**: [onekey-app/issues](https://github.com/OneKeyHQ/app-monorepo/issues)
- **Label**: `agent-session-scenarios`

**Template for New Scenario Proposals**:
```markdown
### Scenario: [Name]

**Goal**: [What should this demonstrate?]
**Mode**: [A/B/C]
**Network**: [Which blockchain?]
**Complexity**: [Basic/Advanced/Security/Error]

**Flow**:
1. [Step 1]
2. [Step 2]
...

**Expected Results**:
- ✅ [Result 1]
- ✅ [Result 2]
```

---

**Last Updated**: 2024-02-01
**Version**: 1.0.0
