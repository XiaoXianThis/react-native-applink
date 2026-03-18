package com.applink;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.TimeUnit;

/**
 * Manages method registration and cross-process invocation.
 *
 * Registered method names are persisted so the ContentProvider can
 * advertise them even before JS re-registers on a cold start.
 *
 * When a remote AIDL call arrives, the handler posts an event to the
 * RN JS thread and blocks (with timeout) until JS resolves it.
 * If the RN context is not available, it attempts to launch the
 * main Activity so the JS bundle can boot.
 */
public class MethodHandler {

    private static final String PREF_NAME = "applink_method_registry";
    private static final String SCHEMA_PREF_NAME = "applink_method_schemas";
    private static final long DEFAULT_TIMEOUT_MS = 15_000;

    private final Context appContext;
    private final SharedPreferences prefs;
    private final SharedPreferences schemaPrefs;
    private final Set<String> registeredMethods = new CopyOnWriteArraySet<>();
    private final ConcurrentHashMap<String, CompletableFuture<String>> pendingCalls =
            new ConcurrentHashMap<>();
    private volatile ReactApplicationContext reactContext;

    public MethodHandler(Context context) {
        this.appContext = context.getApplicationContext();
        this.prefs = appContext.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        this.schemaPrefs = appContext.getSharedPreferences(SCHEMA_PREF_NAME, Context.MODE_PRIVATE);
        registeredMethods.addAll(prefs.getAll().keySet());
    }

    public void setReactContext(ReactApplicationContext ctx) {
        this.reactContext = ctx;
    }

    public void registerMethod(String name, String schemaJson) {
        registeredMethods.add(name);
        prefs.edit().putBoolean(name, true).apply();
        if (schemaJson != null) {
            schemaPrefs.edit().putString(name, schemaJson).apply();
        } else {
            schemaPrefs.edit().remove(name).apply();
        }
    }

    public void unregisterMethod(String name) {
        registeredMethods.remove(name);
        prefs.edit().remove(name).apply();
        schemaPrefs.edit().remove(name).apply();
    }

    public Set<String> getRegisteredMethods() {
        return registeredMethods;
    }

    public String getMethodSchema(String name) {
        return schemaPrefs.getString(name, null);
    }

    public boolean hasMethod(String name) {
        return registeredMethods.contains(name);
    }

    /**
     * Invoke a JS-side method handler. Blocks current thread until JS
     * responds or the timeout expires.
     * Called from a Binder thread when a remote app makes an AIDL call.
     */
    public String invoke(String name, String paramsJson) {
        if (!registeredMethods.contains(name)) {
            return errorJson("Method not found: " + name);
        }

        long deadline = System.currentTimeMillis() + DEFAULT_TIMEOUT_MS;

        ensureReactContextReady(deadline);

        ReactApplicationContext ctx = reactContext;
        if (ctx == null || !ctx.hasActiveReactInstance()) {
            return errorJson("React Native context unavailable (app may still be starting)");
        }

        String requestId = UUID.randomUUID().toString();
        CompletableFuture<String> future = new CompletableFuture<>();
        pendingCalls.put(requestId, future);

        WritableMap event = Arguments.createMap();
        event.putString("requestId", requestId);
        event.putString("method", name);
        event.putString("params", paramsJson != null ? paramsJson : "{}");
        ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("AppLink_MethodInvocation", event);

        try {
            long remaining = deadline - System.currentTimeMillis();
            return future.get(Math.max(remaining, 1000), TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            pendingCalls.remove(requestId);
            return errorJson("Invocation timeout: " + e.getMessage());
        }
    }

    /** Called from JS when the handler has produced a result. */
    public void resolveMethodCall(String requestId, String resultJson) {
        CompletableFuture<String> future = pendingCalls.remove(requestId);
        if (future != null) {
            future.complete(resultJson);
        }
    }

    // ------------------------------------------------------------------

    private void ensureReactContextReady(long deadline) {
        if (reactContext != null && reactContext.hasActiveReactInstance()) {
            return;
        }
        launchApp();
        while ((reactContext == null || !reactContext.hasActiveReactInstance())
                && System.currentTimeMillis() < deadline) {
            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }

    private void launchApp() {
        try {
            Intent intent = appContext.getPackageManager()
                    .getLaunchIntentForPackage(appContext.getPackageName());
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                appContext.startActivity(intent);
            }
        } catch (Exception ignored) {
        }
    }

    private static String errorJson(String message) {
        return "{\"__error\":true,\"message\":\"" +
                message.replace("\"", "\\\"") + "\"}";
    }
}
