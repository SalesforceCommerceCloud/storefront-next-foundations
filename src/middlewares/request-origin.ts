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
import { createContext, type MiddlewareFunction, type RouterContextProvider } from 'react-router';

/**
 * Router context entry holding the in-flight `Request` so downstream code can
 * resolve the public origin (scheme + host) lazily — see `getAppOrigin` in
 * `@/lib/origin`. The middleware deliberately does not parse the request
 * up front: only ~5 auth callsites actually need the origin, and a lazy
 * read keeps the cost off the hot path for PDP/PLP/search/loader traffic.
 *
 * Lazily constructed on first access. Several existing component tests
 * mock `react-router` without spreading the actual module, which leaves
 * `createContext` undefined. Calling `createContext` at module-eval time
 * would crash any test whose import graph reaches this file. The lazy
 * getter defers the call until middleware/loader code (which runs outside
 * those mocked tests) actually needs it.
 */
let _requestContext: ReturnType<typeof createContext<Request | null>> | undefined;
function getRequestContext(): ReturnType<typeof createContext<Request | null>> {
    if (!_requestContext) {
        _requestContext = createContext<Request | null>(null);
    }
    return _requestContext;
}

/**
 * Middleware that stashes the in-flight `Request` in router context so
 * `getAppOrigin(context)` can resolve the public origin on demand.
 *
 * Per-request cost is a single `context.set` (no header parsing here).
 *
 * Must run before any middleware or loader that builds callback URLs (auth
 * flows, SCAPI client construction).
 */
export const requestOriginMiddleware: MiddlewareFunction<Response> = async ({ request, context }, next) => {
    context.set(getRequestContext(), request);
    return next();
};

/**
 * Reads the in-flight request from context. Returns `null` when the
 * middleware has not run for this request (e.g. bootstrap-time, tests
 * without middleware setup).
 */
export function getRequestFromContext(context: Readonly<RouterContextProvider>): Request | null {
    return context.get(getRequestContext());
}
