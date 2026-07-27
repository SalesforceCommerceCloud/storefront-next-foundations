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
 * Client-safe React Context for the per-request CSP nonce.
 *
 * Lives in its own file (separate from `nonce.ts`) because `nonce.ts`
 * imports `node:crypto` for `generateNonce()`. Components in the React
 * tree (rendered on both server and client) need to read the nonce
 * without dragging Node-only modules into the client bundle.
 *
 * Why a React Context (not just the route loader's return value): when
 * the root loader throws, `useRouteLoaderData('root')` returns
 * `undefined`, so any nonce surfaced through it is lost on the error
 * path — `Layout` and `ErrorBoundary` would then render inline
 * `<script>` tags without a nonce, and a strict CSP would block them,
 * killing client hydration on the error page.
 *
 * The custom server entry (`entry.server.tsx`) reads the nonce from
 * `securityContext` (which the middleware sets *before* `next()`,
 * regardless of whether the loader succeeds or throws) and wraps
 * `<ServerRouter>` with `<NonceContext.Provider>`. Both happy and
 * error paths can then read the nonce via `useSecurityNonceFromContext()`.
 */
import { createContext, useContext } from 'react';

/** React Context carrying the per-request CSP nonce through the SSR React tree. */
export const NonceContext = createContext<string | undefined>(undefined);

/**
 * React component-side reader for the per-request nonce.
 *
 * Returns `undefined` if no `NonceContext.Provider` is in the tree
 * (e.g. in tests, or a customer who hasn't ejected `entry.server.tsx`).
 * Callers should coerce `undefined` to omit the `nonce` attribute on
 * rendered `<script>` tags (React 19 omits attributes whose value is
 * `undefined`).
 */
export function useSecurityNonceFromContext(): string | undefined {
    return useContext(NonceContext);
}
