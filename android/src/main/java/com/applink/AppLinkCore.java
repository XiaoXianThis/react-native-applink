package com.applink;

import android.content.Context;

/**
 * Singleton holding all shared infrastructure for the AppLink library.
 * Accessed by both the RN NativeModule and the AIDL Service / ContentProvider.
 */
public class AppLinkCore {

    private static volatile AppLinkCore instance;

    private final Context appContext;
    private final StateStore stateStore;
    private final MethodHandler methodHandler;
    private final SecurityVerifier securityVerifier;
    private final ConnectionManager connectionManager;
    private volatile String appId;

    private AppLinkCore(Context context) {
        this.appContext = context.getApplicationContext();
        this.stateStore = new StateStore(appContext);
        this.methodHandler = new MethodHandler(appContext);
        this.securityVerifier = new SecurityVerifier(appContext);
        this.connectionManager = new ConnectionManager(appContext);
    }

    public static AppLinkCore getInstance(Context context) {
        if (instance == null) {
            synchronized (AppLinkCore.class) {
                if (instance == null) {
                    instance = new AppLinkCore(context);
                }
            }
        }
        return instance;
    }

    public static AppLinkCore getInstance() {
        return instance;
    }

    public void setAppId(String appId) {
        this.appId = appId;
    }

    public String getAppId() {
        return appId;
    }

    public Context getAppContext() {
        return appContext;
    }

    public StateStore getStateStore() {
        return stateStore;
    }

    public MethodHandler getMethodHandler() {
        return methodHandler;
    }

    public SecurityVerifier getSecurityVerifier() {
        return securityVerifier;
    }

    public ConnectionManager getConnectionManager() {
        return connectionManager;
    }
}
