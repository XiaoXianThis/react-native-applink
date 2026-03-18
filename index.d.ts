/**
 * react-native-applink
 *
 * Cross-app shared state & method invocation via AIDL/Binder
 * for React Native Android.
 */

import {ReactNode} from 'react';

/* ------------------------------------------------------------------ */
/*  Discovery types                                                    */
/* ------------------------------------------------------------------ */

/**
 * JSON-Schema-based method descriptor, compatible with Vercel AI SDK
 * tool definitions. Returned by {@link useDiscovery} for methods that
 * were registered with a schema.
 */
export interface MethodSchema {
  /** Human-readable description of what this method does. */
  description?: string;
  /**
   * JSON Schema describing the input parameters.
   * Can be passed directly to Vercel AI SDK's `jsonSchema()`.
   */
  parameters?: Record<string, any>;
  /** JSON Schema describing the return value (informational). */
  returns?: Record<string, any>;
}

/** Describes a method registered by a discovered app. */
export interface MethodInfo {
  /** Globally unique method name. */
  name: string;
  /** Optional schema descriptor. Present only if the method was registered with one. */
  schema?: MethodSchema;
}

export interface AppInfo {
  /** Android package name, e.g. "com.mycompany.apptools" */
  packageName: string;
  /** Human-readable label from AndroidManifest */
  appName: string;
  /** Shared-state keys registered by this app */
  states: string[];
  /** Methods registered by this app, each with optional schema metadata. */
  methods: MethodInfo[];
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export interface AppLinkProviderProps {
  /** A short identifier for the current app (used for logging / debugging). */
  appId: string;
  children: ReactNode;
}

/**
 * Wrap your root component with `<AppLinkProvider>` to enable
 * cross-app communication.
 *
 * ```jsx
 * <AppLinkProvider appId="main">
 *   <App />
 * </AppLinkProvider>
 * ```
 */
export function AppLinkProvider(props: AppLinkProviderProps): JSX.Element;

/* ------------------------------------------------------------------ */
/*  Context (advanced – rarely used directly)                          */
/* ------------------------------------------------------------------ */

export interface AppLinkContextValue {
  appId: string | null;
  initialized: boolean;
  apps: AppInfo[];
  routeTable: Record<string, string>;
  addStateListener: (
    key: string,
    listener: (value: string) => void,
  ) => () => void;
  registerMethodHandler: (
    name: string,
    handler: (params: any) => Promise<any>,
  ) => () => void;
  refreshRoutes: () => Promise<void>;
}

export const AppLinkContext: React.Context<AppLinkContextValue>;

/* ------------------------------------------------------------------ */
/*  useSharedState                                                     */
/* ------------------------------------------------------------------ */

/**
 * Cross-app shared state, works like `useState`.
 *
 * - **With** `defaultValue` → registers this app as the state **owner**.
 * - **Without** `defaultValue` → automatically discovers and **subscribes**
 *   to the remote owner.
 *
 * @param key   Globally unique state key (e.g. `"auth.token"`).
 * @param defaultValue  Optional initial value. Providing it makes this
 *                      app the owner of the state.
 * @returns `[value, setter, isReady]`
 *
 * @example
 * ```ts
 * // Owner (App A)
 * const [token, setToken, ready] = useSharedState('auth.token', '');
 *
 * // Subscriber (App B)
 * const [token, setToken, ready] = useSharedState<string>('auth.token');
 * ```
 */
export function useSharedState<T = any>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => Promise<void>, boolean];

export function useSharedState<T = any>(
  key: string,
): [T | undefined, (value: T | ((prev: T | undefined) => T)) => Promise<void>, boolean];

/* ------------------------------------------------------------------ */
/*  useSharedMethod                                                    */
/* ------------------------------------------------------------------ */

/**
 * Register a method that can be invoked by other apps.
 *
 * @param name    Globally unique method name (e.g. `"scanner.scan"`).
 * @param handler Async function that processes the call and returns a result.
 * @param schema  Optional JSON-Schema-based descriptor (compatible with
 *                Vercel AI SDK tool definitions). When provided, AI agents
 *                in other apps can discover parameter types automatically.
 *
 * @example
 * ```ts
 * // Basic (no schema)
 * useSharedMethod('scanner.scan', async (params) => {
 *   return { data: await performScan(params.type) };
 * });
 *
 * // With schema (AI-friendly)
 * useSharedMethod('scanner.scan', handler, {
 *   description: 'Scan a QR or barcode',
 *   parameters: {
 *     type: 'object',
 *     properties: {
 *       type: { type: 'string', description: 'Code type: qr | barcode' },
 *     },
 *     required: ['type'],
 *   },
 * });
 * ```
 */
export function useSharedMethod<TParams = any, TResult = any>(
  name: string,
  handler: (params: TParams) => Promise<TResult> | TResult,
  schema?: MethodSchema,
): void;

/* ------------------------------------------------------------------ */
/*  useRemoteMethod                                                    */
/* ------------------------------------------------------------------ */

/**
 * Get an async function to invoke a method registered by another app.
 *
 * @param name  The method name to call (must match a `useSharedMethod` name
 *              in some other installed app).
 * @returns     An async invoker function.
 *
 * @example
 * ```ts
 * const scan = useRemoteMethod<{ type: string }, { data: string }>('scanner.scan');
 * const result = await scan({ type: 'qr' });
 * ```
 */
export function useRemoteMethod<TParams = any, TResult = any>(
  name: string,
): (params?: TParams) => Promise<TResult>;

/* ------------------------------------------------------------------ */
/*  useDiscovery                                                       */
/* ------------------------------------------------------------------ */

export interface DiscoveryResult {
  /** List of discovered ecosystem apps (same signing certificate). */
  apps: AppInfo[];
  /** Whether initial discovery has completed. */
  initialized: boolean;
  /** Re-scan installed apps and refresh the route table. */
  refresh: () => Promise<void>;
}

/**
 * Discover installed apps that belong to the same ecosystem.
 *
 * @example
 * ```ts
 * const { apps, initialized, refresh } = useDiscovery();
 * ```
 */
export function useDiscovery(): DiscoveryResult;
