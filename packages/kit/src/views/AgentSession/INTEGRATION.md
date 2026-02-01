# Agent Session UI Integration Guide

## ✅ 已完成的工作

### 1. 授权确认弹窗组件 (1Password 风格)
**位置**: `packages/kit/src/views/AgentSession/components/`

创建了以下组件：
- ✅ **AuthorizationModal.tsx** - 主弹窗组件
  - 显示请求来源 (AI Agent)
  - 显示操作详情 (链、动作、金额)
  - 显示选择的模式 (A/B/C) 及说明
  - 确认/拒绝按钮
  - 生物识别确认选项

- ✅ **AuthorizationDetails.tsx** - 详情展示组件
  - 显示授权请求的详细信息
  - 包括网络、金额、限制、过期时间等

- ✅ **ModeExplanation.tsx** - 模式说明组件
  - 为三种模式提供详细说明
  - 包括优点和安全级别说明

### 2. 授权状态管理 (Jotai)
**位置**: `packages/kit/src/views/AgentSession/states/`

创建了：
- ✅ **atoms.ts** - 状态管理
  - `activeAuthorizationsAtom` - 当前活跃的授权列表
  - `pendingAuthorizationRequestAtom` - 待确认的请求
  - `authorizationHistoryAtom` - 历史记录
  - `authorizationsByModeAtom` - 按模式分组的授权
  - `totalAmountsAtom` - 总金额统计

### 3. 授权列表页面
**位置**: `packages/kit/src/views/AgentSession/pages/`

创建了：
- ✅ **AuthorizationListPage.tsx** - 授权列表页
  - 显示活跃授权
  - 显示总览统计卡片
  - 列表项展示关键信息

- ✅ **AuthorizationDetailPage.tsx** - 授权详情页
  - 显示授权的完整信息
  - 支持撤销授权
  - 支持充值 (Mode A)
  - 显示花费进度条

### 4. 路由注册
**已更新文件**:
- ✅ `packages/shared/src/routes/tabAgentSession.ts` - 添加了授权列表路由
- ✅ `packages/kit/src/routes/Tab/AgentSession/router.ts` - 注册了页面组件

### 5. Provider 组件
- ✅ **AgentSessionProvider.tsx** - Jotai 上下文提供者

---

## 🔧 待集成的工作

### 1. 在应用根部添加 Provider

**需要修改**: 应用的根组件 (通常在 `App.tsx` 或主 Navigator)

**添加**:
```tsx
import { AgentSessionProvider } from './views/AgentSession/AgentSessionProvider';

// 在组件树中包裹:
<AgentSessionProvider>
  {/* 现有的应用内容 */}
</AgentSessionProvider>
```

### 2. 在设置页面添加 "AI Agent Authorization" 入口

**需要修改**: `packages/kit/src/views/Setting/pages/Tab/config.tsx`

**在 `useSettingsConfig` 的返回数组中添加新的配置项**:

```tsx
{
  name: ESettingsTabNames.AgentSession, // 需要在 ESettingsTabNames 中添加
  icon: 'RobotOutline', // 或其他合适的机器人图标
  title: intl.formatMessage({ id: ETranslations.settings_ai_agent_authorization }),
  configs: [
    [
      {
        icon: 'RobotOutline',
        title: intl.formatMessage({ id: ETranslations.settings_manage_ai_agents }),
        subtitle: intl.formatMessage({ id: ETranslations.settings_manage_ai_agents_desc }),
        onPress: (navigation) => {
          // 导航到授权列表页
          navigation?.pushTab(ETabRoutes.AgentSession, {
            screen: ETabAgentSessionRoutes.TabAuthorizationList,
          });
        },
      },
      {
        icon: 'FileListOutline',
        title: intl.formatMessage({ id: ETranslations.settings_view_demo_scenarios }),
        onPress: (navigation) => {
          navigation?.pushTab(ETabRoutes.AgentSession, {
            screen: ETabAgentSessionRoutes.TabDemoScenarios,
          });
        },
      },
    ],
  ],
},
```

### 3. 添加国际化翻译

**需要修改**: 
- `packages/shared/src/locale/en-US.json` (及其他语言文件)

**添加翻译键**:
```json
{
  "settings_ai_agent_authorization": "AI Agent Authorization",
  "settings_manage_ai_agents": "Manage AI Agents",
  "settings_manage_ai_agents_desc": "Control AI agent permissions and spending limits",
  "settings_view_demo_scenarios": "Demo Scenarios",
  // ... 其他需要的翻译
}
```

### 4. 连接 Skill 代码与 UI

**需要在 Skill 代码中**:

在 `packages/kit/src/views/AgentSession/skills/index.ts` 中:

```tsx
import { useSetAtom } from 'jotai';
import { pendingAuthorizationRequestAtom } from '../states/atoms';

// 在授权流程中:
export const requestAuthorization = async (request: IAgentAuthorizationRequest) => {
  // 使用 Jotai 设置待确认的请求
  const setPendingRequest = useSetAtom(pendingAuthorizationRequestAtom);
  setPendingRequest(request);
  
  // 显示 AuthorizationModal
  // ... 等待用户确认
  
  return result;
};
```

### 5. 实现授权确认的实际调用

**在需要触发授权的地方** (如 Dashboard 或 Demo 页面):

```tsx
import { useState } from 'react';
import { AuthorizationModal } from '../components';
import { usePendingAuthorizationRequestAtom } from '../states/atoms';

function YourComponent() {
  const [pendingRequest, setPendingRequest] = usePendingAuthorizationRequestAtom();
  const [modalVisible, setModalVisible] = useState(false);
  
  const handleConfirm = async ({ useBiometric, selectedMode }) => {
    // 调用实际的授权逻辑
    await createAuthorization(pendingRequest, selectedMode, useBiometric);
    setPendingRequest(null);
    setModalVisible(false);
  };
  
  const handleReject = () => {
    setPendingRequest(null);
    setModalVisible(false);
  };
  
  return (
    <>
      {/* 你的页面内容 */}
      {pendingRequest && (
        <AuthorizationModal
          request={pendingRequest}
          visible={modalVisible}
          onConfirm={handleConfirm}
          onReject={handleReject}
        />
      )}
    </>
  );
}
```

### 6. 更新 ESettingsTabNames 枚举

**需要修改**: `packages/kit/src/views/Setting/pages/Tab/config.tsx`

在 `ESettingsTabNames` 中添加:
```tsx
export enum ESettingsTabNames {
  // ... 现有的枚举值
  AgentSession = 'AgentSession',
}
```

---

## 📝 设计疑问和建议

### 1. 导航方式
- **疑问**: 从设置页面跳转到授权列表，应该使用哪种导航方式？
  - Option A: 作为 Tab 导航 (已实现)
  - Option B: 作为 Modal 导航
- **建议**: 当前实现使用 Tab 导航，但如果需要 Modal 方式，需要创建对应的 Modal 路由

### 2. 授权存储
- **疑问**: 授权数据应该存储在哪里？
  - Option A: 本地 AsyncStorage/MMKV
  - Option B: OneKey 的 IndexedDB (通过 backgroundApiProxy)
- **建议**: 使用 backgroundApiProxy 的数据库服务，保持与 OneKey 架构一致

### 3. 生物识别集成
- **当前状态**: UI 已支持生物识别选项开关
- **待实现**: 实际的生物识别调用 (可参考现有的 `useBiometricAuthInfo` hook)

### 4. 图标选择
- **疑问**: OneKey 组件库中有哪些可用的机器人/AI 相关图标？
- **当前使用**: 文本 emoji (🤖, ⛓️, 💰 等)
- **建议**: 替换为 OneKey 组件库的正式图标

### 5. 错误处理
- **待实现**: 
  - 授权失败的错误提示
  - 网络错误处理
  - 表单验证

---

## 🚀 下一步操作清单

1. ✅ 完成所有组件和状态管理代码
2. ✅ 注册路由
3. ⬜ 在应用根部添加 `AgentSessionProvider`
4. ⬜ 在设置页面添加入口
5. ⬜ 添加国际化翻译
6. ⬜ 连接 Skill 代码与 UI
7. ⬜ 实现授权数据的持久化存储
8. ⬜ 实现生物识别确认
9. ⬜ 添加错误处理和边界情况
10. ⬜ 测试所有流程

---

## 📦 文件清单

### 新建文件:
```
packages/kit/src/views/AgentSession/
├── components/
│   ├── AuthorizationModal.tsx       ✅
│   ├── AuthorizationDetails.tsx     ✅
│   ├── ModeExplanation.tsx          ✅
│   └── index.ts                     ✅
├── states/
│   └── atoms.ts                     ✅
├── pages/
│   ├── AuthorizationListPage.tsx    ✅
│   ├── AuthorizationDetailPage.tsx  ✅
│   └── index.ts                     ✅
├── AgentSessionProvider.tsx         ✅
└── INTEGRATION.md                   ✅
```

### 修改文件:
```
packages/shared/src/routes/tabAgentSession.ts              ✅
packages/kit/src/routes/Tab/AgentSession/router.ts        ✅
packages/kit/src/views/Setting/pages/Tab/config.tsx       ⬜ (待修改)
```

---

## 🔍 代码示例参考

如需查看如何使用这些组件，可以参考:
- **Modal 使用**: `packages/kit/src/views/DAppConnection/pages/SignMessageModal.tsx`
- **Jotai 状态**: `packages/kit/src/states/jotai/contexts/demo/atoms.ts`
- **设置配置**: `packages/kit/src/views/Setting/pages/Tab/config.tsx`
- **路由配置**: `packages/kit/src/routes/Tab/AgentSession/router.ts`
