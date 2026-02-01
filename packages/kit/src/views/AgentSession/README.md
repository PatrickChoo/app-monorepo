# Agent Session - AI Agent Authorization & Execution

## 概述

Agent Session 模块为 OneKey App 提供 AI Agent 授权和执行能力，实现了三种不同的授权模式，自动根据链能力和操作类型选择最佳模式。

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Agent                                 │
│                    (Claude / GPT / etc.)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Calls Skill Function
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Session Skill                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  demoAuthorizationScenario(scenarioId)                     │ │
│  │    ↓                                                        │ │
│  │  chooseMode(chainId, action) → Returns mode (A/B/C)        │ │
│  │    ↓                                                        │ │
│  │  runModeA() / runModeB() / runModeC()                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Calls App API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OneKey App                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Authorization Modal (1Password-style)                     │ │
│  │  - Shows mode, permissions, spending limits                │ │
│  │  - User confirms/rejects                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Transaction Execution                                     │ │
│  │  - Create sub-wallet / Deploy vault / Register session key│ │
│  │  - Store authorization record                             │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 三种授权模式

### Mode A: 隔离子钱包 (Isolated Sub-Wallet)

**原理**: 为 AI 创建一个独立的钱包，从主钱包转入固定金额。AI 只能花费这个子钱包的余额。

**适用场景**:
- 非 EVM 链 (Bitcoin, Solana, Cosmos, Near)
- 不支持 AA 或 Vault 的链
- 用户明确要求隔离

**优点**:
- ✅ 通用性：所有链都支持
- ✅ 简单直观
- ✅ 完全隔离

**缺点**:
- ❌ 需要链上转账（gas 费用）
- ❌ 无法实现细粒度权限控制

**实现位置**: `skills/modeExecutors/modeA.ts`

---

### Mode B: Vault 合约 (Vault Contract)

**原理**: 将资金存入智能合约，合约强制执行花费限制、合约白名单、方法白名单。

**适用场景**:
- EVM 链（有智能合约支持）
- Transfer 操作
- 需要花费限制的场景

**优点**:
- ✅ 链上规则强制执行
- ✅ 细粒度权限控制
- ✅ 用户随时可提现

**缺点**:
- ❌ 需要部署合约
- ❌ 较高 gas 费用
- ❌ 仅支持 EVM 链

**实现位置**: `skills/modeExecutors/modeB.ts`

---

### Mode C: Session Key (Account Abstraction)

**原理**: 使用 AA 钱包，为 AI 生成临时 Session Key，设置方法范围、花费限制、有效期。

**适用场景**:
- AA 支持的链（Ethereum, Polygon, Arbitrum, Base, zkSync）
- Swap / DeFi 操作
- 需要频繁交易的场景

**优点**:
- ✅ 最佳用户体验（无需每次签名）
- ✅ 细粒度权限
- ✅ 自动过期
- ✅ 可选 gasless（通过 bundler）

**缺点**:
- ❌ 需要 AA 钱包
- ❌ 链支持有限
- ❌ 实现复杂度较高

**实现位置**: `skills/modeExecutors/modeC.ts`

## 模式选择逻辑

模式由 `chooseMode()` 函数自动选择，基于：

1. **链能力**: 是否支持 AA / 智能合约
2. **操作类型**: swap / transfer / stake
3. **安全要求**: 花费限制、细粒度控制

### 选择矩阵

| 链 | 操作 | 选择的模式 | 原因 |
|-----|------|-----------|------|
| Ethereum | swap | C (Session Key) | AA 支持 + 最佳 UX |
| Ethereum | transfer | B (Vault) | 花费限制 |
| Polygon | swap | C (Session Key) | AA 支持 |
| Polygon | transfer | B (Vault) | 简单转账用 Vault |
| BNB Chain | transfer | B (Vault) | 无 AA，用 Vault |
| Bitcoin | any | A (Sub-Wallet) | 非 EVM，只能子钱包 |
| Solana | any | A (Sub-Wallet) | 非 EVM |

**实现位置**: `utils/modeSelection.ts`

## 目录结构

```
packages/kit/src/views/AgentSession/
├── README.md                          # 本文档
├── index.tsx                          # 主页面组件
├── types/
│   └── index.ts                       # 类型定义
├── utils/
│   └── modeSelection.ts               # 模式选择逻辑
├── skills/                            # Skill 代码（AI 调用的入口）
│   ├── index.ts                       # 主入口
│   ├── types.ts                       # Skill 特定类型
│   ├── demoScenarios.ts               # Demo 场景配置
│   └── modeExecutors/
│       ├── modeA.ts                   # Mode A 执行器
│       ├── modeB.ts                   # Mode B 执行器
│       └── modeC.ts                   # Mode C 执行器
├── pages/                             # UI 页面
│   ├── AuthorizationList.tsx          # 授权列表页
│   ├── AuthorizationDetail.tsx        # 授权详情页
│   └── DemoScenarios.tsx              # Demo 场景页
└── hooks/
    ├── useAuthorizations.ts           # 授权管理 hook
    └── useAgentSession.ts             # Agent Session hook
```

## AI → Skill → App 流程

### 1. 用户意图 → AI

**用户**: "Swap 0.1 ETH to USDC on Ethereum"

**AI 解析**:
- 操作: swap
- 链: Ethereum
- 数量: 0.1
- 代币: ETH → USDC

### 2. AI → Skill

```typescript
// AI 调用 Skill 函数
const result = await demoAuthorizationScenario('ethereum-swap');
```

### 3. Skill 逻辑

```typescript
// 1. 加载场景配置
const scenario = DEMO_SCENARIOS.find(s => s.id === 'ethereum-swap');

// 2. 选择模式
const mode = chooseMode('eip155:1', 'swap');
// Returns: Mode C (Session Key)

// 3. 构建请求
const request = {
  chainId: 'eip155:1',
  action: 'swap',
  amount: '0.1',
  ...
};

// 4. 执行对应模式
return await runModeC(request);
```

### 4. Skill → App

```typescript
// App 显示授权确认弹窗
const confirmed = await showAuthorizationModal({
  mode: 'SessionKey',
  permissions: ['swap', 'approve'],
  spendingLimit: '$500',
  ttl: '1 hour'
});

// 用户确认后，注册 Session Key
await registerSessionKey(...);
```

### 5. App → Skill → AI

```typescript
// 返回结果
return {
  success: true,
  authorizationId: 'auth-123',
  mode: 'SessionKey',
  sessionKeyPublicKey: '0x...',
  expiresAt: 1234567890
};
```

### 6. 后续执行

用户: "Execute the swap now"

```typescript
// AI 使用授权执行交易
const tx = await executeWithAuthorization('auth-123', {
  action: 'swap',
  fromToken: 'ETH',
  toToken: 'USDC',
  amount: '0.1'
});

// 返回交易哈希，无需用户再次签名！
```

## Demo 场景

### 已实现的场景

1. **ethereum-swap** - Ethereum swap (Mode C)
2. **polygon-transfer** - Polygon transfer (Mode B)
3. **bitcoin-transfer** - Bitcoin transfer (Mode A)
4. **arbitrum-swap** - Arbitrum swap (Mode C)
5. **bnb-transfer** - BNB Chain transfer (Mode B)
6. **solana-transfer** - Solana transfer (Mode A)
7. **base-stake** - Base staking (Mode C)

### 添加新场景

在 `skills/demoScenarios.ts` 中添加：

```typescript
{
  id: 'new-scenario',
  name: 'New Scenario',
  description: 'Description',
  chainId: 'eip155:1',
  networkName: 'Ethereum',
  suggestedMode: EAgentAuthorizationMode.SessionKey,
  action: 'swap',
  tokenSymbol: 'ETH',
  amount: '0.1'
}
```

## 开发指南

### 运行 Demo

```bash
# 1. 启动开发服务器
yarn dev

# 2. 导航到 Agent Session 页面
# 在 App 中: Settings → Developer → Agent Session Demo

# 3. 选择场景并测试
```

### 测试 Skill 调用

```typescript
import { demoAuthorizationScenario } from '@onekeyhq/kit/src/views/AgentSession/skills';

// 测试 Ethereum swap (Mode C)
const result = await demoAuthorizationScenario('ethereum-swap');
console.log(result);
// {
//   success: true,
//   authorizationId: 'auth-abc123',
//   mode: 'SessionKey',
//   sessionKeyPublicKey: '0x...',
//   expiresAt: 1234567890
// }
```

### 扩展功能

#### 添加新的授权模式

1. 在 `types/index.ts` 中添加新的模式枚举
2. 在 `utils/modeSelection.ts` 中更新选择逻辑
3. 在 `skills/modeExecutors/` 中创建新的执行器

#### 实现实际的钱包/合约集成

当前代码是骨架实现（mock），需要实现：

**Mode A**:
- [ ] 实际的钱包派生逻辑
- [ ] 链上转账交易
- [ ] 子钱包余额查询

**Mode B**:
- [ ] Vault 合约部署
- [ ] 存款交易
- [ ] 规则设置交易
- [ ] 合约调用执行

**Mode C**:
- [ ] AA 钱包初始化
- [ ] Session Key 生成和存储
- [ ] Session Key 注册交易
- [ ] UserOperation 构建和提交

## 安全考虑

1. **Session Key 存储**: 私钥加密后存储，永不暴露给 AI
2. **权限验证**: 执行前总是验证权限
3. **花费限制**: 跟踪并强制执行限制
4. **用户确认**: 授权前总是显示弹窗
5. **撤销机制**: 用户随时可撤销授权
6. **审计日志**: 记录所有 AI 交易

## 状态管理

使用 Jotai 管理授权状态：

```typescript
// atoms/agentSession.ts
export const agentAuthorizationsAtom = atom<IAgentAuthorization[]>([]);

// 添加授权
const addAuthorization = useSetAtom(addAuthorizationAtom);
addAuthorization(newAuth);

// 获取激活的授权
const activeAuths = useAtomValue(activeAuthorizationsAtom);

// 更新已花费金额
const updateSpent = useSetAtom(updateSpentAmountAtom);
updateSpent(authId, '0.05');
```

## 下一步

- [ ] 实现实际的钱包/合约集成
- [ ] 添加授权管理 UI
- [ ] 实现交易执行逻辑
- [ ] 添加完整的错误处理
- [ ] 编写单元测试和集成测试
- [ ] 添加监控和分析
- [ ] 优化 gas 费用
- [ ] 支持更多链

## 相关文档

- [AGENT_SESSION_PROMPT.md](../../../AGENT_SESSION_PROMPT.md) - 原始需求文档
- [.claude/skills/1k-agent-session/SKILL.md](../../../.claude/skills/1k-agent-session/SKILL.md) - Skill 文档
- Authorization Modes 详解
- AI → Skill → App 流程详解

## 贡献

欢迎贡献！请确保：

1. 遵循现有的代码结构和命名规范
2. 添加适当的类型定义
3. 更新相关文档
4. 编写测试用例
