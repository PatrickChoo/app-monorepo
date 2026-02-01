# OneKey 钱包服务层实施报告

## 概述

已成功实现 Agent Session 的钱包服务层，将三种授权模式连接到 OneKey 的真实钱包 API。

**提交哈希**: `6cc16f011`
**分支**: `feat/agent-session`
**日期**: 2025-02-01

---

## 实现的服务

### 1. WalletService (`services/wallet.ts`)

**功能**: 处理 Mode A (隔离子钱包) 的所有钱包操作

#### 核心接口

```typescript
// 获取当前活跃钱包
function getActiveWallet(): Promise<{
  walletId: string;
  accountId: string;
  address: string;
  networkId: string;
}>

// 派生子账户 (Mode A)
function deriveSubAccount(params: {
  walletId: string;
  networkId: string;
}): Promise<{
  accountId: string;
  address: string;
  path: string;
  index: number;
}>

// 转账到子账户
function transferToSubAccount(params: {
  fromAccountId: string;
  toAddress: string;
  amount: string;
  networkId: string;
  password: string;
}): Promise<{
  txHash: string;
  signedTx: any;
}>

// 从子账户执行交易
function executeFromSubAccount(params: {
  subAccountId: string;
  to: string;
  amount: string;
  networkId: string;
  password: string;
  data?: string;
}): Promise<{
  txHash: string;
  signedTx: any;
}>

// 查询账户余额
function getAccountBalance(params: {
  accountId: string;
  networkId: string;
}): Promise<{
  nativeBalance: string;
  tokens: Array<{ address: string; symbol: string; balance: string }>;
}>
```

#### 技术实现

- **HD 派生**: 使用 `backgroundApiProxy.serviceAccount.addHDNextIndexedAccount()`
- **交易构建**: 通过 `vaultFactory.getVault()` 获取链特定 Vault
- **签名**: `vault.signTransaction(unsignedTx, password)`
- **广播**: `backgroundApiProxy.serviceSend.broadcastTransaction()`

#### 使用的 OneKey API

```typescript
// 账户管理
await backgroundApiProxy.serviceAccount.getActiveAccount()
await backgroundApiProxy.serviceAccount.addHDNextIndexedAccount({ walletId })
await backgroundApiProxy.serviceAccount.getAccount({ accountId, networkId })

// 交易发送
await backgroundApiProxy.serviceSend.buildUnsignedTx({ ... })
await backgroundApiProxy.serviceSend.broadcastTransaction({ ... })

// 代币查询
await backgroundApiProxy.serviceToken.fetchAccountTokens({ accountId, networkId })

// Vault 操作
const vault = await vaultFactory.getVault({ networkId, accountId })
await vault.buildAccountAddressDetail({ account, networkId })
await vault.buildEncodedTx({ transfersInfo })
await vault.buildUnsignedTx({ encodedTx })
await vault.signTransaction({ unsignedTx, password })
```

---

### 2. ContractService (`services/contract.ts`)

**功能**: 处理 Mode B (Vault 合约) 的智能合约操作

#### 核心接口

```typescript
// 部署 Vault 合约 (骨架)
function deployVaultContract(params: {
  ownerAccountId: string;
  networkId: string;
  password: string;
  initialFunding?: string;
}): Promise<{
  contractAddress: string;
  txHash: string;
  owner: string;
}>

// 通过 Vault 执行交易 (骨架)
function executeViaVault(params: {
  vaultAddress: string;
  ownerAccountId: string;
  targetAddress: string;
  amount: string;
  networkId: string;
  password: string;
  data?: string;
}): Promise<{
  txHash: string;
  success: boolean;
}>

// 向 Vault 充值
function fundVault(params: {
  vaultAddress: string;
  ownerAccountId: string;
  amount: string;
  networkId: string;
  password: string;
}): Promise<{ txHash: string }>

// 获取 Vault 信息 (骨架)
function getVaultInfo(params: {
  vaultAddress: string;
  networkId: string;
}): Promise<{
  owner: string;
  balance: string;
}>
```

#### 状态

⚠️ **骨架实现** - 需要以下内容才能完整工作：

1. **Vault.sol 合约编译**
   - 需要编写并编译 Solidity 合约
   - 获取合约 bytecode
   - 定义完整的 ABI

2. **ABI 编码**
   - 实现 `execute(address,uint256,bytes)` 编码
   - 使用 web3.js 或 ethers.js 的 ABI coder

3. **合约地址计算**
   - 部署后计算合约地址（基于 deployer + nonce）

#### 预期的 Vault 合约结构

```solidity
contract AgentVault {
  address public owner;
  
  constructor() {
    owner = msg.sender;
  }
  
  modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
  }
  
  function execute(
    address to,
    uint256 value,
    bytes calldata data
  ) external onlyOwner returns (bool) {
    (bool success, ) = to.call{value: value}(data);
    return success;
  }
  
  receive() external payable {}
}
```

---

### 3. SessionKeyService (`services/sessionKey.ts`)

**功能**: 处理 Mode C (AA + Session Key) 的会话密钥管理

#### 核心接口

```typescript
// 生成 Session Key
function generateSessionKey(): Promise<{
  privateKey: string;
  publicKey: string;
  address: string;
}>

// 注册到 AA 钱包 (骨架)
function registerSessionKeyToAAWallet(params: {
  aaAccountId: string;
  sessionKey: { privateKey: string; publicKey: string; address: string };
  permissions: {
    allowedTargets: string[];
    spendingLimit: string;
    validUntil: number;
    validAfter: number;
  };
  networkId: string;
  password: string;
}): Promise<{
  sessionKeyAddress: string;
  permissions: SessionKeyPermissions;
  txHash: string;
}>

// 使用 Session Key 执行交易 (骨架)
function executeWithSessionKey(params: {
  aaAccountAddress: string;
  sessionKey: SessionKey;
  targetAddress: string;
  amount: string;
  networkId: string;
  data?: string;
}): Promise<{ txHash: string }>

// 撤销 Session Key (骨架)
function revokeSessionKey(params: {
  aaAccountId: string;
  sessionKeyAddress: string;
  networkId: string;
  password: string;
}): Promise<{ txHash: string }>

// 获取活跃的 Session Keys (骨架)
function getActiveSessionKeys(params: {
  aaAccountId: string;
  networkId: string;
}): Promise<Array<{
  address: string;
  permissions: SessionKeyPermissions;
  isActive: boolean;
}>>
```

#### 状态

⚠️ **骨架实现** - 需要以下内容才能完整工作：

1. **OneKey AA 钱包集成**
   - 发现 OneKey 是否有 AA 钱包实现
   - 如果没有，需要集成第三方 AA 钱包 (如 Stackup, Alchemy AA)

2. **Session Key 模块**
   - 找到或实现 ERC-6900 Session Key 验证模块
   - 实现 `addSessionKey()` 和 `removeSessionKey()` 调用

3. **UserOperation 构建**
   - 实现 ERC-4337 UserOperation 构建
   - 集成 Bundler 提交逻辑

4. **安全密钥存储**
   - 加密存储 Session Key 私钥
   - 使用用户密码或设备密钥加密

---

## Mode Executors 更新

### modeA.ts (已完成)

**更改**:
- `generateSubWallet()` → 现在使用 `WalletService.deriveSubAccount()`
- `transferToSubWallet()` → 现在使用 `WalletService.transferToSubAccount()`

**流程**:
```
1. deriveSubAccount() → 创建新的 HD 子账户
2. 显示确认弹窗
3. transferToSubAccount() → 从主钱包转账到子钱包
4. 创建授权记录
5. 返回子钱包地址和账户 ID
```

### modeB.ts (骨架)

**更改**:
- `deployVaultContract()` → 现在使用 `ContractService.deployVaultContract()`
- `depositToVault()` → 现在使用 `ContractService.fundVault()`

**流程**:
```
1. deployVaultContract() → 部署 Vault 合约 (TODO: 需要 bytecode)
2. 显示确认弹窗
3. fundVault() → 向 Vault 充值
4. 设置 Vault 规则 (TODO: 需要实现)
5. 创建授权记录
6. 返回 Vault 合约地址
```

### modeC.ts (骨架)

**更改**:
- `generateSessionKey()` → 现在使用 `SessionKeyService.generateSessionKey()`
- `registerSessionKey()` → 现在使用 `SessionKeyService.registerSessionKeyToAAWallet()`

**流程**:
```
1. 确保 AA 钱包存在 (TODO: 需要实现)
2. generateSessionKey() → 生成临时密钥对
3. 显示确认弹窗
4. registerSessionKeyToAAWallet() → 注册到 AA 钱包 (TODO: 需要实现)
5. 安全存储 Session Key (TODO: 需要加密)
6. 创建授权记录
7. 返回 Session Key 公钥
```

---

## 技术架构

### 数据流

```
UI Layer (React Components)
    ↓
Mode Executors (modeA/B/C.ts)
    ↓
Service Layer (wallet/contract/sessionKey.ts)
    ↓
backgroundApiProxy (OneKey API Proxy)
    ↓
Background Services (serviceAccount, serviceSend, etc.)
    ↓
Vault Layer (chain-specific implementations)
    ↓
Blockchain (RPC calls)
```

### 关键依赖

```typescript
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import vaultFactory from '@onekeyhq/kit-bg/src/vaults/factory';
import type { IUnsignedTxPro } from '@onekeyhq/kit-bg/src/vaults/types';
```

---

## 待完成任务

### 高优先级

1. **密码提示 UI** (所有 Modes)
   ```typescript
   // TODO: 实现
   const password = await backgroundApiProxy.servicePassword.promptPassword({
     reason: EReasonForNeedPassword.SignTransaction
   });
   ```

2. **Mode A 完整测试**
   - 测试子账户派生
   - 测试转账流程
   - 测试交易执行

### 中优先级

3. **Mode B 合约编译**
   - 编写 `VaultContract.sol`
   - 使用 Hardhat/Foundry 编译
   - 提取 bytecode 和 ABI
   - 实现 ABI 编码函数

4. **Mode B 合约地址计算**
   ```typescript
   // 需要实现
   const contractAddress = calculateContractAddress(deployerAddress, nonce);
   ```

### 低优先级

5. **Mode C AA 钱包研究**
   - 查找 OneKey AA 实现
   - 如果没有，集成第三方 AA SDK
   - 实现 UserOperation 构建

6. **Mode C Session Key 模块**
   - 找到 ERC-6900 实现
   - 实现 Session Key 注册/撤销
   - 实现 Bundler 集成

---

## 测试清单

### WalletService 测试

- [ ] `getActiveWallet()` 正确返回当前钱包
- [ ] `deriveSubAccount()` 创建新的 HD 账户
- [ ] `deriveSubAccount()` 返回正确的地址和路径
- [ ] `transferToSubAccount()` 成功转账
- [ ] `transferToSubAccount()` 返回有效的 txHash
- [ ] `executeFromSubAccount()` 可以发送交易
- [ ] `getAccountBalance()` 正确查询余额

### ContractService 测试

- [ ] `deployVaultContract()` 部署合约（编译后）
- [ ] `fundVault()` 成功转账到合约
- [ ] `executeViaVault()` 通过合约执行调用（实现后）
- [ ] `getVaultInfo()` 查询合约状态（实现后）

### SessionKeyService 测试

- [ ] `generateSessionKey()` 生成有效密钥对
- [ ] `registerSessionKeyToAAWallet()` 注册成功（AA 实现后）
- [ ] `executeWithSessionKey()` 执行交易（实现后）
- [ ] `revokeSessionKey()` 撤销成功（实现后）

---

## 已知问题

### 1. 密码处理

**问题**: 当前所有密码参数都使用空字符串占位符

**影响**: 无法签名真实交易

**解决方案**: 
```typescript
// 需要集成 OneKey 的密码弹窗
async function getUserPassword(): Promise<string> {
  const password = await backgroundApiProxy.servicePassword.promptPassword({
    reason: EReasonForNeedPassword.SignTransaction,
  });
  return password;
}
```

### 2. Mode B 未完成

**问题**: 缺少 Vault 合约 bytecode

**影响**: 无法部署合约

**解决方案**: 编写并编译 Solidity 合约

### 3. Mode C 未完成

**问题**: OneKey 可能不支持 AA 钱包

**影响**: Session Key 功能无法使用

**解决方案**: 
- 选项 1: 研究 OneKey 是否有 AA 实现
- 选项 2: 集成第三方 AA SDK (Stackup, Alchemy)
- 选项 3: 仅支持 Mode A 和 Mode B

---

## 性能考虑

### 交易确认

当前实现在广播交易后立即返回，不等待确认：

```typescript
const result = await backgroundApiProxy.serviceSend.broadcastTransaction({ ... });
return { txHash: result.txid }; // 立即返回，不等待确认
```

**改进建议**:
```typescript
// 可选：等待交易确认
const receipt = await vault.waitForTransactionReceipt(result.txid, {
  timeout: 60000, // 60秒超时
  confirmations: 1, // 至少 1 个确认
});
```

### 余额刷新

需要在转账后刷新余额：

```typescript
// 转账后
await transferToSubAccount({ ... });

// 刷新余额
await backgroundApiProxy.serviceToken.fetchAccountTokens({
  accountId: subAccountId,
  networkId,
  forceRefresh: true,
});
```

---

## 代码质量

### 已实现

✅ TypeScript 类型安全
✅ 错误处理和日志记录
✅ 模块化设计（服务层分离）
✅ 清晰的接口文档

### 待改进

⚠️ 单元测试缺失
⚠️ 集成测试缺失
⚠️ 错误重试逻辑
⚠️ 交易状态跟踪

---

## 总结

### 已完成

1. ✅ **WalletService** - 完整实现 Mode A 所需的所有钱包操作
2. ✅ **Mode A Executor** - 完全连接到真实 OneKey API
3. ✅ **ContractService** - 骨架实现，等待合约编译
4. ✅ **SessionKeyService** - 骨架实现，等待 AA 集成
5. ✅ **Mode B/C Executors** - 基础流程，等待服务完善

### 下一步

**立即可做**:
1. 实现密码提示 UI
2. 端到端测试 Mode A
3. 编写 Vault 合约

**短期**:
4. 完成 Mode B 合约部署
5. 研究 OneKey AA 支持

**长期**:
6. 实现 Mode C (如果 OneKey 支持 AA)
7. 添加交易监控和状态跟踪
8. 实现完整的测试套件

---

**最后更新**: 2025-02-01
**作者**: AI Agent (Subagent)
**审核状态**: 待人工审核
