import {useEffect, useContext, useRef} from 'react';
import {AppLinkContext} from '../AppLinkContext';
import {NativeAppLink} from '../NativeAppLink';

/**
 * Register a method callable from other apps.
 *
 * Usage:
 *   useSharedMethod('scanner.scan', async (params) => {
 *     return { data: 'result' };
 *   });
 */
export function useSharedMethod(name, handler) {
  const {initialized, registerMethodHandler} = useContext(AppLinkContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!initialized || !name) return;

    const stableHandler = (params) => handlerRef.current(params);

    NativeAppLink.registerMethod(name);
    const unregister = registerMethodHandler(name, stableHandler);

    return () => {
      NativeAppLink.unregisterMethod(name);
      unregister();
    };
  }, [initialized, name, registerMethodHandler]);
}
