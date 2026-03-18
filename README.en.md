# react-native-applink

**[简体中文](README.md)** | **English**

A React Native library for sharing state and method calls across apps (Android only).

Built on **AIDL / Binder** for high-performance IPC and **ContentProvider** for zero-launch service discovery, exposed as React Hooks so multiple apps can share state and invoke methods as easily as `useState` in a single project.

## Features

- **`useSharedState`** — Cross-app `useState`; any app can read/write the same state
- **`useSharedMethod`** — Register a method callable remotely by other apps
- **`useRemoteMethod`** — Call a method registered by another app and get the return value
- **`useDiscovery`** — Discover installed ecosystem apps and their capabilities
- **Signing certificate verification** — Only apps signed with the same certificate can communicate
- **Auto launch** — If the target app is not running, it is started automatically to complete the call
- **Zero native code** — Consumers write no Java/Kotlin

## Installation

```bash
npm install @xiaoxianthis/react-native-applink
# or
yarn add @xiaoxianthis/react-native-applink
```

React Native 0.60+ autolinking; no manual link.

## Prerequisites

> **All apps that participate in communication must be built with the same signing certificate (keystore).**
> This is the basis of the security model—the library verifies at runtime that the caller’s signing certificate matches its own.
> During development all apps typically use `debug.keystore`; no extra setup needed.

- Android 7.0+ (API 24+)
- React Native 0.60+

## Quick start

### 1. Wrap with Provider

In each app’s root component:

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

`appId` is only an identifier; it does not affect routing.

### 2. Shared state

```jsx
import { useSharedState } from '@xiaoxianthis/react-native-applink';

// ---- App A (state owner: pass default to register as owner) ----
function UserScreen() {
  const [token, setToken, ready] = useSharedState('auth.token', '');

  return ready ? <Text>{token}</Text> : <Loading />;
}

// ---- App B (consumer: omit default to subscribe to remote owner) ----
function RemoteUserInfo() {
  const [token, setToken, ready] = useSharedState('auth.token');
  //     ↑ value from App A        ↑ can update App A’s value remotely

  return ready ? <Text>Token: {token}</Text> : <Loading />;
}
```

- Pass `defaultValue` → register as **owner** of that state
- Omit `defaultValue` → **subscribe** to the remote owner
- `setToken` updates across apps; all subscribers get updates in real time
- `ready` means the initial value has been loaded

### 3. Shared methods

```jsx
import { useSharedMethod, useRemoteMethod } from '@xiaoxianthis/react-native-applink';

// ---- App A (method provider) ----
function ScannerScreen() {
  useSharedMethod('scanner.scan', async (params) => {
    const result = await startQRScan(params.type);
    return { data: result };
  }, {
    description: 'Scan QR or barcode',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Code type: qr | barcode' },
      },
      required: ['type'],
    },
  });

  return <CameraView />;
}

// ---- App B (caller) ----
function OrderScreen() {
  const scan = useRemoteMethod('scanner.scan');

  const handleScan = async () => {
    const result = await scan({ type: 'qr' });
    console.log('Scan result:', result.data);
  };

  return <Button onPress={handleScan} title="Scan" />;
}
```

- If App A is not running, it is launched automatically on call
- Methods can be async; return values are serialized automatically
- Default timeout 15 seconds
- `schema` is optional; omit for name-only registration as before

### 4. Discover installed apps

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
          <Text>States: {item.states.join(', ')}</Text>
          <Text>Methods: {item.methods.map(m => m.name).join(', ')}</Text>
        </View>
      )}
    />
  );
}
```

Each entry in `methods` is `{ name, schema? }`. `schema` appears only when provided at registration.

## Architecture overview

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
│  ContentProvider ─── discovery (query even if app not started)│
│  AIDL Service    ─── state R/W, method calls, subscriptions  │
│  SecurityVerifier ── signing certificate verification        │
└──────────────────────────────────────────────────────────────┘
```

## API reference

### `<AppLinkProvider appId="string">`

| Prop | Type | Description |
|------|------|-------------|
| `appId` | `string` | Current app id (logging/debug only) |

### `useSharedState(key, defaultValue?)`

| Arg | Type | Description |
|-----|------|-------------|
| `key` | `string` | Globally unique state key |
| `defaultValue` | `any` | Optional; if set, registers as owner |

Returns `[value, setter, isReady]`

### `useSharedMethod(name, handler, schema?)`

| Arg | Type | Description |
|-----|------|-------------|
| `name` | `string` | Globally unique method name |
| handler | `(params) => Promise<any>` | Handler |
| `schema` | `MethodSchema` | Optional JSON Schema (Vercel AI SDK tool-compatible) |

`MethodSchema` shape:

```ts
{
  description?: string;          // What the method does
  parameters?: object;           // JSON Schema for inputs
  returns?: object;              // JSON Schema for return (documentation)
}
```

### `useRemoteMethod(name)`

Returns `async (params?) => Promise<any>`

### `useDiscovery()`

Returns `{ apps, initialized, refresh }`

## Security model

1. **Signing check**: Before each AIDL call, the server compares the caller’s package signature hash (from `Binder.getCallingUid()`) with its own. Mismatch → reject.
2. **Automatic trust**: All apps signed with the same keystore trust each other; no extra config.
3. **No custom permission conflicts**: No `<permission>` declarations to avoid install-time conflicts across apps.

## AI agent integration

Method `schema` uses standard JSON Schema and can feed Vercel AI SDK and similar tool-calling stacks:

```ts
import { tool, jsonSchema } from 'ai';
import { useDiscovery } from '@xiaoxianthis/react-native-applink';

const { apps } = useDiscovery();

const tools = {};
for (const app of apps) {
  for (const method of app.methods) {
    if (!method.schema) continue;
    tools[method.name] = tool({
      description: method.schema.description,
      inputSchema: jsonSchema(method.schema.parameters),
      execute: async (params) =>
        invokeRemoteMethod(app.packageName, method.name, params),
    });
  }
}
```

## Notes

- **Unique state keys**: Prefer `appId.stateName` (e.g. `main.userToken`, `store.cartItems`)
- **First run**: Each app must run at least once before its states/methods are cached via ContentProvider and discoverable
- **Launch on method call**: Calling a method may launch the target app’s main Activity if it is not in the foreground
- **Serialization**: All IPC data is JSON; ensure values are `JSON.stringify` / `JSON.parse` safe

## Project layout

```
react-native-applink/
├── index.js
├── src/
│   ├── AppLinkProvider.js
│   ├── AppLinkContext.js
│   ├── NativeAppLink.js
│   └── hooks/
│       ├── useSharedState.js
│       ├── useSharedMethod.js
│       ├── useRemoteMethod.js
│       └── useDiscovery.js
├── android/
│   ├── build.gradle
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── aidl/com/applink/
│       │   ├── IAppLinkService.aidl
│       │   └── IAppLinkCallback.aidl
│       └── java/com/applink/
│           ├── AppLinkPackage.java
│           ├── AppLinkModule.java
│           ├── AppLinkService.java
│           ├── AppLinkContentProvider.java
│           ├── AppLinkCore.java
│           ├── SecurityVerifier.java
│           ├── StateStore.java
│           ├── MethodHandler.java
│           └── ConnectionManager.java
├── package.json
└── react-native.config.js
```

## License

MIT
