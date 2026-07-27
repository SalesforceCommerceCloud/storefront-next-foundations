import * as react0 from "react";

//#region src/security/nonce-context.d.ts

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
/** React Context carrying the per-request CSP nonce through the SSR React tree. */
declare const NonceContext: react0.Context<string | undefined>;
/**
 * React component-side reader for the per-request nonce.
 *
 * Returns `undefined` if no `NonceContext.Provider` is in the tree
 * (e.g. in tests, or a customer who hasn't ejected `entry.server.tsx`).
 * Callers should coerce `undefined` to omit the `nonce` attribute on
 * rendered `<script>` tags (React 19 omits attributes whose value is
 * `undefined`).
 */
declare function useSecurityNonceFromContext(): string | undefined;
//#endregion
export { NonceContext, useSecurityNonceFromContext };
//# sourceMappingURL=security-react.d.ts.map