import {useEffect, useContext, useRef} from 'react';
import {AppLinkContext} from '../AppLinkContext';
import {NativeAppLink} from '../NativeAppLink';

/**
 * Register a method callable from other apps.
 *
 * @param {string} name  Globally unique method name.
 * @param {Function} handler  Async function that processes the call.
 * @param {object} [schema]  Optional JSON-Schema-based descriptor
 *   compatible with Vercel AI SDK tool definitions.
 *   - description {string}  What this method does.
 *   - parameters  {object}  JSON Schema for the input object.
 *   - returns     {object}  JSON Schema for the return value (informational).
 *
 * @example
 *   useSharedMethod('scanner.scan', handler, {
 *     description: 'Scan a QR code',
 *     parameters: {
 *       type: 'object',
 *       properties: {
 *         type: { type: 'string', description: 'Code type: qr | barcode' },
 *       },
 *       required: ['type'],
 *     },
 *   });
 */
export function useSharedMethod(name, handler, schema) {
  const {initialized, registerMethodHandler} = useContext(AppLinkContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const schemaJson = schema ? JSON.stringify(schema) : null;

  useEffect(() => {
    if (!initialized || !name) return;

    const stableHandler = (params) => handlerRef.current(params);

    NativeAppLink.registerMethod(name, schemaJson);
    const unregister = registerMethodHandler(name, stableHandler);

    return () => {
      NativeAppLink.unregisterMethod(name);
      unregister();
    };
  }, [initialized, name, schemaJson, registerMethodHandler]);
}
