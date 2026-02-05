# Mode A Implementation - Isolated Sub-Wallet

## 概述

Mode A 通过 HD 派生创建隔离的子钱包，为 AI Agent 提供独立的资金控制。

## 核心改进

### 1. 语义化函数命名

**之前**:
```typescript
executeModeA(request) // ❌ 不够清晰
```

**现在**:
```typescript
createAgentAuthorization(request, userConfig) // ✅ 语义明确
```

### 2. 用户控制打款流程

**新增用户配置**:
```typescript
interface IUserAuthorizationConfig {
  funding: {
    fromAccountId: string;    // 用户选择的账户
    fromAddress: string;      // 账户地址（用于显示）
    amount: string;           // 用户调整的金额
    tokenSymbol: string;
  };
  
  permission: {
    mode: 'ask-every-time' | 'always-allow';
  };
  
  walletId: string;
}
```

**用户可以**:
- ✅ 选择从哪个账户转账
- ✅ 调整转账金额（不受 Agent 建议限制）
- ✅ 选择权限模式（托管/自主）

### 3. 审计日志系统（类似 1Password CLI）

**用户可在设置中控制**:
- ✅ 开启/关闭审计日志（默认开启）
- ✅ 设置保留期（30/60/90/180/365 天）
- ✅ 自动清理旧日志
- ✅ 导出日志（JSON 格式）
- ✅ 手动清理

**所有关键操作都会记录**（当启用时）:
```typescript
interface IAuditLog {
  id: string;
  authorizationId: string;
  agentId: string;
  action: 
    | 'derive-account'           // 账户派生
    | 'fund-account'             // 资金转入
    | 'export-private-key'       // 私钥导出（敏感）
    | 'create-authorization'     // 授权创建
    | 'revoke-authorization'     // 授权撤销
    | 'authorization-failed';    // 授权失败
  details: Record<string, any>;
  timestamp: number;
}
```

**审计日志记录**:
- 账户派生（地址、路径、index）
- 资金转移（来源、目标、金额、tx hash）
- 私钥导出（⚠️ 敏感操作）
- 授权创建/撤销
- 失败原因和错误信息

### 4. 查询授权记录

**新增页面组件**:

1. **AuthorizationHistory** - 授权列表
   - 显示所有授权
   - 过滤（全部/活跃/已撤销）
   - 快速操作（查看日志/撤销）

2. **AuditLogViewer** - 审计日志查看器
   - 显示详细操作记录
   - 按时间排序
   - 不同操作类型的可视化

3. **AgentSessionSettings** - 设置页面
   - 启用/禁用审计日志
   - 配置保留期
   - 导出和清理功能
   - 隐私说明

## 完整授权流程

```typescript
// 1. Agent 请求授权
const request: IAgentAuthorizationRequest = {
  agentId: 'trading-bot',
  agentName: 'Trading Bot',
  suggestedAmount: '1 ETH',
  suggestedToken: 'ETH',
  chainId: 'evm-1',
  networkName: 'Ethereum',
  purpose: 'DeFi 自动化交易',
};

// 2. 用户配置（通过 UI）
const userConfig: IUserAuthorizationConfig = {
  funding: {
    fromAccountId: 'user-selected-account',
    fromAddress: '0x742d...',
    amount: '0.5 ETH',  // 用户调整后的金额
    tokenSymbol: 'ETH',
  },
  permission: {
    mode: 'always-allow',  // 用户选择自主模式
  },
  walletId: 'hd-wallet-1',
};

// 3. 创建授权
const result = await createAgentAuthorization(request, userConfig);

// 4. 返回结果
{
  success: true,
  authorizationId: 'auth-123',
  subWalletAddress: '0x1234...5678',
  subWalletPath: 'm/44\'/60\'/0\'/0/10000',
  derivationIndex: 10000,
  privateKey: '0xabc...',  // 仅 always-allow 模式
  fundingTxHash: '0xdef...',
  permissionMode: 'always-allow',
}
```

## HD 派生配置

### Agent 专用派生段

```typescript
const AGENT_DERIVATION_CONFIG = {
  // EVM 链
  EVM: {
    account: 0,                    // 固定 account（符合 OneKey 规范）
    startIndex: 10_000,            // address index 从 1 万开始
    endIndex: 100_000,             // 到 10 万
    pathTemplate: 'm/44\'/60\'/0\'/0/{index}',
  },
  
  // UTXO 链（BTC）
  UTXO_BTC: {
    startIndex: 10_000,            // account 位从 1 万开始
    endIndex: 100_000,
    pathTemplate: 'm/84\'/0\'/{account}\'/0/0',
  },
};
```

**特点**:
- ✅ 与用户账户（0-9,999）完全隔离
- ✅ 支持 90,000 个 Agent 账户
- ✅ 符合 OneKey 现有派生规范
- ✅ 性能良好（10,000 次派生 vs 1,000,000 次）

## 文件结构

```
AgentSession/
├── services/
│   ├── authorization.ts          # 新：完整授权流程
│   ├── storage.ts                # 更新：添加审计日志函数（自动检查设置）
│   ├── settings.ts               # 新：设置管理
│   └── wallet.ts                 # HD 派生和转账
├── pages/
│   ├── AuthorizationHistory.tsx  # 新：授权列表页面
│   ├── AuditLogViewer.tsx        # 新：审计日志查看器
│   └── AgentSessionSettings.tsx  # 新：设置页面（审计日志开关）
├── skills/modeExecutors/
│   └── modeA.ts                  # 更新：使用新的 createAgentAuthorization
├── types/
│   └── index.ts                  # 更新：新增字段
└── docs/
    ├── MODE_A_IMPLEMENTATION.md  # 新：完整实现文档
    └── AUDIT_LOGGING.md          # 新：审计日志文档
```

## 使用示例

### 1. 创建授权

```typescript
import { createAgentAuthorization } from '../services/authorization';

const result = await createAgentAuthorization(request, userConfig);
```

### 2. 查询授权记录

```typescript
import { getAllAuthorizations, getActiveAuthorizations } from '../services/storage';

const allAuths = await getAllAuthorizations();
const activeAuths = await getActiveAuthorizations();
```

### 3. 查看审计日志

```typescript
import { getAuditLogsByAuthorization } from '../services/storage';

const logs = await getAuditLogsByAuthorization(authorizationId);
```

### 4. 管理审计日志设置

```typescript
import {
  getAgentSessionSettings,
  updateAgentSessionSettings,
  isAuditLoggingEnabled,
} from '../services/settings';

// 获取当前设置
const settings = await getAgentSessionSettings();
console.log('Audit logging:', settings.auditLoggingEnabled);

// 更新设置
await updateAgentSessionSettings({
  auditLoggingEnabled: false,  // 关闭审计日志
});

// 检查是否启用
const enabled = await isAuditLoggingEnabled();
```

### 4. 撤销授权

```typescript
import { revokeAgentAuthorization } from '../services/authorization';

await revokeAgentAuthorization(authorizationId, password);
```

## 权限模式对比

| 特性 | Ask Every Time | Always Allow |
|------|----------------|--------------|
| 每次确认 | ✅ 需要 | ❌ 不需要 |
| 自动化 | ❌ 受限 | ✅ 完全自动 |
| 私钥导出 | ❌ 否 | ✅ 是 |
| 适用场景 | 简单转账 | DeFi/Perps |
| 安全性 | ⭐⭐⭐ | ⭐⭐ |
| 灵活性 | ⭐ | ⭐⭐⭐ |

## 安全措施

### 1. 资金隔离
```
用户给 Agent 0.5 ETH
  ↓
最坏情况：0.5 ETH 全部损失
  ↓
其他账户：完全安全
```

### 2. 审计追踪
- ✅ 所有操作都有日志
- ✅ 敏感操作（私钥导出）特别标注
- ✅ 失败原因清晰记录

### 3. 用户控制
- ✅ 用户选择打款账户
- ✅ 用户调整打款金额
- ✅ 用户选择权限模式
- ✅ 用户可随时撤销

## 向后兼容

旧的 `executeModeA()` 仍然可用，内部会转换为新格式并调用 `createAgentAuthorization()`：

```typescript
// 旧代码仍然能工作
await executeModeA({
  agentId: 'bot',
  agentName: 'Bot',
  chainId: 'evm-1',
  walletId: 'hd-1',
  mainAccountId: 'account-1',
  // ...
});
```

## 后续改进

- [ ] 实现 `revokeAgentAuthorization()` 完整功能
- [ ] 添加余额查询接口
- [ ] 实现交易历史查询
- [ ] 添加批量撤销功能
- [ ] 导出审计日志（CSV/JSON）
- [ ] 审计日志自动清理（90 天）
