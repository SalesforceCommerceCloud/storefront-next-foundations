//#region src/security/types.d.ts
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
 * Security response headers configuration. Plumb into the template's
 * `Config` via `AppConfig.security`; the SDK fills in defaults for any
 * field omitted.
 *
 * Setting any directive on `csp.directives` fully replaces the SDK
 * default for that directive — copy from `defaultCspDirectives` to extend.
 */
interface SecurityConfig {
  /** Master toggle. When false, the middleware is a no-op. Default: true. */
  enabled?: boolean;
  /** CSP configuration. Set to false to disable CSP only. */
  csp?: CspConfig | false;
  /** HSTS configuration. Set to false to disable HSTS only. */
  hsts?: HstsConfig | false;
  /** X-Frame-Options. Set to false to disable. Default: 'SAMEORIGIN'. */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | false;
  /** X-Content-Type-Options. Set to false to disable. Default: 'nosniff'. */
  contentTypeOptions?: 'nosniff' | false;
  /** Referrer-Policy. Set to false to disable. Default: 'strict-origin-when-cross-origin'. */
  referrerPolicy?: ReferrerPolicyValue | false;
  /** Permissions-Policy. Set to false to disable. Default: deny camera/microphone/geolocation. */
  permissionsPolicy?: Record<string, string[]> | false;
}
interface CspConfig {
  /** Map of CSP directive name → array of source values. Each directive fully replaces the SDK default. */
  directives?: CspDirectives;
  /**
   * Send 'Content-Security-Policy-Report-Only' instead of 'Content-Security-Policy'.
   * Logs a boot warning. For migration only — flip to false for production. Default: false.
   */
  reportOnly?: boolean;
}
/**
 * CSP directive map. `'upgrade-insecure-requests'` is a no-value directive
 * (its presence is the signal); all others take an array of source expressions.
 */
type CspDirectives = Partial<Record<'default-src' | 'script-src' | 'style-src' | 'img-src' | 'font-src' | 'connect-src' | 'frame-src' | 'frame-ancestors' | 'form-action' | 'base-uri' | 'object-src' | 'manifest-src' | 'media-src' | 'worker-src' | 'child-src' | 'report-uri' | 'report-to', string[]> & {
  'upgrade-insecure-requests'?: true;
}>;
interface HstsConfig {
  /** Max age in seconds. Default: 15552000 (180 days). */
  maxAge?: number;
  /** Default: true. */
  includeSubDomains?: boolean;
  /** Default: false. Setting true is a one-way decision (requires hstspreload.org submission). */
  preload?: boolean;
}
type ReferrerPolicyValue = 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
/**
 * Fully resolved (post-merge) security config — every field non-optional.
 * Used internally by the middleware after applying defaults to customer config.
 */
interface ResolvedSecurityConfig {
  enabled: boolean;
  csp: {
    directives: CspDirectives;
    reportOnly: boolean;
  } | false;
  hsts: Required<HstsConfig> | false;
  frameOptions: 'DENY' | 'SAMEORIGIN' | false;
  contentTypeOptions: 'nosniff' | false;
  referrerPolicy: ReferrerPolicyValue | false;
  permissionsPolicy: Record<string, string[]> | false;
}
//#endregion
//#region src/security/defaults.d.ts
/**
 * SDK default CSP directives. Customers extending CSP should spread this:
 *
 * ```ts
 * import { defaultCspDirectives } from '@salesforce/storefront-next-runtime/security';
 * security: {
 *   csp: {
 *     directives: {
 *       ...defaultCspDirectives,
 *       'script-src': [...defaultCspDirectives['script-src']!, 'https://cdn.foo.com'],
 *     },
 *   },
 * }
 * ```
 *
 * The per-request nonce is appended to `script-src` at request time; it is
 * NOT in this static map.
 */
declare const defaultCspDirectives: CspDirectives;
declare const defaultSecurityHeaders: ResolvedSecurityConfig;
//#endregion
export { HstsConfig as a, SecurityConfig as c, CspDirectives as i, defaultSecurityHeaders as n, ReferrerPolicyValue as o, CspConfig as r, ResolvedSecurityConfig as s, defaultCspDirectives as t };
//# sourceMappingURL=defaults.d.ts.map