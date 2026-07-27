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

import { createCookie, type Cookie, type CookieOptions } from 'react-router';
import { isRemote } from '../env';

/**
 * Base cookie options for site context cookies (site, locale, currency).
 *
 * Internal: `secure` is intentionally absent so it can be resolved per call via
 * {@link isRemote} in {@link resolveCookieOptions} (reflecting `BUNDLE_ID` at
 * request time rather than at module load). Because it is incomplete on its own,
 * it is not exported — consumers use the factory functions below, which always
 * apply the correct `secure` value.
 */
const COOKIE_OPTIONS = {
    path: '/',
    sameSite: 'lax' as const,
    httpOnly: true,
};

/**
 * Build the per-call cookie options.
 *
 * `secure` is gated on {@link isRemote} (BUNDLE_ID), NOT `NODE_ENV`: `pnpm
 * preview` runs a production build over plain-HTTP `localhost`, where a
 * `NODE_ENV` gate would emit `Secure` and Safari/WebKit would then refuse to
 * persist these cookies. This keeps the signal consistent with the auth-cookie
 * defaults and the HSTS / upgrade-insecure-requests gates. Caller `options` win,
 * so an explicit `secure` still overrides the default.
 */
function resolveCookieOptions(options?: CookieOptions): CookieOptions {
    return { ...COOKIE_OPTIONS, secure: isRemote(), ...options };
}

/**
 * Creates a cookie instance with the given name.
 *
 * @param name - Cookie name
 * @returns Cookie instance configured with site context options
 */
export function createSiteContextCookie(name: string, options?: CookieOptions): Cookie {
    return createCookie(name, resolveCookieOptions(options));
}

/**
 * Creates a currency cookie instance with the given name.
 *
 * @param name - Cookie name
 * @returns Cookie instance configured with site context cookie options
 */
export function createCurrencyCookie(name: string, options?: CookieOptions): Cookie {
    return createCookie(name, resolveCookieOptions(options));
}

/**
 * WeakMap to pass resolved locale from site context middleware to i18next's findLocale.
 * WeakMap allows garbage collection when requests are done.
 * This is necessary because findLocale() only receives the Request object, not the router context.
 */
export const requestToLocaleMap = new WeakMap<Request, string>();
