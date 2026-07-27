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
import { randomBytes } from 'node:crypto';
import { createContext, type RouterContextProvider } from 'react-router';

/** 16 bytes (128 bits) of CSPRNG-grade entropy, base64-encoded → 24 chars. */
const NONCE_BYTES = 16;

/** Generate a fresh CSP nonce. Each request must call this exactly once. */
export function generateNonce(): string {
    return randomBytes(NONCE_BYTES).toString('base64');
}

/** React Router context carrying the current request's CSP nonce. */
export const securityContext = createContext<{ nonce: string } | null>(null);

/**
 * Read the current request's CSP nonce. Returns `null` when the security
 * middleware is disabled. Server-only — call from a loader or action.
 *
 * Naming: `get*` (not `use*`) because this is not a React hook — it reads
 * the React Router context directly. Mirrors `getLocale` / `getTranslation`
 * in the i18n module.
 *
 * The nonce is meaningful only on the SSR-rendered inline script. On
 * client navigations, the loader runs again and returns a fresh nonce,
 * but no new CSP header is emitted, so the loader-returned value should
 * not be applied to scripts injected client-side.
 *
 * @example
 * ```ts
 * // In root.tsx loader:
 * const nonce = getSecurityNonce(args.context);
 * return { nonce, ...other };
 * ```
 */
export function getSecurityNonce(context: Readonly<RouterContextProvider>): string | null {
    return context.get(securityContext)?.nonce ?? null;
}
