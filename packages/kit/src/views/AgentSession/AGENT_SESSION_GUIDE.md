# AI Agent Session - User Guide

## Overview

AI Agent Session enables you to authorize AI agents to perform blockchain operations on your behalf with granular control and security. This guide explains how to set up, use, and manage AI agent authorizations.

---

## 🔐 Authorization Modes

OneKey offers three authorization modes, each with different security and functionality trade-offs:

### Mode A: Isolated Sub-Wallet (✅ **Fully Implemented**)

**How it works:**
- Creates a dedicated sub-wallet derived from your main account
- You fund this sub-wallet with a limited amount
- AI agent can spend only what's in the sub-wallet
- Simple, secure, and widely compatible

**Best for:**
- Most users
- Quick testing and demos
- Chains without smart contract support
- Maximum simplicity

**Pros:**
- ✅ Works on all chains (including non-EVM)
- ✅ Easy to understand
- ✅ No gas overhead
- ✅ Instant setup

**Cons:**
- ❌ Less flexible spending controls
- ❌ Requires manual funding
- ❌ Agent has direct key access (trusted execution required)

---

### Mode B: Vault Contract (⚠️ **In Progress**)

**How it works:**
- Deploys a smart contract that holds your funds
- AI agent must request execution through the contract
- Contract enforces daily limits, whitelists, and other rules
- You retain full control through contract ownership

**Best for:**
- Advanced users
- Production use cases
- Long-running AI operations
- Scenarios requiring strict spending limits

**Pros:**
- ✅ Enforced on-chain rules
- ✅ Transparent and auditable
- ✅ No direct key access for AI
- ✅ Flexible rule configuration

**Cons:**
- ❌ EVM chains only
- ❌ Requires contract deployment (gas cost)
- ❌ More complex setup
- ⚠️ Currently being implemented (contract compiled, integration in progress)

---

### Mode C: Session Key (Account Abstraction) (🚧 **Planned**)

**How it works:**
- Uses ERC-4337 Account Abstraction
- Generates temporary session keys for AI
- Fine-grained permissions per session
- Keys can be revoked instantly

**Best for:**
- ERC-4337 compatible wallets
- Maximum security and flexibility
- Frequent AI interactions

**Status:** Planned for future release

---

## 📖 How to Authorize an AI Agent

### Step 1: AI Agent Requests Authorization

When an AI agent needs to perform blockchain operations, it will request authorization through OneKey. You'll see a modal like this:

```
🤖 AI Agent Authorization
Agent: DeFi Trading Bot
Network: Ethereum Mainnet
Requested Amount: 0.5 ETH
Purpose: Execute swap operations
```

### Step 2: Review Request Details

Check the following information:
- **Agent Name**: The AI skill requesting access
- **Chain/Network**: Which blockchain network
- **Amount**: How much the agent wants to use
- **Purpose**: Why the agent needs authorization
- **Token**: Which cryptocurrency

### Step 3: Select Authorization Mode

Choose between:
- **Mode A** (Isolated Sub-Wallet) - Recommended for most users
- **Mode B** (Vault Contract) - For advanced control (coming soon)
- **Mode C** (Session Key) - Future feature

### Step 4: Configure Security (Optional)

- **Biometric Authentication**: Require Face ID / Touch ID for each operation
  - Recommended for high-value operations
  - Available on mobile devices only

### Step 5: Confirm Authorization

Tap **"Authorize"** to proceed. OneKey will:
1. Create necessary accounts/contracts
2. Transfer the specified amount
3. Return control to the AI agent
4. Display a confirmation toast

---

## 🛠️ Managing Active Authorizations

### View All Authorizations

Navigate to: **Settings → Agent Sessions** (or access via Developer menu)

You'll see a list of all active and past authorizations:

```
📊 Active Authorizations

DeFi Trading Bot
├─ Network: Ethereum
├─ Mode: Isolated Sub-Wallet
├─ Balance: 0.35 ETH / 0.50 ETH
├─ Status: Active
└─ Created: 2024-02-01 10:30

News Summarizer Bot
├─ Network: Polygon
├─ Mode: Vault Contract
├─ Daily Limit: $50 / $100
├─ Status: Active
└─ Created: 2024-01-28 14:20
```

### Revoke an Authorization

To stop an AI agent:

1. Tap on the authorization
2. Select **"Revoke Authorization"**
3. Confirm the action

**What happens:**
- Mode A: Remaining funds are returned to your main wallet
- Mode B: Contract is paused, funds remain accessible to you
- Mode C: Session key is invalidated immediately

---

## 💰 Funding and Withdrawals

### Mode A: Isolated Sub-Wallet

**Initial Funding:**
- Automatically funded during authorization
- Amount you specify is transferred from main wallet

**Add More Funds:**
1. Go to authorization details
2. Tap **"Add Funds"**
3. Enter amount and confirm

**Withdraw Funds:**
1. Go to authorization details
2. Tap **"Withdraw"**
3. Choose amount or select "All"
4. Funds return to your main wallet

### Mode B: Vault Contract

**Initial Funding:**
- Deployed during authorization
- Automatically receives initial amount

**Add More Funds:**
- Send directly to contract address
- Or use **"Fund Vault"** button in app

**Withdraw Funds:**
- Only contract owner (you) can withdraw
- Use **"Emergency Withdraw"** for full balance
- Or adjust daily limit to access incrementally

---

## 🔍 Monitoring Agent Activity

### Transaction History

Each authorization shows a detailed activity log:

```
Recent Transactions

✅ Swap 0.05 ETH → 120 USDC
   2024-02-01 15:23 | Fee: $2.34

✅ Transfer 50 USDC to 0x1234...
   2024-02-01 14:10 | Fee: $0.50

❌ Swap 0.1 ETH → DAI (Failed: Insufficient balance)
   2024-02-01 13:45
```

### Spending Analytics

- **Total Spent**: Cumulative amount used
- **Remaining Balance**: Available for agent
- **Daily Limit** (Mode B): Resets every 24 hours
- **Gas Costs**: Total fees paid

---

## ⚙️ Advanced Settings

### Daily Spending Limits (Mode B only)

Set maximum amount AI can spend per day:

```
Daily Limit: $100 USD
Current Spent: $23.50
Resets in: 8 hours 32 minutes
```

### Contract Whitelists (Mode B only)

Restrict which smart contracts the AI can interact with:

```
Allowed Contracts:
✅ Uniswap V3 Router (0x68b3...)
✅ Aave Lending Pool (0x7d2...)
❌ All others (blocked)
```

### Method Whitelists (Mode B only)

Allow only specific function calls:

```
Allowed Methods:
✅ swap()
✅ addLiquidity()
❌ transferOwnership() (blocked)
❌ approve() (blocked for security)
```

---

## 🛡️ Security Best Practices

### 1. Start Small
- Test with small amounts first
- Gradually increase as you gain confidence

### 2. Use Appropriate Modes
- **Quick tests**: Mode A (Isolated Sub-Wallet)
- **Production**: Mode B (Vault Contract) when available
- **High security**: Enable biometric authentication

### 3. Monitor Regularly
- Check transaction history daily
- Review spending patterns
- Revoke unused authorizations

### 4. Set Conservative Limits
- Daily limits should be << total balance
- Whitelist only necessary contracts
- Restrict to essential methods

### 5. Emergency Actions
- Know how to revoke access immediately
- Keep main wallet password secure
- Enable transaction notifications

---

## 🐛 Troubleshooting

### "Insufficient Balance" Error

**Cause**: Sub-wallet or vault doesn't have enough funds

**Solution**:
1. Check authorization details
2. Add more funds via **"Add Funds"**
3. Or increase allocation in settings

### "Daily Limit Exceeded" (Mode B)

**Cause**: AI hit the daily spending cap

**Solution**:
1. Wait for daily reset (shown in countdown)
2. Or increase daily limit in settings
3. Or manually execute via contract owner

### "Authorization Not Found"

**Cause**: Authorization was revoked or expired

**Solution**:
1. Create a new authorization
2. Check if agent is requesting on correct network

### "Vault Contract Not Deployed"

**Cause**: Mode B contract deployment incomplete

**Solution**:
- Mode B is still in development
- Use Mode A (Isolated Sub-Wallet) instead
- Check for app updates

---

## 📚 FAQ

**Q: Can I authorize multiple agents simultaneously?**
A: Yes! Each agent gets a separate authorization with independent limits.

**Q: What happens if I delete OneKey app?**
A: 
- Mode A: Sub-wallet still exists; recover with seed phrase
- Mode B: Vault contract remains on blockchain; access with any wallet

**Q: Can I transfer authorization to another device?**
A: Not directly. You can:
1. Revoke on Device A
2. Re-authorize on Device B
3. Or sync via seed phrase (advanced)

**Q: How much does Mode B cost?**
A: Contract deployment typically costs $5-20 in gas fees (varies by network).

**Q: Is my AI agent trustworthy?**
A: 
- Mode A: Agent has direct access; use only trusted agents
- Mode B: Contract enforces rules; safer for unknown agents
- Always review agent source code if available

**Q: Can I customize authorization UI?**
A: Not yet. Custom UIs planned for future release.

---

## 🔗 Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Demo Scenarios](./DEMO_SCENARIOS.md)
- [API Reference](./README.md)
- [Integration Guide](./INTEGRATION.md)

---

## 💬 Support

Need help?
- GitHub Issues: [onekey-app/issues](https://github.com/OneKeyHQ/app-monorepo/issues)
- Community: [Discord](https://discord.gg/onekey)
- Docs: [OneKey Documentation](https://help.onekey.so)

---

**Last Updated**: 2024-02-01
**Version**: 1.0.0 (Mode A stable, Mode B in progress)
