package com.applink;

import com.applink.IAppLinkCallback;

interface IAppLinkService {
    /** Returns JSON: { states: [...], methods: [...], appId, packageName } */
    String getCapabilities();

    /** Read a shared state value by key */
    String getState(String key);

    /** Write a shared state value (returns false if denied) */
    boolean setState(String key, String value);

    /** Invoke a registered method; blocks until JS handler responds or timeout */
    String invokeMethod(String name, String paramsJson);

    /** Subscribe to state changes; callback fires on every update */
    void subscribe(String key, IAppLinkCallback callback);

    /** Remove a previously registered subscription */
    void unsubscribe(String key, IAppLinkCallback callback);
}
