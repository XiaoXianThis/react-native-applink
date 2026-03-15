import {useState, useEffect, useCallback, useContext, useRef} from 'react';
import {AppLinkContext} from '../AppLinkContext';
import {NativeAppLink} from '../NativeAppLink';

/**
 * Cross-app shared state hook.
 *
 * With defaultValue  → registers as state owner (like a provider).
 * Without defaultValue → subscribes to a remote owner (like a consumer).
 *
 * Returns [value, setter, isReady].
 */
export function useSharedState(key, defaultValue) {
  const {initialized, routeTable, addStateListener} =
    useContext(AppLinkContext);
  const [value, setValue] = useState(defaultValue);
  const [ready, setReady] = useState(false);
  const isOwner = useRef(false);
  const routeTableRef = useRef(routeTable);
  routeTableRef.current = routeTable;

  useEffect(() => {
    if (!initialized) return;

    let unmounted = false;
    const remotePackage = routeTable[key];

    async function setup() {
      if (!remotePackage) {
        if (defaultValue !== undefined) {
          isOwner.current = true;
          await NativeAppLink.registerState(key, JSON.stringify(defaultValue));
          const stored = await NativeAppLink.getLocalState(key);
          if (!unmounted) {
            setValue(stored != null ? JSON.parse(stored) : defaultValue);
            setReady(true);
          }
        } else {
          if (!unmounted) setReady(true);
        }
      } else {
        isOwner.current = false;
        try {
          const remote = await NativeAppLink.getRemoteState(
            remotePackage,
            key,
          );
          if (!unmounted) {
            setValue(remote != null ? JSON.parse(remote) : defaultValue);
            setReady(true);
          }
          await NativeAppLink.subscribeRemoteState(remotePackage, key);
        } catch (e) {
          console.warn(`[AppLink] Failed to get remote state "${key}":`, e);
          if (!unmounted) {
            if (defaultValue !== undefined) {
              isOwner.current = true;
              await NativeAppLink.registerState(
                key,
                JSON.stringify(defaultValue),
              );
              setValue(defaultValue);
            }
            setReady(true);
          }
        }
      }
    }

    setup();

    return () => {
      unmounted = true;
      if (!isOwner.current && remotePackage) {
        NativeAppLink.unsubscribeRemoteState(remotePackage, key).catch(
          () => {},
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, key]);

  useEffect(() => {
    if (!initialized) return;
    return addStateListener(key, (newValue) => {
      setValue(newValue != null ? JSON.parse(newValue) : null);
    });
  }, [initialized, key, addStateListener]);

  const setter = useCallback(
    async (newValue) => {
      const resolved =
        typeof newValue === 'function' ? newValue(value) : newValue;
      const json = JSON.stringify(resolved);
      setValue(resolved);

      if (isOwner.current) {
        NativeAppLink.setLocalState(key, json);
      } else {
        const pkg = routeTableRef.current[key];
        if (pkg) {
          try {
            await NativeAppLink.setRemoteState(pkg, key, json);
          } catch (e) {
            console.warn(`[AppLink] Failed to set remote state "${key}":`, e);
          }
        }
      }
    },
    [key, value],
  );

  return [value, setter, ready];
}
