package com.applink;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.RemoteException;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * React Native bridge module that exposes the full AppLink API to JS.
 *
 * Thread safety: all IPC methods run on a cached thread pool because
 * Binder calls (getConnection, getState, invokeMethod …) may block.
 */
public class AppLinkModule extends ReactContextBaseJavaModule {

    private AppLinkCore core;
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Map<String, IAppLinkCallback> remoteSubscriptions = new HashMap<>();

    public AppLinkModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "AppLinkModule";
    }

    // ======================= Lifecycle =======================

    @ReactMethod
    public void initialize(String appId, Promise promise) {
        try {
            core = AppLinkCore.getInstance(getReactApplicationContext());
            core.setAppId(appId);
            core.getMethodHandler().setReactContext(getReactApplicationContext());

            core.getStateStore().setGlobalListener((key, value) -> {
                WritableMap event = Arguments.createMap();
                event.putString("key", key);
                event.putString("value", value);
                emitEvent("AppLink_StateChanged", event);
            });

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("INIT_ERROR", e.getMessage());
        }
    }

    @Override
    public void invalidate() {
        executor.shutdown();
        if (core != null) {
            core.getConnectionManager().disconnectAll();
        }
        super.invalidate();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onCatalystInstanceDestroy() {
        executor.shutdown();
        if (core != null) {
            core.getConnectionManager().disconnectAll();
        }
        super.onCatalystInstanceDestroy();
    }

    // ======================= Discovery =======================

    @ReactMethod
    public void discoverApps(Promise promise) {
        executor.execute(() -> {
            try {
                PackageManager pm = getReactApplicationContext().getPackageManager();
                Intent intent = new Intent("com.applink.BIND");
                List<ResolveInfo> services = pm.queryIntentServices(intent, PackageManager.GET_META_DATA);

                String myPkg = getReactApplicationContext().getPackageName();
                JSONArray result = new JSONArray();

                for (ResolveInfo ri : services) {
                    String pkg = ri.serviceInfo.packageName;
                    if (pkg.equals(myPkg)) continue;
                    if (!core.getSecurityVerifier().verifyPackageSignature(pkg)) continue;

                    JSONObject app = new JSONObject();
                    app.put("packageName", pkg);
                    app.put("appName",
                            pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString());

                    JSONArray states = new JSONArray();
                    JSONArray methods = new JSONArray();

                    try {
                        Uri uri = Uri.parse("content://" + pkg + ".applink");
                        Cursor cursor = getReactApplicationContext()
                                .getContentResolver().query(uri, null, null, null, null);
                        if (cursor != null) {
                            int schemaCol = cursor.getColumnIndex("schema");
                            while (cursor.moveToNext()) {
                                String type = cursor.getString(0);
                                String key = cursor.getString(1);
                                if ("state".equals(type)) {
                                    states.put(key);
                                } else if ("method".equals(type)) {
                                    JSONObject methodObj = new JSONObject();
                                    methodObj.put("name", key);
                                    if (schemaCol >= 0 && !cursor.isNull(schemaCol)) {
                                        methodObj.put("schema", new JSONObject(cursor.getString(schemaCol)));
                                    }
                                    methods.put(methodObj);
                                }
                            }
                            cursor.close();
                        }
                    } catch (Exception ignored) {
                    }

                    app.put("states", states);
                    app.put("methods", methods);
                    result.put(app);
                }

                promise.resolve(result.toString());
            } catch (Exception e) {
                promise.reject("DISCOVER_ERROR", e.getMessage());
            }
        });
    }

    // ======================= Local State =======================

    @ReactMethod
    public void registerState(String key, String defaultValue, Promise promise) {
        try {
            core.getStateStore().registerState(key, defaultValue);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("STATE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getLocalState(String key, Promise promise) {
        try {
            promise.resolve(core.getStateStore().getState(key));
        } catch (Exception e) {
            promise.reject("STATE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void setLocalState(String key, String value) {
        core.getStateStore().setState(key, value);
    }

    // ======================= Remote State =======================

    @ReactMethod
    public void getRemoteState(String packageName, String key, Promise promise) {
        executor.execute(() -> {
            try {
                IAppLinkService svc = core.getConnectionManager().getConnection(packageName);
                promise.resolve(svc.getState(key));
            } catch (Exception e) {
                promise.reject("REMOTE_STATE_ERROR", e.getMessage());
            }
        });
    }

    @ReactMethod
    public void setRemoteState(String packageName, String key, String value, Promise promise) {
        executor.execute(() -> {
            try {
                IAppLinkService svc = core.getConnectionManager().getConnection(packageName);
                promise.resolve(svc.setState(key, value));
            } catch (Exception e) {
                promise.reject("REMOTE_STATE_ERROR", e.getMessage());
            }
        });
    }

    @ReactMethod
    public void subscribeRemoteState(String packageName, String key, Promise promise) {
        executor.execute(() -> {
            try {
                IAppLinkService svc = core.getConnectionManager().getConnection(packageName);

                IAppLinkCallback callback = new IAppLinkCallback.Stub() {
                    @Override
                    public void onStateChanged(String stateKey, String value)
                            throws RemoteException {
                        WritableMap event = Arguments.createMap();
                        event.putString("key", stateKey);
                        event.putString("value", value);
                        emitEvent("AppLink_StateChanged", event);
                    }
                };

                svc.subscribe(key, callback);
                synchronized (remoteSubscriptions) {
                    remoteSubscriptions.put(packageName + ":" + key, callback);
                }
                promise.resolve(true);
            } catch (Exception e) {
                promise.reject("SUBSCRIBE_ERROR", e.getMessage());
            }
        });
    }

    @ReactMethod
    public void unsubscribeRemoteState(String packageName, String key, Promise promise) {
        executor.execute(() -> {
            try {
                String subKey = packageName + ":" + key;
                IAppLinkCallback callback;
                synchronized (remoteSubscriptions) {
                    callback = remoteSubscriptions.remove(subKey);
                }
                if (callback != null) {
                    IAppLinkService svc = core.getConnectionManager().getConnection(packageName);
                    svc.unsubscribe(key, callback);
                }
                promise.resolve(true);
            } catch (Exception e) {
                promise.reject("UNSUBSCRIBE_ERROR", e.getMessage());
            }
        });
    }

    // ======================= Methods =======================

    @ReactMethod
    public void registerMethod(String name, String schemaJson) {
        core.getMethodHandler().registerMethod(name, schemaJson);
    }

    @ReactMethod
    public void unregisterMethod(String name) {
        core.getMethodHandler().unregisterMethod(name);
    }

    @ReactMethod
    public void resolveMethodCall(String requestId, String resultJson) {
        core.getMethodHandler().resolveMethodCall(requestId, resultJson);
    }

    @ReactMethod
    public void invokeRemoteMethod(String packageName, String name,
                                   String paramsJson, Promise promise) {
        executor.execute(() -> {
            try {
                IAppLinkService svc = core.getConnectionManager().getConnection(packageName);
                String result = svc.invokeMethod(name, paramsJson);
                promise.resolve(result);
            } catch (Exception e) {
                promise.reject("METHOD_ERROR", e.getMessage());
            }
        });
    }

    // ======================= Event Helpers =======================

    private void emitEvent(String name, WritableMap params) {
        ReactApplicationContext ctx = getReactApplicationContext();
        if (ctx != null && ctx.hasActiveReactInstance()) {
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(name, params);
        }
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Required by NativeEventEmitter
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        // Required by NativeEventEmitter
    }
}
