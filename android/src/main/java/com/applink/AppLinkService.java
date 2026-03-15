package com.applink;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.os.RemoteException;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * AIDL Bound Service that handles all cross-app IPC.
 *
 * Lifecycle:
 *   - Created by Android when a remote app calls bindService() with
 *     action "com.applink.BIND" (BIND_AUTO_CREATE starts the process).
 *   - Each incoming call verifies the caller's signing certificate
 *     via SecurityVerifier before processing.
 */
public class AppLinkService extends Service {

    private AppLinkCore core;

    private final ConcurrentHashMap<String, CopyOnWriteArrayList<IAppLinkCallback>>
            subscriptions = new ConcurrentHashMap<>();
    private final Set<String> stateListenerKeys = ConcurrentHashMap.newKeySet();

    @Override
    public void onCreate() {
        super.onCreate();
        core = AppLinkCore.getInstance(this);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    // ------------------------------------------------------------------

    private final IAppLinkService.Stub binder = new IAppLinkService.Stub() {

        @Override
        public String getCapabilities() {
            if (!core.getSecurityVerifier().verifyCallerSignature()) {
                return "{\"error\":\"Signature verification failed\"}";
            }
            try {
                JSONObject caps = new JSONObject();

                JSONArray states = new JSONArray();
                for (String k : core.getStateStore().getRegisteredKeys()) {
                    states.put(k);
                }
                caps.put("states", states);

                JSONArray methods = new JSONArray();
                for (String m : core.getMethodHandler().getRegisteredMethods()) {
                    methods.put(m);
                }
                caps.put("methods", methods);

                caps.put("appId", core.getAppId());
                caps.put("packageName", getPackageName());
                return caps.toString();
            } catch (Exception e) {
                return "{\"error\":\"" + e.getMessage() + "\"}";
            }
        }

        @Override
        public String getState(String key) {
            if (!core.getSecurityVerifier().verifyCallerSignature()) {
                return null;
            }
            return core.getStateStore().getState(key);
        }

        @Override
        public boolean setState(String key, String value) {
            if (!core.getSecurityVerifier().verifyCallerSignature()) {
                return false;
            }
            core.getStateStore().setState(key, value);
            return true;
        }

        @Override
        public String invokeMethod(String name, String paramsJson) {
            if (!core.getSecurityVerifier().verifyCallerSignature()) {
                return "{\"__error\":true,\"message\":\"Signature verification failed\"}";
            }
            return core.getMethodHandler().invoke(name, paramsJson);
        }

        @Override
        public void subscribe(String key, IAppLinkCallback callback) {
            if (!core.getSecurityVerifier().verifyCallerSignature()) {
                return;
            }

            subscriptions.computeIfAbsent(key, k -> new CopyOnWriteArrayList<>())
                    .add(callback);

            try {
                callback.asBinder().linkToDeath(new IBinder.DeathRecipient() {
                    @Override
                    public void binderDied() {
                        CopyOnWriteArrayList<IAppLinkCallback> list = subscriptions.get(key);
                        if (list != null) list.remove(callback);
                    }
                }, 0);
            } catch (RemoteException ignored) {
            }

            if (stateListenerKeys.add(key)) {
                core.getStateStore().addKeyListener(key, (k, v) -> notifySubscribers(k, v));
            }
        }

        @Override
        public void unsubscribe(String key, IAppLinkCallback callback) {
            CopyOnWriteArrayList<IAppLinkCallback> list = subscriptions.get(key);
            if (list != null) {
                list.remove(callback);
            }
        }
    };

    private void notifySubscribers(String key, String value) {
        CopyOnWriteArrayList<IAppLinkCallback> list = subscriptions.get(key);
        if (list == null) return;
        for (IAppLinkCallback cb : list) {
            try {
                cb.onStateChanged(key, value);
            } catch (RemoteException e) {
                list.remove(cb);
            }
        }
    }
}
