import React, {useEffect, useState, useCallback, useRef} from 'react';
import {AppLinkContext} from './AppLinkContext';
import {NativeAppLink, AppLinkEventEmitter} from './NativeAppLink';

export function AppLinkProvider({appId, children}) {
  const [initialized, setInitialized] = useState(false);
  const [apps, setApps] = useState([]);
  const [routeTable, setRouteTable] = useState({});
  const stateListeners = useRef(new Map());
  const methodHandlers = useRef(new Map());
  const pendingInvocations = useRef([]);

  const buildRouteTable = useCallback((appList) => {
    const routes = {};
    for (const app of appList) {
      if (app.states) {
        for (const key of app.states) {
          routes[key] = app.packageName;
        }
      }
      if (app.methods) {
        for (const name of app.methods) {
          routes[name] = app.packageName;
        }
      }
    }
    return routes;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await NativeAppLink.initialize(appId);
        const raw = await NativeAppLink.discoverApps();
        if (!mounted) return;

        const appList = JSON.parse(raw);
        const routes = buildRouteTable(appList);

        setApps(appList);
        setRouteTable(routes);
        setInitialized(true);
      } catch (e) {
        console.error('[AppLink] Initialization failed:', e);
        if (mounted) setInitialized(true);
      }
    }

    init();

    const stateSub = AppLinkEventEmitter?.addListener(
      'AppLink_StateChanged',
      ({key, value}) => {
        const listeners = stateListeners.current.get(key);
        if (listeners) {
          listeners.forEach((fn) => fn(value));
        }
      },
    );

    const methodSub = AppLinkEventEmitter?.addListener(
      'AppLink_MethodInvocation',
      async ({requestId, method, params}) => {
        const handler = methodHandlers.current.get(method);
        if (handler) {
          processInvocation(handler, requestId, params);
        } else {
          pendingInvocations.current.push({requestId, method, params});
        }
      },
    );

    return () => {
      mounted = false;
      stateSub?.remove();
      methodSub?.remove();
    };
  }, [appId, buildRouteTable]);

  const addStateListener = useCallback((key, listener) => {
    if (!stateListeners.current.has(key)) {
      stateListeners.current.set(key, new Set());
    }
    stateListeners.current.get(key).add(listener);
    return () => {
      const set = stateListeners.current.get(key);
      if (set) {
        set.delete(listener);
        if (set.size === 0) stateListeners.current.delete(key);
      }
    };
  }, []);

  const registerMethodHandler = useCallback((name, handler) => {
    methodHandlers.current.set(name, handler);

    const queued = pendingInvocations.current.filter((p) => p.method === name);
    pendingInvocations.current = pendingInvocations.current.filter(
      (p) => p.method !== name,
    );
    for (const inv of queued) {
      processInvocation(handler, inv.requestId, inv.params);
    }

    return () => methodHandlers.current.delete(name);
  }, []);

  const refreshRoutes = useCallback(async () => {
    try {
      const raw = await NativeAppLink.discoverApps();
      const appList = JSON.parse(raw);
      const routes = buildRouteTable(appList);
      setApps(appList);
      setRouteTable(routes);
    } catch (e) {
      console.error('[AppLink] Refresh failed:', e);
    }
  }, [buildRouteTable]);

  return (
    <AppLinkContext.Provider
      value={{
        appId,
        initialized,
        apps,
        routeTable,
        addStateListener,
        registerMethodHandler,
        refreshRoutes,
      }}>
      {children}
    </AppLinkContext.Provider>
  );
}

async function processInvocation(handler, requestId, params) {
  try {
    const parsed = params ? JSON.parse(params) : {};
    const result = await handler(parsed);
    NativeAppLink.resolveMethodCall(requestId, JSON.stringify(result ?? null));
  } catch (e) {
    NativeAppLink.resolveMethodCall(
      requestId,
      JSON.stringify({__error: true, message: e.message}),
    );
  }
}
