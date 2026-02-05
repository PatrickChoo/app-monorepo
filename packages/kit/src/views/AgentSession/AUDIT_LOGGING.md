# Audit Logging

## 概述

类似 1Password CLI 的审计日志功能，用户可以在设置中控制是否启用。

## 功能

### 1. 可选启用/禁用

**默认状态**: ✅ 启用

**用户可以在设置中**:
- 开启/关闭审计日志
- 设置保留时间（30/60/90/180/365 天）
- 启用/禁用自动清理
- 导出日志
- 手动清理旧日志

### 2. 记录的操作

当审计日志启用时，记录：

- ✅ 账户派生（地址、路径、index）
- ✅ 资金转入（来源、目标、金额、tx hash）
- ✅ 私钥导出（⚠️ 敏感操作）
- ✅ 授权创建/撤销
- ✅ 失败和错误

### 3. 隐私保护

- ✅ 所有日志本地存储
- ✅ 不发送到服务器
- ✅ 用户完全控制

## 使用方式

### 用户端

#### 1. 开启/关闭审计日志

```
设置 → Agent Session → 审计日志
  ↓
[启用审计日志] ← 开关
```

**关闭后**:
- 不再记录新操作
- 已有日志保留（除非手动删除）

#### 2. 设置保留时间

```
保留期限: [30d] [60d] [90d] [180d] [365d]
                        ↑ 选中
```

**自动清理**:
- 当启用时，会自动删除超过保留期的日志
- 每次打开 app 时检查

#### 3. 导出日志

```
[📤 导出日志] ← 按钮
  ↓
生成 JSON 文件
```

**导出格式**:
```json
[
  {
    "id": "log-123",
    "authorizationId": "auth-456",
    "agentId": "trading-bot",
    "action": "derive-account",
    "details": {
      "address": "0x1234...",
      "path": "m/44'/60'/0'/0/10000"
    },
    "timestamp": 1707123456789
  }
]
```

#### 4. 清理旧日志

```
[🗑️ 立即清理] ← 按钮
  ↓
确认对话框
  ↓
删除超过保留期的日志
```

### 开发端

#### 1. 检查是否启用

```typescript
import { isAuditLoggingEnabled } from './services/settings';

const enabled = await isAuditLoggingEnabled();
if (enabled) {
  // 记录日志
}
```

#### 2. 添加日志（自动检查）

```typescript
import { addAuditLog } from './services/storage';

// addAuditLog 内部会自动检查设置
await addAuditLog({
  authorizationId: auth.id,
  agentId: request.agentId,
  action: 'derive-account',
  details: {
    address: account.address,
    path: account.path,
  },
  timestamp: Date.now(),
});
```

**如果禁用**:
- 日志不会写入
- Console 输出: `[AuditLog] Skipped (logging disabled): derive-account`

#### 3. 查询日志

```typescript
import { getAuditLogsByAuthorization } from './services/storage';

const logs = await getAuditLogsByAuthorization(authId);
// 返回所有日志（包括禁用前的）
```

#### 4. 清理日志

```typescript
import { cleanupOldAuditLogs } from './services/storage';

// 清理 90 天前的日志
const deleted = await cleanupOldAuditLogs(90);
console.log(`Deleted ${deleted} old logs`);
```

## 设置项说明

```typescript
interface IAgentSessionSettings {
  // 是否启用审计日志
  auditLoggingEnabled: boolean;  // 默认: true
  
  // 保留天数
  auditLogRetentionDays: number; // 默认: 90
  
  // 是否自动清理
  autoCleanupEnabled: boolean;   // 默认: true
}
```

## 存储位置

**SimpleDb 表**:
- `agentSettings` - 设置
- `agentAuditLogs` - 日志

**本地存储**:
- 数据库路径: `~/.onekey/simpledb/agentAuditLogs.json`
- 设置路径: `~/.onekey/simpledb/agentSettings.json`

## 日志大小估算

| 操作次数 | 日志条目 | 估算大小 |
|---------|---------|---------|
| 10 次授权 | ~50 条 | ~25 KB |
| 100 次授权 | ~500 条 | ~250 KB |
| 1000 次授权 | ~5000 条 | ~2.5 MB |

**平均**: 每条日志 ~500 bytes

## 最佳实践

### 用户

**何时启用**:
- ✅ 需要审计追踪
- ✅ 调试问题
- ✅ 合规要求

**何时禁用**:
- ✅ 注重隐私（不想保留操作记录）
- ✅ 节省存储空间
- ✅ 简化界面

**保留时间建议**:
- 个人使用: 30-90 天
- 企业使用: 180-365 天
- 合规要求: 根据政策

### 开发

**总是记录的操作**:
- 私钥导出（安全关键）
- 授权创建/撤销
- 失败和错误

**可选记录的操作**:
- 余额查询
- 普通交易

## UI 截图

### 设置页面

```
┌──────────────────────────────────────────┐
│  Agent Session Settings                  │
├──────────────────────────────────────────┤
│                                          │
│  🔍 Audit Logging                        │
│                                          │
│  [启用审计日志] ────────────── ● ON      │
│  Track all agent operations              │
│                                          │
│  [自动清理旧日志] ─────────── ● ON       │
│  Automatically delete logs older than    │
│  90 days                                 │
│                                          │
│  保留期限                                 │
│  [30d] [60d] [90d] [180d] [365d]        │
│              ↑ 选中                      │
│                                          │
│  456 log entries • Using ~228KB          │
│                                          │
│  [📤 导出日志]  [🗑️ 立即清理]            │
│                                          │
├──────────────────────────────────────────┤
│  🔐 Privacy                              │
│                                          │
│  ℹ️ Audit logs are stored locally on    │
│  your device and never sent to servers. │
│                                          │
└──────────────────────────────────────────┘
```

## 与 1Password CLI 对比

| 功能 | 1Password CLI | OneKey Agent Session |
|------|--------------|---------------------|
| 可选启用 | ✅ | ✅ |
| 本地存储 | ✅ | ✅ |
| 保留期设置 | ✅ | ✅ |
| 自动清理 | ✅ | ✅ |
| 导出日志 | ✅ | ✅ |
| 记录敏感操作 | ✅ | ✅ |

**相似点**:
- 用户可控制
- 隐私优先
- 本地存储

**OneKey 特色**:
- UI 更友好
- 实时统计
- 可视化展示

## 未来改进

- [ ] 导出为 CSV 格式
- [ ] 日志搜索和过滤
- [ ] 按 agent 分组统计
- [ ] 异常活动告警
- [ ] 加密敏感日志内容
