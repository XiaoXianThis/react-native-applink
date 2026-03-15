import {useCallback, useContext, useRef} from 'react';
import {AppLinkContext} from '../AppLinkContext';
import {NativeAppLink} from '../NativeAppLink';

/**
 * Get an async function to invoke a method registered by another app.
 *
 * Usage:
 *   const scan = useRemoteMethod('scanner.scan');
 *   const result = await scan({ type: 'qr' });
 */
export function useRemoteMethod(name) {
  const {initialized, routeTable} = useContext(AppLinkContext);
  const routeRef = useRef(routeTable);
  routeRef.current = routeTable;

  return useCallback(
    async (params = {}) => {
      if (!initialized) {
        throw new Error('[AppLink] Not initialized yet');
      }

      const targetPackage = routeRef.current[name];
      if (!targetPackage) {
        throw new Error(
          `[AppLink] Method "${name}" not found in any connected app`,
        );
      }

      const resultJson = await NativeAppLink.invokeRemoteMethod(
        targetPackage,
        name,
        JSON.stringify(params),
      );

      const result = JSON.parse(resultJson);
      if (result && result.__error) {
        throw new Error(result.message);
      }
      return result;
    },
    [initialized, name],
  );
}
