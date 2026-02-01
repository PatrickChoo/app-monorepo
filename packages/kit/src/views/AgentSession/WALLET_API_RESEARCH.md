# OneKey 钱包 API 研究报告

## 架构概览

OneKey 采用经典的 Vault 架构，核心分为以下几层：

### 1. backgroundApiProxy (主入口)
**位置**: `packages/kit/src/background/instance/backgroundApiProxy.ts`

**用途**: UI 层访问后端服务的代理，提供所有 Service 的访问接口

**主要 Services**:
- `serviceAccount` - 账户管理
- `serviceSend` - 交易发送
- `serviceTransaction` - 交易管理
- `serviceToken` - 代币管理
- `serviceNetwork` - 网络管理

### 2. Vault 系统
**位置**: `packages/kit-bg/src/vaults/`

**核心类**:
- `VaultBase` - 所有 Vault 的基类
- `KeyringBase` - 密钥管理基类
  - `KeyringHdBase` - HD 钱包（派生）
  - `KeyringImportedBase` - 导入钱包
  - `KeyringWatchingBase` - 观察钱包

**每条链的实现**: `packages/kit-bg/src/vaults/impls/{chain}/`
- `Vault.ts` - 交易构建、签名、广播
- `KeyringHd.ts` - HD 派生逻辑
- `settings.ts` - 链配置

---

## 关键 API

### 1. 创建账户/派生子账户

```typescript
// 添加下一个 HD 账户（自动递增 index）
const result = await backgroundApiProxy.serviceAccount.addHDNextIndexedAccount({
  walletId: 'hd-xxxx'
});

// 返回结果包含:
// - account: IDBAccount (包含 address, path 等)
// - indexedAccount: IDBIndexedAccount
```

**代码位置**: `packages/kit-bg/src/services/ServiceAccount/ServiceAccount.ts:L2xxx`

**HD 派生路径**:
- EVM: `m/44'/60'/0'/0/{index}`
- Bitcoin: `m/84'/0'/0'/0/{index}` (Native SegWit)
- 其他链: 各自标准路径

**数据结构**:
```typescript
interface IDBAccount {
  id: string;
  address: string;
  path?: string;  // 如 "m/44'/60'/0'/0/1"
  coinType?: string;
  impl?: string;  // 如 "evm"
  pub?: string;   // 公钥
}
```

---

### 2. 获取账户信息

```typescript
// 获取钱包下的所有账户
const accounts = await backgroundApiProxy.serviceAccount.getAccounts({
  walletId: 'hd-xxxx',
  networkId: 'evm--1' // 可选
});

// 获取单个账户
const account = await backgroundApiProxy.serviceAccount.getAccount({
  accountId: 'hd-xxxx--m/44\'/60\'/0\'/0/1',
  networkId: 'evm--1'
});
```

---

### 3. 构建和发送交易

**完整流程**:

#### Step 1: 构建编码交易 (encodedTx)

```typescript
// 通过 Vault 构建
const vault = await vaultFactory.getVault({
  networkId: 'evm--1',
  accountId: 'hd-xxxx--m/44\'/60\'/0\'/0/1'
});

const encodedTx = await vault.buildEncodedTx({
  transfersInfo: [{
    from: '0xABC...',
    to: '0xDEF...',
    amount: '1000000000000000000', // 1 ETH in wei
    token: 'evm--1', // native token
  }]
});
```

#### Step 2: 构建未签名交易 (unsignedTx)

```typescript
const unsignedTx = await backgroundApiProxy.serviceSend.buildUnsignedTx({
  networkId: 'evm--1',
  accountId: 'hd-xxxx--m/44\'/60\'/0\'/0/1',
  encodedTx,
  // 或直接传 transfersInfo:
  transfersInfo: [{ from, to, amount, token }]
});

// unsignedTx 包含:
// - encodedTx: 编码后的交易
// - nonce, gasLimit, gasPrice 等参数
```

#### Step 3: 签名交易

```typescript
const signedTx = await vault.signTransaction({
  unsignedTx,
  password: 'user-password' // 解锁钱包
});

// signedTx 包含:
// - rawTx: 签名后的原始交易字节
// - txid: 交易哈希
// - encodedTx: 原始编码交易
```

#### Step 4: 广播交易

```typescript
const result = await backgroundApiProxy.serviceSend.broadcastTransaction({
  networkId: 'evm--1',
  accountId: 'hd-xxxx--m/44\'/60\'/0\'/0/1',
  signedTx,
  accountAddress: '0xABC...'
});

// 返回:
// { txid: '0x123abc...' }
```

**代码位置**:
- `packages/kit-bg/src/services/ServiceSend.ts` - 发送服务
- `packages/kit-bg/src/vaults/impls/evm/Vault.ts` - EVM 实现

---

### 4. 查询余额

```typescript
// 通过 serviceToken 查询账户代币
const tokens = await backgroundApiProxy.serviceToken.fetchAccountTokens({
  networkId: 'evm--1',
  accountId: 'hd-xxxx--m/44\'/60\'/0\'/0/1'
});

// tokens 包含原生币和所有 ERC20 代币的余额
```

---

## Mode A 实现方案

### 1. 创建隔离子钱包

```typescript
async function createIsolatedSubWallet(params: {
  walletId: string;
  chainId: string;
}): Promise<{ address: string; accountId: string }> {
  // 1. 添加新的 HD 账户（自动递增 index）
  const result = await backgroundApiProxy.serviceAccount.addHDNextIndexedAccount({
    walletId: params.walletId
  });
  
  // 2. 获取账户地址
  const account = result.account;
  const networkId = params.chainId; // 如 'evm--1'
  
  // 3. 构建账户详情
  const accountDetail = await vault.buildAccountAddressDetail({
    account,
    networkId,
  });
  
  return {
    address: accountDetail.address,
    accountId: account.id,
    path: account.path // 如 "m/44'/60'/0'/0/5"
  };
}
```

### 2. 从主钱包转账到子钱包

```typescript
async function transferToSubWallet(params: {
  fromAccountId: string;
  toAddress: string;
  amount: string;
  networkId: string;
}): Promise<string> {
  const { fromAccountId, toAddress, amount, networkId } = params;
  
  // 1. 构建未签名交易
  const unsignedTx = await backgroundApiProxy.serviceSend.buildUnsignedTx({
    networkId,
    accountId: fromAccountId,
    transfersInfo: [{
      from: fromAccountAddress, // 需要先获取
      to: toAddress,
      amount,
      token: networkId // native token
    }]
  });
  
  // 2. 获取 Vault 实例
  const vault = await vaultFactory.getVault({
    networkId,
    accountId: fromAccountId
  });
  
  // 3. 签名交易
  const signedTx = await vault.signTransaction({
    unsignedTx,
    password: await getPassword() // 需要用户输入密码
  });
  
  // 4. 广播交易
  const result = await backgroundApiProxy.serviceSend.broadcastTransaction({
    networkId,
    accountId: fromAccountId,
    signedTx,
    accountAddress: fromAccountAddress
  });
  
  return result.txid;
}
```

### 3. 执行授权交易（子钱包）

```typescript
async function executeWithSubWallet(params: {
  subWalletAccountId: string;
  to: string;
  amount: string;
  networkId: string;
  data?: string; // 合约调用数据
}): Promise<string> {
  // 与 transferToSubWallet 类似，但使用子钱包账户
  const vault = await vaultFactory.getVault({
    networkId: params.networkId,
    accountId: params.subWalletAccountId
  });
  
  const encodedTx = await vault.buildEncodedTx({
    transfersInfo: [{
      from: subWalletAddress,
      to: params.to,
      amount: params.amount,
      token: params.networkId
    }]
  });
  
  const unsignedTx = await vault.buildUnsignedTx({ encodedTx });
  const signedTx = await vault.signTransaction({ unsignedTx });
  
  const result = await backgroundApiProxy.serviceSend.broadcastTransaction({
    networkId: params.networkId,
    accountId: params.subWalletAccountId,
    signedTx,
    accountAddress: subWalletAddress
  });
  
  return result.txid;
}
```

---

## Mode B & C (骨架)

### Mode B: Vault 合约

**概念**: 部署一个智能合约作为"保险箱"，主钱包拥有管理权限

```typescript
// Vault 合约 ABI (简化版)
const VaultContractABI = [
  {
    "name": "execute",
    "type": "function",
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "value", "type": "uint256" },
      { "name": "data", "type": "bytes" }
    ],
    "outputs": [{ "name": "success", "type": "bool" }]
  },
  {
    "name": "owner",
    "type": "function",
    "outputs": [{ "name": "", "type": "address" }]
  }
];

async function deployVault(params: {
  ownerAccountId: string;
  networkId: string;
}): Promise<{ contractAddress: string; txHash: string }> {
  // TODO: 实现合约部署逻辑
  // 1. 编译合约或使用预编译字节码
  // 2. 构建部署交易
  // 3. 签名并广播
  throw new Error('Not implemented - needs contract bytecode');
}

async function executeViaVault(params: {
  vaultAddress: string;
  ownerAccountId: string;
  targetAddress: string;
  amount: string;
  networkId: string;
}): Promise<string> {
  // TODO: 调用 Vault 合约的 execute 方法
  // 1. 编码合约调用
  // 2. 构建交易
  // 3. 签名并广播
  throw new Error('Not implemented');
}
```

### Mode C: AA + Session Key

**概念**: 使用账户抽象 (ERC-4337) + 临时会话密钥

```typescript
async function generateSessionKey(): Promise<{
  privateKey: string;
  publicKey: string;
  address: string;
}> {
  // TODO: 生成临时密钥对
  // OneKey 可能有内置的密钥生成工具
  throw new Error('Not implemented');
}

async function registerSessionKey(params: {
  aaAccountId: string;
  sessionKeyAddress: string;
  permissions: {
    allowedTargets: string[];
    spendingLimit: string;
    validUntil: number;
  };
  networkId: string;
}): Promise<string> {
  // TODO: 调用 AA 账户合约注册 session key
  // 1. 找到 OneKey 的 AA 实现
  // 2. 编码注册调用
  // 3. 签名并广播
  throw new Error('Not implemented - needs OneKey AA integration');
}
```

---

## 密码管理

OneKey 需要用户密码来解锁钱包并签名交易：

```typescript
// 获取密码的方式
import { EReasonForNeedPassword } from '@onekeyhq/shared/types/setting';

async function getPasswordForSigning(): Promise<string> {
  // 方法 1: 通过 UI 弹窗请求
  const password = await backgroundApiProxy.servicePassword.promptPassword({
    reason: EReasonForNeedPassword.SignTransaction
  });
  
  return password;
  
  // 方法 2: 如果已缓存
  // const password = await backgroundApiProxy.servicePassword.getCachedPassword();
}
```

---

## 存储方案

授权数据应该存储在 OneKey 的数据库中：

```typescript
// SimpleDB (推荐)
import { SimpleDbEntityAgentAuthorization } from './simpleDb/entities';

// 在 packages/kit-bg/src/dbs/simple/ 创建新的 Entity
class SimpleDbEntityAgentAuthorization extends SimpleDbEntityBase<IAgentAuthorization> {
  entityName = 'agentAuthorization';
  
  async getByAgentId(agentId: string) {
    return this.getRawData().filter(item => item.agentId === agentId);
  }
}

// 使用
const db = backgroundApiProxy.simpleDb.agentAuthorization;
await db.setRawData([...authorizations, newAuth]);
const auths = await db.getRawData();
```

---

## 总结

### 已找到的关键 API:
1. ✅ **账户创建**: `serviceAccount.addHDNextIndexedAccount()`
2. ✅ **交易构建**: `vault.buildEncodedTx()` → `buildUnsignedTx()`
3. ✅ **交易签名**: `vault.signTransaction()`
4. ✅ **交易广播**: `serviceSend.broadcastTransaction()`
5. ✅ **余额查询**: `serviceToken.fetchAccountTokens()`

### Mode A 可直接实现:
- 创建隔离子钱包 (使用 HD 派生)
- 转账到子钱包
- 子钱包执行交易

### Mode B & C 需要进一步研究:
- **Mode B**: 需要智能合约代码 (可用 Solidity 编写简单的 Vault)
- **Mode C**: 需要找到 OneKey 的 AA 钱包实现（如果有）

### 下一步:
1. 实现 Mode A 的真实逻辑
2. 更新 `executeWithAuthorization()` 连接真实交易
3. 创建 SimpleDB Entity 存储授权数据
4. 为 Mode B 编写简单的 Vault 合约
5. 研究 OneKey 是否支持 AA 钱包
