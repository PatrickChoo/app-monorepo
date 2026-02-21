# Feat: Send Recipient Quick Select - 改动分析与测试计划

## 📌 概述

**分支**: `feat/send-recipient-quick-select`  
**Commit**: `799c9cd70` (2026-02-09)  
**状态**: ✅ 基于最新 `upstream/x`，无 rebase 需求  
**规模**: 83 文件，+6156/-2864 行

---

## 🎯 核心功能

### 收件人快捷选择面板
在发送页面收件人输入框下方添加**三标签快捷选择器**：
1. **Recent transfers** - 最近转账记录
2. **My accounts** - 我的账户列表
3. **Address book** - 地址簿条目

### 附加改进
- ✅ 地址簿移除密码机制（复用 app 解锁密码）
- ✅ 响应式按钮设计（≤375px 显示纯图标）
- ✅ 头像加载优化（修复边框闪烁）
- ✅ 骨架屏加载状态
- ✅ Cosmos/Stellar/Ton 链 memo 支持增强
- ✅ 预加载常用模态框

---

## 📂 主要改动文件

### 1. 新增核心组件

| 文件 | 行数 | 说明 |
|------|-----|------|
| `SendDataInput/RecipientQuickSelect.tsx` | +925 | **快捷选择面板主组件** |
| `SendDataInput/SendAmountInputContainer.tsx` | +1188 | **金额输入容器重构** |
| `AssetDetails/HistoryDetails/components/CosmosTxMeta.tsx` | +27 | Cosmos 交易 memo 显示 |
| `AssetDetails/HistoryDetails/components/StellarTxMeta.tsx` | +27 | Stellar 交易 memo 显示 |
| `AssetDetails/HistoryDetails/components/TonTxMeta.tsx` | +27 | Ton 交易 memo 显示 |

### 2. 重要重构文件

| 文件 | 改动量 | 说明 |
|------|--------|------|
| `SendDataInput/SendDataInputContainer.tsx` | 大幅重构 | 发送数据输入容器，集成快捷选择器 |
| `SendDataInput/RecentRecipients.tsx` | +1001 行 | 最近转账记录逻辑增强 |
| `ServiceAddressBook.ts` | ~508 行 | **地址簿服务重构**（移除密码） |
| `AddressInput/index.tsx` | ~402 行 | 地址输入框增强 |
| `AmountInput/index.tsx` | +353 行 | 金额输入框增强 |
| `AccountAvatar/AccountAvatar.tsx` | ~132 行 | 头像组件优化 |

### 3. 数据层改动

| 文件 | 说明 |
|------|------|
| `SimpleDbEntityAddressBook.ts` | 地址簿实体改动（+25/-） |
| `SimpleDbEntityRecentRecipients.ts` | 最近转账实体重构（+148/-） |
| `LocalDbBase.ts` | 数据库基础类调整 |
| `V4MigrationForAddressBook.ts` | V4 迁移脚本更新 |

### 4. Vault 层改动（Memo 支持）

| 文件 | 改动 |
|------|------|
| `vaults/impls/cosmos/Vault.ts` | +13 行（memo 支持） |
| `vaults/impls/stellar/Vault.ts` | +17 行（memo 支持） |
| `vaults/impls/ton/Vault.ts` | +16 行（memo 支持） |

### 5. 国际化

- **所有 18 种语言文件**: 每个 +30 行左右新翻译 key
- `translations.ts`: +14 行新翻译枚举

---

## ⚠️ 关键风险点

### 1. 地址簿密码移除（🔴 高风险）

**改动**:
- `ServiceAddressBook.ts`: 移除所有密码验证逻辑
- `ServicePassword/index.ts`: 调整密码服务
- `ServiceCloudBackup/index.ts`: 云备份适配

**潜在问题**:
- ❌ V4 升级时旧密码数据处理不当
- ❌ 云备份同步时权限混乱
- ❌ 用户期望地址簿独立保护

**测试重点**:
- 旧版本升级路径（V4 → V5）
- 云备份上传/下载/冲突解决
- 多设备同步一致性

---

### 2. 发送流程重构（🟡 中风险）

**改动**:
- `SendDataInputContainer.tsx`: 大幅重构（逻辑拆分）
- `SendAmountInputContainer.tsx`: 新增独立容器
- `AddressInput/index.tsx`: 集成快捷选择

**潜在问题**:
- ❌ 边缘场景回归（ERC20 / NFT / 多签）
- ❌ 地址验证逻辑遗漏
- ❌ 交易构建参数传递错误

**测试重点**:
- 所有资产类型发送（Token / NFT / Native）
- 所有链类型（EVM / Cosmos / Stellar / Ton / Bitcoin 等）
- 复杂场景（批量发送、替换交易、手续费调整）

---

### 3. Memo 功能扩展（🟡 中风险）

**改动**:
- Cosmos/Stellar/Ton Vault 层添加 memo 支持
- 历史记录组件新增 memo 显示
- 快捷选择器支持 memo 填充

**潜在问题**:
- ❌ Memo 超长导致交易失败
- ❌ Memo 格式验证不严格（如 Stellar 需 Base64）
- ❌ 历史记录 memo 显示缺失

**测试重点**:
- Cosmos IBC 转账 memo
- Stellar 交易 memo（Base64）
- Ton 交易 comment
- 中心化交易所充值（memo 必填）

---

### 4. 数据库实体改动（🟡 中风险）

**改动**:
- `SimpleDbEntityRecentRecipients`: 结构大幅调整（+148/-）
- `SimpleDbEntityAddressBook`: 字段调整（+25/-）

**潜在问题**:
- ❌ 旧数据迁移脚本缺失
- ❌ 索引性能下降
- ❌ 数据类型不兼容

**测试重点**:
- 数据库升级测试（旧版 → 新版）
- 大数据量性能测试（1000+ 历史记录）
- 并发写入测试

---

### 5. 响应式设计（🟢 低风险）

**改动**:
- `AddressInput`: ≤375px 显示纯图标按钮
- `AccountAvatar`: 边框闪烁修复

**潜在问题**:
- ⚠️ 小屏设备点击区域过小
- ⚠️ 图标不够直观

**测试重点**:
- iPhone SE (375px)
- 小屏 Android 设备
- 横屏模式

---

### 6. 性能影响（🟢 低风险）

**改动**:
- 预加载模态框（`LazyLoadPage`）
- 新增大量查询逻辑

**潜在问题**:
- ⚠️ 初次加载时间增加
- ⚠️ 内存占用上升

**测试重点**:
- 弱网环境加载速度
- 大地址簿/历史记录性能
- 内存占用测试

---

## 🧪 测试计划

### Phase 1: 核心功能验证（P0）

#### 1.1 快捷选择面板 - 基础交互
- [ ] 输入框下方正确显示三标签面板
- [ ] 点击标签切换内容（Recent / My accounts / Address book）
- [ ] 点击列表项正确填充地址到输入框
- [ ] 点击列表项正确填充 memo（如有）
- [ ] 清空输入后面板仍可正常使用

#### 1.2 Recent Transfers 标签
- [ ] 空状态显示正确提示文案
- [ ] 骨架屏加载正确显示
- [ ] 最近转账按时间倒序排列
- [ ] 同地址不重复显示（去重正确）
- [ ] 跨链转账历史正确显示（链图标 + 网络名）
- [ ] Memo 正确显示和填充

#### 1.3 My Accounts 标签
- [ ] 显示当前网络所有账户
- [ ] 派生类型标签正确显示（BIP44 / Native SegWit / Ledger Live 等）
- [ ] 不显示当前发送账户
- [ ] EVM 链账户跨链正确处理（Ethereum / BSC / Polygon 等）
- [ ] 账户余额显示（如实现）

#### 1.4 Address Book 标签
- [ ] 显示当前网络地址簿条目
- [ ] 空状态显示"添加地址"按钮
- [ ] 点击快捷进入地址簿编辑页面
- [ ] 网络筛选正确（只显示兼容地址）
- [ ] Memo 正确显示和填充
- [ ] 标签/备注正确显示

#### 1.5 搜索与过滤
- [ ] 输入地址/名称时三个标签实时过滤
- [ ] 匹配项高亮显示
- [ ] 所有标签无匹配时显示空状态
- [ ] 搜索不区分大小写
- [ ] 清空搜索后恢复完整列表

---

### Phase 2: 地址簿密码移除验证（P0）

#### 2.1 基础流程
- [ ] App 解锁后可直接访问地址簿（无二次密码）
- [ ] 添加新地址无密码提示
- [ ] 编辑地址无密码提示
- [ ] 删除地址无密码提示
- [ ] 批量操作无密码提示

#### 2.2 云备份同步
- [ ] 地址簿变更正常上传云端
- [ ] 恢复备份时地址簿完整恢复
- [ ] 多设备修改时冲突处理正确
- [ ] 离线修改后联网同步正确

#### 2.3 V4 → V5 升级测试
- [ ] **关键**: 旧版本地址簿数据完整迁移
- [ ] 旧密码配置正确清理
- [ ] 升级后第一次访问无报错
- [ ] 降级到 V4 不崩溃（数据只读或降级提示）

#### 2.4 安全验证
- [ ] App 锁屏后地址簿锁定
- [ ] 生物识别解锁后可访问
- [ ] 密码错误不允许访问

---

### Phase 3: 发送流程回归测试（P0）

#### 3.1 Native Token 发送
- [ ] Bitcoin (Legacy / SegWit / Taproot)
- [ ] Ethereum
- [ ] Cosmos (IBC 转账)
- [ ] Stellar (带 memo)
- [ ] Ton (带 comment)
- [ ] BSC / Polygon / Avalanche

#### 3.2 ERC20 / SPL Token 发送
- [ ] Ethereum ERC20
- [ ] BSC BEP20
- [ ] Solana SPL Token

#### 3.3 NFT 发送
- [ ] ERC721
- [ ] ERC1155

#### 3.4 复杂场景
- [ ] 批量发送
- [ ] 替换交易（Replace by Fee）
- [ ] 手续费自定义
- [ ] 多签钱包发送
- [ ] 硬件钱包签名

#### 3.5 Memo 场景
- [ ] Cosmos memo 必填（交易所充值）
- [ ] Stellar memo 可选
- [ ] Ton comment 可选
- [ ] Memo 超长验证（如 Stellar 28 字节限制）

---

### Phase 4: UI & 响应式测试（P1）

#### 4.1 小屏设备（≤375px）
- [ ] iPhone SE (375x667)
- [ ] iPhone SE 3rd (375x667)
- [ ] 小屏 Android (360x640)
- [ ] 按钮图标清晰易识别
- [ ] 点击区域 ≥44x44px
- [ ] 布局无溢出/重叠

#### 4.2 大屏设备
- [ ] iPhone 15 Pro Max (430x932)
- [ ] iPad (768x1024)
- [ ] Android 平板
- [ ] 内容不过度拉伸

#### 4.3 头像加载
- [ ] 头像加载前显示占位背景
- [ ] 加载完成无边框闪烁
- [ ] borderRadius 正确应用
- [ ] 地址色块头像正确生成

#### 4.4 骨架屏
- [ ] 骨架屏结构与实际内容匹配
- [ ] 加载动画流畅（60fps）
- [ ] 加载 >500ms 才显示骨架屏（避免闪烁）
- [ ] 加载完成后平滑过渡

---

### Phase 5: 性能与压力测试（P1）

#### 5.1 大数据量
- [ ] 1000+ 历史转账记录（滚动流畅）
- [ ] 100+ 地址簿条目（加载正常）
- [ ] 50+ 账户（列表无卡顿）
- [ ] 搜索延迟 <200ms

#### 5.2 弱网环境
- [ ] 3G 网络（骨架屏正常，无白屏）
- [ ] 请求超时显示错误提示
- [ ] 支持手动刷新
- [ ] 离线缓存可用

#### 5.3 内存与性能
- [ ] 内存占用无异常增长
- [ ] CPU 使用率正常（搜索时 <30%）
- [ ] 电量消耗无异常
- [ ] 后台无内存泄漏

---

### Phase 6: 边缘场景与错误处理（P2）

#### 6.1 网络兼容性
- [ ] Bitcoin 地址格式验证（bc1 / 3 / 1 开头）
- [ ] EVM 地址通用性（0x 开头）
- [ ] Cosmos 地址验证（Bech32）
- [ ] Stellar 地址验证（G 开头）
- [ ] Solana 地址验证（Base58）

#### 6.2 异常处理
- [ ] 地址簿数据库损坏（降级处理）
- [ ] 网络请求失败（Toast 提示）
- [ ] 并发修改冲突（乐观锁或提示）
- [ ] 交易构建失败（错误信息清晰）

#### 6.3 安全场景
- [ ] 地址验证不可绕过
- [ ] 恶意地址黑名单检查
- [ ] XSS 防注入（memo / name 字段）
- [ ] 地址簿导入数据验证

---

### Phase 7: 国际化与可访问性（P2）

#### 7.1 多语言（18 种语言）
- [ ] 英语 (en_US)
- [ ] 中文简体 (zh_CN)
- [ ] 中文繁体 (zh_TW / zh_HK)
- [ ] 日语 (ja_JP)
- [ ] 韩语 (ko_KR)
- [ ] 其他 13 种语言（抽查）

#### 7.2 超长文本
- [ ] 地址簿名称超长（省略显示）
- [ ] 地址超长（中间截断）
- [ ] Memo 超长（换行或截断）
- [ ] 翻译文案超长不破坏布局

#### 7.3 可访问性
- [ ] VoiceOver (iOS) 列表项可朗读
- [ ] TalkBack (Android) 按钮标签正确
- [ ] 键盘导航（桌面端 Tab 切换）
- [ ] 颜色对比度符合 WCAG 2.1 AA

---

## 📋 发布前检查清单

### Code Quality
- [ ] TypeScript 类型完整无 `any`
- [ ] ESLint 无错误
- [ ] 无 console.log 残留
- [ ] 代码符合 OneKey 规范

### Testing
- [ ] Phase 1-3 (P0) 全部通过
- [ ] Phase 4-5 (P1) 全部通过
- [ ] Phase 6-7 (P2) 抽查通过
- [ ] 单元测试通过（如有）
- [ ] E2E 测试通过（如有）

### Documentation
- [ ] 用户指南更新（如需）
- [ ] 开发者文档更新
- [ ] Changelog 记录完整
- [ ] Migration guide 完善

### Compatibility
- [ ] iOS 14+
- [ ] Android 8+
- [ ] Desktop (Electron)
- [ ] Web (Chrome / Safari / Firefox)

---

## 🔥 高风险清单（必须验证）

1. ✅ **V4 升级测试** - 旧地址簿数据迁移
2. ✅ **云备份同步** - 多设备一致性
3. ✅ **发送流程回归** - 所有链 + 所有资产类型
4. ✅ **Memo 功能** - 中心化交易所充值
5. ✅ **数据库性能** - 大数据量压力测试

---

## 📞 协作信息

- **分支**: `feat/send-recipient-quick-select`
- **维护者**: Patrick Choo
- **状态**: ✅ 已同步最新 upstream/x
- **下一步**: 等待 Code Review & QA 测试

---

*文档版本: 2.0 | 更新时间: 2026-02-21 04:01 UTC+8*
