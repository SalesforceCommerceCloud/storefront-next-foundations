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
import { type MiddlewareFunction, createContext as createRouterContext, type DataStrategyResult } from 'react-router';
import { isDesignModeActive, isPreviewModeActive } from '@salesforce/storefront-next-runtime/design/mode';

export type ModeDetectionContext = {
    isDesignMode: boolean;
    isPreviewMode: boolean;
};

export const modeDetectionContext = createRouterContext<ModeDetectionContext | null>(null);

/**
 * Server and client middleware to detect and set preview and design mode flags.
 * This middleware examines the request URL or window location for mode parameters and stores
 * the flags in the React Router context for use throughout the application
 */
export const modeDetectionMiddlewareServer: MiddlewareFunction<Response> = ({ request, context }, next) => {
    // These functions are isomorphic and will detect server versus client side.
    // Note: Cannot use getLogger here — this module is shared with the client middleware,
    // so importing server-only modules would break the client bundle build.
    const isDesignMode = isDesignModeActive(request);
    const isPreviewMode = isPreviewModeActive(request);

    context.set(modeDetectionContext, {
        isDesignMode,
        isPreviewMode,
    });

    return next();
};

export const modeDetectionMiddlewareClient = modeDetectionMiddlewareServer as unknown as MiddlewareFunction<
    Record<string, DataStrategyResult>
>;
