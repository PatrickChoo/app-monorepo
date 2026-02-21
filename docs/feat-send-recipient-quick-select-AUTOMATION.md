# 快捷选择器功能 - 自动化测试方案

## 📋 测试框架概览

### 当前项目测试架构
```
OneKey App Monorepo
├── Jest (单元测试)
│   ├── packages/core - ✅ 68 个测试文件
│   ├── packages/secret - ✅ 加密逻辑测试
│   └── packages/kit - ⚠️ UI 组件无测试
│
├── Detox (E2E 测试)
│   └── apps/mobile/e2e - 🔍 待确认配置
│
└── 手动测试
    └── 复杂 UI 交互和业务流程
```

---

## 🎯 针对本 PR 的自动化测试策略

### Phase 1: 后端逻辑单元测试（可立即执行）

#### 1.1 地址簿服务测试

创建文件: `packages/kit-bg/src/services/__tests__/ServiceAddressBook.test.ts`

```typescript
import { ServiceAddressBook } from '../ServiceAddressBook';
import type { IAddressItem } from '@onekeyhq/shared/types/address';

describe('ServiceAddressBook - Password Removal', () => {
  let service: ServiceAddressBook;

  beforeEach(() => {
    // 初始化 mock backgroundApi
    service = new ServiceAddressBook({ 
      backgroundApi: mockBackgroundApi 
    });
  });

  test('添加地址无需密码验证', async () => {
    const newAddress: IAddressItem = {
      id: 'test-1',
      name: 'Test Address',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      networkId: 'evm--1',
    };

    // 应该成功，无需传 password 参数
    await expect(
      service.addItem(newAddress)
    ).resolves.not.toThrow();
  });

  test('更新地址列表无 hash 验证', async () => {
    const items: IAddressItem[] = [
      { id: '1', name: 'Addr 1', address: '0xabc...', networkId: 'evm--1' },
      { id: '2', name: 'Addr 2', address: '0xdef...', networkId: 'evm--1' },
    ];

    // setItems 不再需要 password
    await service.setItems({ items });

    const retrieved = await service.getItems();
    expect(retrieved).toHaveLength(2);
  });

  test('删除地址无密码检查', async () => {
    await expect(
      service.removeItem({ id: 'test-1' })
    ).resolves.not.toThrow();
  });
});
```

#### 1.2 最近转账记录实体测试

创建文件: `packages/kit-bg/src/dbs/simple/entity/__tests__/SimpleDbEntityRecentRecipients.test.ts`

```typescript
import { SimpleDbEntityRecentRecipients } from '../SimpleDbEntityRecentRecipients';

describe('SimpleDbEntityRecentRecipients', () => {
  let entity: SimpleDbEntityRecentRecipients;

  beforeEach(() => {
    entity = new SimpleDbEntityRecentRecipients();
  });

  test('保存最近转账记录', async () => {
    const recipient = {
      address: '0x123...',
      networkId: 'evm--1',
      timestamp: Date.now(),
    };

    await entity.addRecipient(recipient);

    const recent = await entity.getRecentRecipients({ networkId: 'evm--1' });
    expect(recent).toContainEqual(expect.objectContaining(recipient));
  });

  test('按时间倒序排列', async () => {
    const now = Date.now();
    await entity.addRecipient({ address: '0xaaa', timestamp: now - 1000 });
    await entity.addRecipient({ address: '0xbbb', timestamp: now });

    const recent = await entity.getRecentRecipients({ networkId: 'evm--1' });
    
    // 最新的在最前
    expect(recent[0].address).toBe('0xbbb');
    expect(recent[1].address).toBe('0xaaa');
  });

  test('去重相同地址', async () => {
    const address = '0x123...';
    await entity.addRecipient({ address, timestamp: 1000 });
    await entity.addRecipient({ address, timestamp: 2000 });

    const recent = await entity.getRecentRecipients({ networkId: 'evm--1' });
    
    // 应该只保留最新的那条
    expect(recent.filter(r => r.address === address)).toHaveLength(1);
    expect(recent[0].timestamp).toBe(2000);
  });
});
```

#### 1.3 Memo 功能测试

创建文件: `packages/kit-bg/src/vaults/impls/__tests__/cosmos-memo.test.ts`

```typescript
import { VaultCosmos } from '../cosmos/Vault';

describe('Cosmos Vault - Memo Support', () => {
  let vault: VaultCosmos;

  test('构建带 memo 的转账交易', async () => {
    const tx = await vault.buildTransferTx({
      to: 'cosmos1...',
      amount: '1000000',
      memo: 'Deposit to Binance #123456',
    });

    expect(tx.memo).toBe('Deposit to Binance #123456');
  });

  test('Memo 为空时不包含 memo 字段', async () => {
    const tx = await vault.buildTransferTx({
      to: 'cosmos1...',
      amount: '1000000',
    });

    expect(tx.memo).toBeUndefined();
  });

  test('Memo 超长时抛出错误', async () => {
    const longMemo = 'A'.repeat(257); // Cosmos memo 限制 256 字节

    await expect(
      vault.buildTransferTx({
        to: 'cosmos1...',
        amount: '1000000',
        memo: longMemo,
      })
    ).rejects.toThrow('Memo too long');
  });
});
```

---

### Phase 2: 集成测试（需手动或 E2E）

由于 OneKey 的 UI 组件测试覆盖率较低，这些场景**建议人工测试**或写 E2E：

#### 2.1 快捷选择器 UI 交互（Detox E2E）

创建文件: `apps/mobile/e2e/send-recipient-quick-select.test.ts`

```typescript
describe('Send - Recipient Quick Select', () => {
  beforeAll(async () => {
    await device.launchApp();
    await loginToApp(); // 辅助函数
  });

  it('应该显示三个标签', async () => {
    await navigateToSendPage();

    await expect(element(by.id('quick-select-tab-recent'))).toBeVisible();
    await expect(element(by.id('quick-select-tab-account'))).toBeVisible();
    await expect(element(by.id('quick-select-tab-addressBook'))).toBeVisible();
  });

  it('点击 My Accounts 标签应显示账户列表', async () => {
    await element(by.id('quick-select-tab-account')).tap();

    // 应该显示至少一个账户
    await expect(
      element(by.id('account-list')).atIndex(0)
    ).toBeVisible();
  });

  it('选择地址后应填充到输入框', async () => {
    await element(by.id('quick-select-tab-account')).tap();
    await element(by.id('account-item-0')).tap();

    const input = element(by.id('recipient-address-input'));
    await expect(input).toHaveText(/0x[a-fA-F0-9]{40}/); // 验证 ETH 地址格式
  });

  it('搜索应实时过滤列表', async () => {
    const searchInput = element(by.id('recipient-address-input'));
    
    await searchInput.typeText('Test');

    // 只显示匹配 "Test" 的项
    await expect(element(by.text('Test Address'))).toBeVisible();
    await expect(element(by.text('Other Address'))).not.toBeVisible();
  });
});
```

#### 2.2 发送流程回归测试（E2E）

```typescript
describe('Send Flow Regression', () => {
  it('使用快捷选择器完成完整发送流程', async () => {
    await navigateToSendPage();

    // 1. 选择 Token
    await element(by.id('token-selector')).tap();
    await element(by.text('USDT')).tap();

    // 2. 使用快捷选择器选择收件人
    await element(by.id('quick-select-tab-addressBook')).tap();
    await element(by.id('address-book-item-0')).tap();

    // 3. 输入金额
    await element(by.id('amount-input')).typeText('10');

    // 4. 确认交易
    await element(by.id('send-confirm-button')).tap();

    // 5. 验证交易详情
    await expect(element(by.text('Confirm Transaction'))).toBeVisible();
    await expect(element(by.text('10 USDT'))).toBeVisible();
  });

  it('Cosmos 链带 memo 发送', async () => {
    await switchToNetwork('Cosmos');
    await navigateToSendPage();

    // 选择带 memo 的地址簿条目
    await element(by.id('quick-select-tab-addressBook')).tap();
    await element(by.text('Binance Deposit')).tap();

    // 验证 memo 已自动填充
    await expect(
      element(by.id('memo-input'))
    ).toHaveText('123456');
  });
});
```

---

### Phase 3: 视觉回归测试（可选）

使用工具: `jest-image-snapshot` 或 `Detox Screenshot`

```typescript
import { toMatchImageSnapshot } from 'jest-image-snapshot';

expect.extend({ toMatchImageSnapshot });

describe('Visual Regression', () => {
  it('快捷选择器布局快照', async () => {
    await navigateToSendPage();

    const screenshot = await takeScreenshot('quick-select-panel');
    
    expect(screenshot).toMatchImageSnapshot({
      failureThreshold: 0.01, // 1% 差异容忍度
      failureThresholdType: 'percent',
    });
  });

  it('小屏设备响应式布局', async () => {
    await device.setOrientation('portrait');
    await setDeviceScreenSize(375, 667); // iPhone SE

    const screenshot = await takeScreenshot('quick-select-small-screen');
    expect(screenshot).toMatchImageSnapshot();
  });
});
```

---

## 🚀 执行自动化测试

### 方法 1: 运行现有单元测试

```bash
# 全部测试
cd /Users/patrick/onekey-app
yarn test

# 只测试 core 链逻辑（已有 68 个测试）
yarn test packages/core

# 只测试加密模块
yarn test packages/secret

# 生成覆盖率报告
yarn test --coverage
```

### 方法 2: 添加新的后端逻辑测试

```bash
# 1. 创建测试文件（见上述 Phase 1 示例）

# 2. 运行新测试
yarn test packages/kit-bg/src/services/__tests__

# 3. Watch 模式（开发时）
yarn test --watch ServiceAddressBook.test.ts
```

### 方法 3: 运行 E2E 测试（如果已配置 Detox）

```bash
# iOS
cd apps/mobile
yarn detox build --configuration ios.sim.debug
yarn detox test --configuration ios.sim.debug

# Android
yarn detox build --configuration android.emu.debug
yarn detox test --configuration android.emu.debug
```

---

## 📊 测试覆盖率目标

| 测试类型 | 当前覆盖率 | 目标覆盖率 | 优先级 |
|---------|-----------|----------|--------|
| **后端逻辑** | ❓ | 80%+ | 🔴 P0 |
| **数据库实体** | ❓ | 70%+ | 🔴 P0 |
| **Vault 层** | ✅ 已有 | 保持 | 🟡 P1 |
| **UI 组件** | ❌ 0% | 60%+ (E2E) | 🟡 P1 |
| **集成流程** | ❌ 0% | 80%+ (E2E) | 🔴 P0 |

---

## ⚡ 快速开始（5 分钟）

### Step 1: 验证测试环境
```bash
cd /Users/patrick/onekey-app

# 检查 Jest 是否正常
yarn test --listTests | head -10

# 运行一个已有测试（验证环境）
yarn test packages/core/src/secret/index.test.ts
```

### Step 2: 添加关键后端测试
```bash
# 创建测试目录
mkdir -p packages/kit-bg/src/services/__tests__

# 复制上述 ServiceAddressBook.test.ts 模板
# 编辑并调整 mock 数据

# 运行测试
yarn test ServiceAddressBook.test.ts
```

### Step 3: 查看测试报告
```bash
# 生成 HTML 报告
yarn test --coverage

# 报告位置（根据 jest.config.js）
open test-report.html
```

---

## 🎯 本 PR 推荐的测试优先级

### 立即执行（30分钟）
1. ✅ 运行现有测试确保无回归
   ```bash
   yarn test
   ```

2. ✅ 添加 `ServiceAddressBook` 核心逻辑测试
   - 重点：密码移除后的数据完整性

3. ✅ 添加 `SimpleDbEntityRecentRecipients` 测试
   - 重点：去重、排序、memo 保存

### 后续补充（1-2天）
4. 🔄 编写 E2E 测试（如果有 Detox）
   - 快捷选择器交互
   - 完整发送流程

5. 🔄 视觉回归测试（可选）
   - 响应式布局截图对比

---

## 🛠️ 常见问题

### Q1: Jest 测试运行失败怎么办？
```bash
# 清理缓存
yarn jest --clearCache

# 更新依赖
yarn install

# 单独运行失败的测试（带详细日志）
yarn test --verbose <test-file>
```

### Q2: Mock `backgroundApiProxy` 怎么写？
```typescript
const mockBackgroundApi = {
  simpleDb: {
    addressBook: {
      updateItems: jest.fn(),
      getItems: jest.fn().mockResolvedValue([]),
    },
  },
  servicePassword: {
    checkPasswordSet: jest.fn().mockResolvedValue(true),
  },
};
```

### Q3: E2E 测试找不到元素怎么办？
在 React Native 组件中添加 `testID`:
```tsx
<ListItem 
  testID={`recipient-item-${item.address}`}
  onPress={onPress}
/>
```

---

## 📋 测试完成检查清单

在发布前确认：

### 自动化测试
- [ ] 所有现有单元测试通过（`yarn test`）
- [ ] 新增后端逻辑测试覆盖率 >70%
- [ ] E2E 关键流程测试通过（如果有）
- [ ] 无新的 TypeScript 错误
- [ ] 无新的 ESLint 错误

### 手动测试（见 ANALYSIS.md）
- [ ] Phase 1-3 (P0) 完成
- [ ] Phase 4-5 (P1) 完成
- [ ] 边缘场景抽查完成

---

## 📞 需要帮助？

- **Jest 文档**: https://jestjs.io/docs/getting-started
- **Detox 文档**: https://wix.github.io/Detox/
- **React Native Testing**: https://reactnative.dev/docs/testing-overview

---

*文档版本: 1.0 | 生成时间: 2026-02-21 04:26 UTC+8*
