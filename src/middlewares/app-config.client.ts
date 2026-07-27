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
import type { DataStrategyResult, MiddlewareFunction } from 'react-router';
import { appConfigContext, type AppConfigShape } from '@salesforce/storefront-next-runtime/config';

/**
 * Client middleware to ensure app config is in context before other middleware runs
 *
 * Reads config from window.__APP_CONFIG__ (injected by server from process.env during SSR).
 * This ensures 12-factor compliance: config comes from environment, not baked into bundle.
 *
 * Note: root.tsx also provides config via <ConfigProvider> for the initial render cycle.
 * This middleware ensures it's available in router context for loaders/actions on client navigations.
 *
 * ⚠️ Client middleware runs AFTER initial render. To access config before this middleware:
 * 1. Use window.__APP_CONFIG__ directly
 * 2. Use useConfig() hook (React Context)
 * 3. Set router context earlier in root.tsx
 */
export const appConfigMiddlewareClient: MiddlewareFunction<Record<string, DataStrategyResult>> = async (
    { context },
    next
) => {
    const appConfig = typeof window !== 'undefined' ? window.__APP_CONFIG__ : undefined;

    if (!appConfig) {
        throw new Error(
            'window.__APP_CONFIG__ not available. ' +
                'Check that server loader is injecting config into HTML via Layout component.'
        );
    }

    // SSR injects `window.__APP_CONFIG__` as `Record<string, unknown>` (the SDK
    // declares it that way to avoid forcing a type on the customer); the
    // template knows the value is its own augmented `AppConfigShape`.
    context.set(appConfigContext, appConfig as AppConfigShape);

    return next();
};
