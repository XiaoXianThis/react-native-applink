package com.applink;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Manages outgoing Binder connections to other apps' AppLinkService.
 *
 * Connections are cached and automatically cleaned up on Binder death.
 * bindService with BIND_AUTO_CREATE ensures the target app is started
 * if it is not already running.
 */
public class ConnectionManager {

    private static final long CONNECT_TIMEOUT_MS = 10_000;

    private final Context context;
    private final Map<String, IAppLinkService> connections = new ConcurrentHashMap<>();
    private final Map<String, ServiceConnection> bindings = new ConcurrentHashMap<>();

    public ConnectionManager(Context context) {
        this.context = context.getApplicationContext();
    }

    /** Get (or create) a Binder connection to the given package's AppLinkService. */
    public IAppLinkService getConnection(String packageName) throws Exception {
        IAppLinkService existing = connections.get(packageName);
        if (existing != null && existing.asBinder().isBinderAlive()) {
            return existing;
        }
        connections.remove(packageName);
        return connect(packageName);
    }

    public void disconnect(String packageName) {
        ServiceConnection conn = bindings.remove(packageName);
        if (conn != null) {
            try {
                context.unbindService(conn);
            } catch (Exception ignored) {
            }
        }
        connections.remove(packageName);
    }

    public void disconnectAll() {
        for (String pkg : bindings.keySet()) {
            disconnect(pkg);
        }
    }

    // ------------------------------------------------------------------

    private IAppLinkService connect(String packageName) throws Exception {
        CompletableFuture<IAppLinkService> future = new CompletableFuture<>();

        Intent intent = new Intent("com.applink.BIND");
        intent.setPackage(packageName);

        ServiceConnection conn = new ServiceConnection() {
            @Override
            public void onServiceConnected(ComponentName name, IBinder binder) {
                IAppLinkService service = IAppLinkService.Stub.asInterface(binder);
                connections.put(packageName, service);

                try {
                    binder.linkToDeath(new IBinder.DeathRecipient() {
                        @Override
                        public void binderDied() {
                            connections.remove(packageName);
                            bindings.remove(packageName);
                        }
                    }, 0);
                } catch (Exception ignored) {
                }

                future.complete(service);
            }

            @Override
            public void onServiceDisconnected(ComponentName name) {
                connections.remove(packageName);
            }
        };

        boolean bound = context.bindService(intent, conn, Context.BIND_AUTO_CREATE);
        if (!bound) {
            throw new Exception("Cannot bind to " + packageName
                    + ". Is the app installed and signed with the same key?");
        }

        bindings.put(packageName, conn);

        try {
            return future.get(CONNECT_TIMEOUT_MS, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            bindings.remove(packageName);
            try {
                context.unbindService(conn);
            } catch (Exception ignored) {
            }
            throw new Exception("Connection to " + packageName + " timed out");
        }
    }
}
