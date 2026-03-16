# Changelog

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
