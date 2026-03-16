# react-native-applink

跨 App 共享状态与方法调用的 React Native 库（仅 Android）。

基于 **AIDL / Binder** 实现高性能进程间通信，通过 **ContentProvider** 实现零启动服务发现，封装成 React Hooks，让多个 App 之间共享状态和调用方法像在同一个项目里使用 `useState` 一样简单。

## 核心特性

- **`useSharedState`** — 跨 App 的 `useState`，任何 App 可读写同一状态
- **`useSharedMethod`** — 注册一个可被其他 App 远程调用的方法
- **`useRemoteMethod`** — 调用另一个 App 注册的方法，获取返回值
- **`useDiscovery`** — 发现已安装的生态 App 及其能力列表
- **签名证书校验** — 仅相同签名的 App 可通信，天然安全
- **自动拉起** — 目标 App 未启动时自动启动并完成调用
- **零原生代码** — 使用方无需编写任何 Java/Kotlin 代码

## 安装

```bash
npm install @xiaoxianthis/react-native-applink
# 或
yarn add @xiaoxianthis/react-native-applink
```

React Native 0.60+ 自动链接，无需手动 link。

## 前置条件

> **所有参与通信的 App 必须使用同一个签名证书（keystore）打包。**
> 这是安全机制的基础——库会在运行时校验调用方的签名证书是否与自身一致。
> 开发阶段所有 App 默认使用 `debug.keystore`，无需额外配置。

- Android 7.0+（API 24+）
- React Native 0.60+

## 快速开始

### 1. 包裹 Provider

在每个 App 的根组件中：

```jsx
import { AppLinkProvider } from '@xiaoxianthis/react-native-applink';

function App() {
  return (
    <AppLinkProvider appId="main">
      <YourApp />
    </AppLinkProvider>
  );
}
```

`appId` 仅用于标识，不影响通信路由。

### 2. 共享状态

```jsx
import { useSharedState } from '@xiaoxianthis/react-native-applink';

// ---- App A（状态提供者，传入默认值即注册为所有者）----
function UserScreen() {
  const [token, setToken, ready] = useSharedState('auth.token', '');

  return ready ? <Text>{token}</Text> : <Loading />;
}

// ---- App B（状态消费者，不传默认值即自动订阅远端）----
function RemoteUserInfo() {
  const [token, setToken, ready] = useSharedState('auth.token');
  //     ↑ 值来自 App A        ↑ 可远程修改 App A 的值

  return ready ? <Text>Token: {token}</Text> : <Loading />;
}
```

- 传入 `defaultValue` → 注册为该状态的 **所有者**
- 不传 `defaultValue` → 自动发现并 **订阅** 远端所有者
- `setToken` 可跨 App 修改值，所有订阅方实时收到更新
- `ready` 表示初始值是否已加载

### 3. 共享方法

```jsx
import { useSharedMethod, useRemoteMethod } from '@xiaoxianthis/react-native-applink';

// ---- App A（方法提供者）----
function ScannerScreen() {
  useSharedMethod('scanner.scan', async (params) => {
    const result = await startQRScan(params.type);
    return { data: result };
  });

  return <CameraView />;
}

// ---- App B（方法调用者）----
function OrderScreen() {
  const scan = useRemoteMethod('scanner.scan');

  const handleScan = async () => {
    const result = await scan({ type: 'qr' });
    console.log('扫码结果:', result.data);
  };

  return <Button onPress={handleScan} title="扫码" />;
}
```

- 如果 App A 没有启动，调用时会自动拉起
- 方法支持异步，返回值自动序列化传输
- 超时默认 15 秒

### 4. 发现已安装的 App

```jsx
import { useDiscovery } from '@xiaoxianthis/react-native-applink';

function EcosystemScreen() {
  const { apps, initialized, refresh } = useDiscovery();

  return (
    <FlatList
      data={apps}
      renderItem={({ item }) => (
        <View>
          <Text>{item.appName}</Text>
          <Text>状态: {item.states.join(', ')}</Text>
          <Text>方法: {item.methods.join(', ')}</Text>
        </View>
      )}
    />
  );
}
```

## 架构总览

```
┌──────────────────────────────────────────────────────────────┐
│  JS Layer (React Hooks)                                      │
│                                                              │
│  useSharedState ──→ AppLinkProvider ──→ NativeAppLink         │
│  useSharedMethod     (Context + Event Bus)                   │
│  useRemoteMethod                                             │
│  useDiscovery                                                │
├──────────────────────────────────────────────────────────────┤
│  Native Bridge (AppLinkModule)                               │
│                                                              │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────────┐   │
│  │ StateStore   │  │ MethodHandler │  │ ConnectionManager│   │
│  │ (SharedPref) │  │ (Future+Event)│  │ (Binder Pool)   │   │
│  └─────────────┘  └───────────────┘  └──────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│  IPC Layer                                                   │
│                                                              │
│  ContentProvider ─── 服务发现（App 未启动也可查询）            │
│  AIDL Service    ─── 状态读写 / 方法调用 / 订阅推送           │
│  SecurityVerifier ── 签名证书校验                             │
└──────────────────────────────────────────────────────────────┘
```

## API 参考

### `<AppLinkProvider appId="string">`

| Prop | 类型 | 说明 |
|------|------|------|
| `appId` | `string` | 当前 App 标识（仅用于日志/调试） |

### `useSharedState(key, defaultValue?)`

| 参数 | 类型 | 说明 |
|------|------|------|
| `key` | `string` | 全局唯一的状态键名 |
| `defaultValue` | `any` | 可选，提供则注册为所有者 |

返回 `[value, setter, isReady]`

### `useSharedMethod(name, handler)`

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 全局唯一的方法名 |
| `handler` | `(params) => Promise<any>` | 处理函数 |

### `useRemoteMethod(name)`

返回 `async (params?) => Promise<any>`

### `useDiscovery()`

返回 `{ apps, initialized, refresh }`

## 安全模型

1. **签名证书校验**：每次 AIDL 调用前，服务端取 `Binder.getCallingUid()` 对应的包签名哈希，与自身比对。不一致则拒绝。
2. **自动生效**：所有使用同一 keystore 签名的 App 自动互信，无需配置。
3. **无自定义权限冲突**：不使用 `<permission>` 声明，避免多 App 安装时的权限冲突问题。

## 注意事项

- **状态键名全局唯一**：建议使用 `appId.stateName` 格式命名（如 `main.userToken`、`store.cartItems`）
- **首次运行**：App 至少运行一次后，其注册的状态和方法才会被 ContentProvider 缓存并可被发现
- **方法调用 App 拉起**：如果目标 App 未在前台运行，调用方法时会自动拉起其主 Activity
- **序列化**：所有跨进程数据均为 JSON 序列化，确保状态值可被 `JSON.stringify` / `JSON.parse` 处理

## 项目结构

```
react-native-applink/
├── index.js                          # 入口
├── src/
│   ├── AppLinkProvider.js            # React Context Provider + 事件总线
│   ├── AppLinkContext.js             # Context 定义
│   ├── NativeAppLink.js              # Native Module 封装
│   └── hooks/
│       ├── useSharedState.js         # 跨 App useState
│       ├── useSharedMethod.js        # 注册可被远程调用的方法
│       ├── useRemoteMethod.js        # 调用远端方法
│       └── useDiscovery.js           # 发现生态 App
├── android/
│   ├── build.gradle
│   └── src/main/
│       ├── AndroidManifest.xml       # 自动合并：Provider + Service
│       ├── aidl/com/applink/
│       │   ├── IAppLinkService.aidl  # 跨进程接口
│       │   └── IAppLinkCallback.aidl # 状态订阅回调
│       └── java/com/applink/
│           ├── AppLinkPackage.java   # RN 注册入口
│           ├── AppLinkModule.java    # RN Native Module
│           ├── AppLinkService.java   # AIDL Bound Service
│           ├── AppLinkContentProvider.java  # 服务发现
│           ├── AppLinkCore.java      # 单例核心
│           ├── SecurityVerifier.java # 签名校验
│           ├── StateStore.java       # 状态持久化
│           ├── MethodHandler.java    # 方法调用桥接
│           └── ConnectionManager.java # Binder 连接池
├── package.json
└── react-native.config.js
```

## License

MIT
