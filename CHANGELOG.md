# Changelog

## 1.1.0 (2026-03-16)

### Features

- **Method Schema** — `useSharedMethod` now accepts an optional third `schema` parameter (JSON Schema format, compatible with Vercel AI SDK tool definitions)
- **Rich Discovery** — `useDiscovery` returns method objects `{ name, schema? }` instead of plain strings, enabling AI agents to discover parameter types automatically
- **ContentProvider schema column** — the capability cursor now includes a `schema` column for method entries

### Breaking Changes

- `AppInfo.methods` changed from `string[]` to `MethodInfo[]` (each element is `{ name: string, schema?: MethodSchema }`)

## 1.0.0 (2026-03-16)

### Features

- **useSharedState** — cross-app `useState` with owner/subscriber model
- **useSharedMethod** — register methods callable from other apps
- **useRemoteMethod** — invoke methods registered by other apps
- **useDiscovery** — discover installed ecosystem apps and their capabilities
- **AppLinkProvider** — React Context provider for initialization and event routing
- **AIDL/Binder IPC** — high-performance inter-process communication
- **ContentProvider discovery** — zero-launch capability discovery
- **Signature verification** — only apps signed with the same certificate can communicate
- **Auto-launch** — target app is started automatically if not running
- **Connection pooling** — cached Binder connections with death monitoring
