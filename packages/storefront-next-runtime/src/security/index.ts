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
export { createSecurityHeadersMiddleware } from './middleware.js';
export { defaultSecurityHeaders, defaultCspDirectives } from './defaults.js';
export { securityContext, getSecurityNonce } from './nonce.js';
export { resolveCsp } from './contributors/resolve-csp.js';
export { validateContributors } from './contributors/registry.js';
export { normalizeCspOrigin, inspectCspOrigin } from './contributors/origin.js';
export { BoundedCache } from './contributors/lru-cache.js';
export type { CspOriginIssue, CspOriginInspection } from './contributors/origin.js';
export type { ResolveCspInput, ResolvedCsp } from './contributors/resolve-csp.js';
export type { CspContributor, CspContribution, CspResolutionContext, CspDirectiveName } from './contributors/types.js';
// React-only exports (NonceContext, useSecurityNonceFromContext) live at
// `@salesforce/storefront-next-runtime/security/react` — a separate, browser-
// safe entry that doesn't drag in node:crypto / zod via the main module.
export type {
    SecurityConfig,
    CspConfig,
    CspDirectives,
    HstsConfig,
    ReferrerPolicyValue,
    ResolvedSecurityConfig,
} from './types.js';
