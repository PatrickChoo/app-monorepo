# Agent Account Marking

## 问题

需要在 OneKey 账户列表中清晰标记：
1. 该账户是否已被导出私钥（WIP = private key）
2. 是否已经被派发给某个 agent
3. 账户的当前状态（活跃/已撤销）

## 解决方案

### 双层标记系统

**1. Agent Account Registry**（后台数据）
- 记录账户与 agent 的映射关系
- 存储完整的元数据
- 用于查询和管理

**2. Account Name**（前端显示）
- 使用格式化的账户名称
- 直观显示状态
- 用户一眼可见

---

## 账户名称格式

### 格式定义

```
🤖 {AgentName} #{DerivationIndex} {StatusIcon}
```

### 状态图标

| 图标 | 含义 | 说明 |
|-----|------|------|
| 🔓 | Private Key Exported | 私钥已导出，Agent 拥有完全控制权 |
| 🔒 | Managed | 托管模式，每次操作需要确认 |
| 🗑️ | Revoked | 授权已撤销 |

### 示例

```
🤖 Trading Bot #10000 🔓     ← 私钥已导出
🤖 DeFi Bot #10001 🔒        ← 托管模式
🤖 NFT Bot #10002 🗑️         ← 已撤销
```

---

## Registry 数据结构

```typescript
interface IAgentAccountRegistry {
  // Account info
  accountId: string;              // OneKey account ID
  address: string;                // Account address
  derivationIndex: number;        // HD derivation index (10,000+)
  derivationPath: string;         // Full derivation path
  
  // Agent info
  agentId: string;                // Agent unique ID
  agentName: string;              // Agent display name
  authorizationId: string;        // Associated authorization ID
  
  // Status
  privateKeyExported: boolean;    // Whether private key was exported
  status: 'active' | 'revoked' | 'one-time-used';
  
  // Metadata
  createdAt: number;
  lastUsedAt: number;
  revokedAt?: number;
}
```

---

## 工作流程

### 1. 创建授权

```typescript
// Step 1: Derive account
const account = await deriveSubAccount({
  walletId,
  networkId,
  agentId: 'trading-bot',
  agentName: 'Trading Bot',
});

// Account created with name:
// "🤖 Trading Bot #10000 🔒"  ← 初始状态：托管模式
```

### 2. 导出私钥（Always-Allow 模式）

```typescript
// Step 2: Export private key
const privateKey = await exportPrivateKey({
  accountId: account.accountId,
  password,
});

// Step 3: Update account name
await updateAgentAccountName({
  accountId: account.accountId,
  agentName: 'Trading Bot',
  derivationIndex: 10000,
  privateKeyExported: true,  // ← 变化
  status: 'active',
});

// Account name updated to:
// "🤖 Trading Bot #10000 🔓"  ← 私钥已导出
```

### 3. 撤销授权

```typescript
// Step 1: Revoke authorization
await revokeAgentAuthorization(authorizationId);

// Step 2: Update account name
await updateAgentAccountName({
  accountId: account.accountId,
  agentName: 'Trading Bot',
  derivationIndex: 10000,
  privateKeyExported: true,
  status: 'revoked',  // ← 变化
});

// Account name updated to:
// "🤖 Trading Bot #10000 🗑️"  ← 已撤销
```

---

## UI 显示

### OneKey 账户列表

```
我的钱包
├── 主账户
│   0x742d35Cc6634C0532925a3b844Bc454e4438f44e
│   余额: 1.5 ETH
│
├── 交易账户
│   0x9abc35Cc6634C0532925a3b844Bc454e4438def0
│   余额: 0.3 ETH
│
├── 🤖 Trading Bot #10000 🔓
│   0x1234567890abcdef1234567890abcdef12345678
│   余额: 0.5 ETH
│   ⚠️ 私钥已导出
│
└── 🤖 NFT Bot #10001 🔒
    0x87654321fedcba0987654321fedcba0987654321
    余额: 0.1 ETH
    托管模式
```

### 账户详情页

```
┌────────────────────────────────────────┐
│ 🤖 Trading Bot #10000 🔓               │
├────────────────────────────────────────┤
│                                        │
│ 类型                                   │
│ 🤖 Agent Account                       │
│                                        │
│ Agent 名称                             │
│ Trading Bot                            │
│                                        │
│ 状态                                   │
│ ⚠️ 私钥已导出 - Agent 拥有完全控制权   │
│                                        │
│ 派生信息                               │
│ Index: 10000                           │
│ Path: m/44'/60'/0'/0/10000            │
│                                        │
│ 地址                                   │
│ 0x1234567890abcdef1234567890abcdef... │
│ [复制] [查看区块浏览器]                │
│                                        │
│ 余额                                   │
│ 0.5 ETH ≈ $1,234.56                   │
│                                        │
│ 授权信息                               │
│ 创建时间: 2024-02-06 16:30            │
│ 最后使用: 2024-02-06 18:45            │
│ [查看授权详情] [查看审计日志]          │
│                                        │
│ 操作                                   │
│ [撤销授权] [转出余额]                  │
│                                        │
└────────────────────────────────────────┘
```

### 状态标签

```
[🤖 Agent Account]                       ← 蓝色
[⚠️ Private Key Exported]                ← 黄色
[🗑️ Revoked]                             ← 灰色
```

---

## 优势

### ✅ 1. 直观可见
- 用户打开账户列表立即看到 Agent 账户
- 不需要额外查询
- 图标清晰标识状态

### ✅ 2. 信息完整
- Registry 存储完整元数据
- 账户名称显示关键信息
- 双重保障

### ✅ 3. 防止误操作
- 清晰标记防止用户误操作 Agent 账户
- 🔓 图标警告私钥已导出
- 🗑️ 图标标识已撤销

### ✅ 4. 易于管理
- 快速识别哪些账户是 Agent 账户
- 快速查看状态
- 支持过滤和搜索

### ✅ 5. 兼容性好
- 只使用账户名称，不修改 OneKey 核心数据结构
- Registry 作为独立模块
- 向后兼容

---

## 实现细节

### 核心函数

```typescript
// 1. 生成账户名称
generateAgentAccountName({
  agentName: 'Trading Bot',
  derivationIndex: 10000,
  privateKeyExported: true,
  status: 'active',
});
// 返回: "🤖 Trading Bot #10000 🔓"

// 2. 解析账户名称
parseAgentAccountName('🤖 Trading Bot #10000 🔓');
// 返回: {
//   isAgentAccount: true,
//   agentName: 'Trading Bot',
//   derivationIndex: 10000,
//   privateKeyExported: true,
//   status: 'active',
// }

// 3. 更新账户名称
updateAgentAccountName({
  accountId,
  agentName: 'Trading Bot',
  derivationIndex: 10000,
  privateKeyExported: true,
  status: 'revoked',
});
// OneKey 账户名称更新为: "🤖 Trading Bot #10000 🗑️"

// 4. 检查是否 Agent 账户
isAgentAccount(accountId);
// 返回: true/false

// 5. 获取显示信息
getAccountDisplayInfo(accountId);
// 返回: {
//   isAgentAccount: true,
//   registry: {...},
//   displayName: "🤖 Trading Bot #10000 🔓",
//   statusBadges: [
//     { icon: '🤖', label: 'Agent Account', color: '#2196F3' },
//     { icon: '⚠️', label: 'Private Key Exported', color: '#FFC107' },
//   ],
// }
```

### 自动更新时机

**账户名称会自动更新在**：
1. ✅ 创建账户时（初始状态：🔒 托管）
2. ✅ 导出私钥时（更新为：🔓 已导出）
3. ✅ 撤销授权时（更新为：🗑️ 已撤销）

**Registry 会自动更新在**：
1. ✅ 创建账户时（注册）
2. ✅ 状态改变时（更新 status）
3. ✅ 授权创建时（关联 authorizationId）

---

## 文件清单

```
新增:
- services/agentAccountRegistry.ts   # Registry 管理
- ACCOUNT_MARKING.md                 # 本文档

更新:
- services/wallet.ts                 # deriveSubAccount 集成 registry
- services/authorization.ts          # 自动更新账户名称
```

---

## 与其他方案对比

| 方案 | 直观性 | 实现难度 | 兼容性 | 可维护性 |
|------|--------|---------|--------|---------|
| 仅账户名称 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 仅 Registry | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 账户标签 | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Registry + 名称** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**推荐方案（Registry + 名称）的优势**：
- ✅ 最直观（名称显示）
- ✅ 最完整（Registry 元数据）
- ✅ 最兼容（不修改核心结构）
- ✅ 最灵活（可扩展）

---

## 未来扩展

可能的扩展：
- [ ] 账户颜色标记（不同 agent 不同颜色）
- [ ] 账户分组（Agent 账户单独分组）
- [ ] 快速筛选（显示/隐藏 Agent 账户）
- [ ] 批量操作（批量撤销/转出）
- [ ] 统计报告（各 agent 使用情况）
