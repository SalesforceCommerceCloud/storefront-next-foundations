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
 * Identity-segmentation fields derived from request headers, suitable for forwarding to
 * vendor APIs that ingest client IP / user-agent (e.g. Einstein recommendations,
 * Cloudflare Turnstile siteverify).
 */
export type ClientRequestInfo = {
    clientIp: string | undefined;
    clientUserAgent: string | undefined;
};

/**
 * Extract client IP and user-agent from the incoming `Request`.
 *
 * Mirrors the precedence used by `lib/turnstile/enforce.server.ts`: the first hop of
 * `x-forwarded-for` (the originating client behind any proxy chain), falling back to
 * `cf-connecting-ip` when XFF is absent. Empty header values resolve to `undefined`.
 */
export function getClientRequestInfo(request: Request): ClientRequestInfo {
    const clientIp =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('cf-connecting-ip') ||
        undefined;
    const clientUserAgent = request.headers.get('user-agent') || undefined;
    return { clientIp, clientUserAgent };
}
