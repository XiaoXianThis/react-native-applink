# react-native-applink Examples

Two demo apps that demonstrate all features of `react-native-applink`.

## Apps

### AppA — State Owner & Method Provider (Blue theme)

- Owns `demo.counter` (shared counter state)
- Owns `demo.userInfo` (shared user object)
- Provides `demo.greet` method (accepts a name, returns a greeting)
- Provides `demo.calculate` method (accepts two numbers and an operator)
- Shows ecosystem discovery results

### AppB — State Subscriber & Method Caller (Orange theme)

- Subscribes to `demo.counter` (real-time sync from AppA)
- Subscribes to `demo.userInfo` (real-time sync from AppA)
- Calls `demo.greet` remotely on AppA
- Calls `demo.calculate` remotely on AppA
- Shows ecosystem discovery results

## Running

### Prerequisites

- Android emulator or device (API 24+)
- Both apps must be signed with the same keystore (the default debug keystore is shared)

### Steps

1. **From the repo root**, build the local package tarball (avoids symlink recursion and Watchman “File name too long”):

```bash
cd /path/to/react-native-applink
npm run pack:local
```

2. Install dependencies in both apps:

```bash
cd examples/AppA && npm install
cd examples/AppB && npm install
```

3. **Start both Metro servers** (each must run from its own app directory, otherwise you get `Cannot find module '@react-native/metro-config'`):

   - **Terminal 1** — Metro for AppA:
     ```bash
     cd examples/AppA
     npm run start:8081
     ```
     Leave this running.

   - **Terminal 2** — Metro for AppB:
     ```bash
     cd examples/AppB
     npm run start:8082
     ```
     Leave this running.

4. **Install and launch the apps** (with Metro already running, use `--no-packager`):

   - **Terminal 3** — run AppA:
     ```bash
     cd examples/AppA
     npx react-native run-android --no-packager
     ```

   - **Terminal 4** — run AppB:
     ```bash
     cd examples/AppB
     npx react-native run-android --no-packager --port 8082
     ```

5. In AppA, you can:
   - Modify the counter and user info
   - See real-time updates reflected in AppB

6. In AppB, you can:
   - See counter and user info from AppA update in real-time
   - Remotely modify AppA's counter
   - Call AppA's `greet` and `calculate` methods
   - Use the discovery feature to see AppA's capabilities

## Notes

- Both apps use the same debug keystore, which is required for signature verification
- AppA must run at least once before AppB can discover its capabilities
- The `applicationId` values are `com.applink.demo.appa` and `com.applink.demo.appb`

## Troubleshooting

### App 无法启动 / 红屏 “Unable to load script”

- **Metro 必须在各自 App 目录下启动**：在仓库根目录执行 `react-native start` 会报 `Cannot find module '@react-native/metro-config'`，应用也无法连上开发服务。请务必先 `cd examples/AppA` 或 `cd examples/AppB`，再执行 `npm run start:8081` 或 `npm run start:8082`。
- 先确认 Metro 已显示 “Dev server ready”，再在另一个终端用 `npx react-native run-android --no-packager` 安装并打开应用。
- 若模拟器与电脑不在同一网络，可改用真机 USB 连接，或使用 `adb reverse tcp:8081 tcp:8081`（AppB 用 8082）做端口转发。

### App 安装后闪退 / ClassNotFoundException: MainApplication

若 logcat 出现 `ClassNotFoundException: Didn't find class "com.applink.demo.appa.MainApplication"`，是因为 `applicationId` 已改为 `com.applink.demo.appa`，但 Kotlin 代码仍在包 `com.appa`。本仓库已在 AndroidManifest 中使用**完整类名**（`com.appa.MainApplication` / `com.appa.MainActivity`，AppB 为 `com.appb.*`）以正确解析。若你自行改了 applicationId 又移动了源码包，请确保 Manifest 里的 `android:name` 与真实类所在包一致。

### Watchman “File name too long” / App keeps stopping

If you see Watchman warnings about `opendir(...react-native-applink/examples/AppB/node_modules/...) -> File name too long`, the example apps were previously installed with `file:../../` and created a recursive symlink. Fix it by using the tarball and clearing Watchman:

```bash
# From repo root
cd /path/to/react-native-applink

# Remove old deps that used the symlink
rm -rf examples/AppA/node_modules examples/AppB/node_modules

# Build the local tarball (no examples inside → no recursion)
npm run pack:local

# Reinstall in both apps
cd examples/AppA && npm install
cd examples/AppB && npm install

# Clear Watchman so it forgets the broken paths
watchman watch-del '<repo-root-path>'
watchman watch-project '<repo-root-path>'
```
Replace `<repo-root-path>` with the full path to the `react-native-applink` repo (e.g. the folder that contains `examples/`).

Then start Metro and run the app again. After changing library code, run `npm run pack:local` again and reinstall in the app(s) you’re testing.

### INSTALL_FAILED_INSUFFICIENT_STORAGE

Build succeeded but install fails with `INSTALL_FAILED_INSUFFICIENT_STORAGE` — the emulator/device has no free space. Do one of the following:

**Option A – Wipe the current emulator (fastest)**  
1. Close the emulator.  
2. Open **Android Studio → Device Manager** (or AVD Manager).  
3. Click the **⋮** on **Pixel_7_Pro_API_34** → **Wipe Data**.  
4. Cold boot the AVD, then run again:
   ```bash
   cd examples/AppA && npx react-native run-android
   ```

**Option B – Free space via ADB (emulator already running)**  
```bash
# Uninstall demo apps to free space
adb uninstall com.applink.demo.appa
adb uninstall com.applink.demo.appb
# Optional: clear cache
adb shell pm clear com.android.providers.downloads
```
Then run `npx react-native run-android` again.

**Option C – New emulator with more storage**  
Create a new AVD: **Device Manager → Create Device** → pick a device → **Show Advanced Settings** → set **Internal Storage** to **2048 MB** or more → finish and run the app on it.

**Option D – Use a physical Android device**  
Connect via USB, enable USB debugging, run `npx react-native run-android` (device usually has more free space).
