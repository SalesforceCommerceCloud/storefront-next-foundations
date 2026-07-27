/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Configuration access for loaders, actions, utilities, and React components.
 *
 * - `getConfig()` — for loaders, actions, and utilities (pass `context` on the server)
 * - `useConfig()` — for React components (hook required for React Context)
 *
 * Both return the resolved `app` slice typed as `AppConfigShape`. Templates
 * augment `AppConfigShape` once to get typed access without a per-call generic.
 */

import { useContext } from 'react';
import type { RouterContextProvider } from 'react-router';
import { ConfigContext, appConfigContext, type AppConfigShape, type ClientFacingAppConfigShape } from './context';

// Re-export so consumers can `import type { AppConfigShape } from '.../config'`
// from the package barrel without reaching into `./context`.
export type { AppConfigShape, ClientFacingAppConfigShape };

/**
 * Default return type for the client-facing reads — `useConfig()` and
 * `getConfig()`'s no-arg + maybe-context overloads. Resolves to the template's
 * `ClientFacingAppConfigShape` augmentation (typically `Omit<AppConfig, 'serverExtension'>`)
 * when present, and falls back to `AppConfigShape` otherwise — the fallback is
 * what keeps the upgrade zero-breakage for un-augmented customers.
 *
 * The conditional shape is load-bearing — do not rewrite as
 * `AppConfigShape & ClientFacingAppConfigShape`. An intersection re-introduces every
 * member from the wider `AppConfigShape` augmentation, which silently disables the
 * narrow.
 */
export type ClientFacingAppConfig = keyof ClientFacingAppConfigShape extends never
    ? AppConfigShape
    : ClientFacingAppConfigShape;

declare global {
    interface Window {
        __APP_CONFIG__?: Record<string, unknown>;
    }
}

/**
 * Get configuration in loaders, actions, and utilities. Pass `context` on the
 * server; omit it on the client (reads `window.__APP_CONFIG__`).
 *
 * - `getConfig(context)` (server) returns the full `AppConfigShape` —
 *   `.serverExtension` is reachable.
 * - `getConfig()` (client, no-arg) and `getConfig(ctx | undefined)` (the
 *   wrapper form) return the narrowed `ClientFacingAppConfig` — reading
 *   `.serverExtension` is a TypeScript error. The runtime value is `undefined`
 *   on the client anyway (the extractor strips it before `window.__APP_CONFIG__`);
 *   the narrow surfaces that at edit time.
 *
 * Server helpers needing the full shape from a maybe-context call should
 * narrow first (`if (ctx) getConfig(ctx)`) or pass `getConfig<AppConfig>(ctx)`.
 */
export function getConfig<T extends Record<string, unknown> = AppConfigShape>(
    context: Readonly<RouterContextProvider>
): T;
export function getConfig<T extends Record<string, unknown> = ClientFacingAppConfig>(): T;
export function getConfig<T extends Record<string, unknown> = ClientFacingAppConfig>(
    context: Readonly<RouterContextProvider> | undefined
): T;
export function getConfig<T extends Record<string, unknown> = AppConfigShape>(
    context?: Readonly<RouterContextProvider>
): T {
    if (context) {
        const config = context.get(appConfigContext);
        if (!config) {
            throw new Error(
                'Configuration not available in router context. ' +
                    'Ensure appConfigMiddleware.server runs before other middleware.'
            );
        }
        return config as T;
    }

    if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
        return window.__APP_CONFIG__ as T;
    }

    throw new Error(
        'Configuration not available. This can happen if:\n' +
            '1. Server: Pass context parameter: getConfig(context)\n' +
            '2. Client: Ensure window.__APP_CONFIG__ was injected during SSR\n' +
            '3. React component: Use useConfig() hook instead of getConfig()'
    );
}

/**
 * Get configuration in React components (use this instead of `getConfig` —
 * React Context requires `useContext`). Returns `ClientFacingAppConfig`, which
 * is the template's `ClientFacingAppConfigShape` augmentation (typically
 * `Omit<AppConfig, 'serverExtension'>`) when present, and falls back to the full
 * `AppConfigShape` otherwise. The fallback keeps the upgrade zero-breakage.
 */
export function useConfig<T extends Record<string, unknown> = ClientFacingAppConfig>(): T {
    const config = useContext(ConfigContext);
    if (!config) {
        throw new Error(
            'useConfig must be used within ConfigProvider. ' +
                'Ensure ConfigProvider wraps your component tree in root.tsx'
        );
    }
    return config as T;
}
