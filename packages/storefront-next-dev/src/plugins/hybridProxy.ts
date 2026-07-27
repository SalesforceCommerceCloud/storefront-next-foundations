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
 * Vite plugin for hybrid proxying between Storefront Next and legacy SFRA.
 *
 * **LOCAL DEVELOPMENT ONLY** - This plugin only works with `pnpm dev` (Vite dev server).
 * For MRT/production deployments, use Cloudflare eCDN routing instead.
 *
 * ## Dependency injection via `routeMatcher`
 *
 * This plugin accepts a `routeMatcher` callback instead of importing routing logic
 * directly. The template owns the routing logic (e.g., `ecdn-matcher.ts`) and passes
 * it in when configuring the plugin. This keeps the SDK package pure — it knows nothing
 * about template internals — while allowing the template to inject merchant-specific
 * routing rules.
 *
 * The same `routeMatcher` pattern can be used by the future MRT server middleware.
 *
 * ## How it works
 *
 * 1. Intercepts HTTP requests BEFORE React Router sees them
 * 2. Checks routing rules: matching routes → React Router, non-matching → proxy to SFCC
 * 3. Rewrites paths: /cart → /s/{siteId}/{locale}/cart (SFRA format)
 * 4. Rewrites cookies: Domain=.salesforce.com → Domain=localhost (session continuity)
 * 5. Rewrites HTML/JSON bodies: replaces SFCC origin URLs with localhost (keeps client-side nav proxied)
 *
 * This enables seamless navigation between Next pages (/) and SFRA pages (/cart) without
 * visible redirects or session loss. The browser URL stays localhost:5173/cart.
 *
 * ## Environment variables
 *
 * - HYBRID_PROXY_ENABLED (required) - 'true' to enable the plugin
 * - HYBRID_ROUTING_RULES (required) - Cloudflare routing expression (routes matching go to Next)
 * - SFCC_ORIGIN (required) - SFCC sandbox URL (e.g., https://zzrf-001.dx.commercecloud.salesforce.com)
 * - HYBRID_PROXY_LOCALE (optional) - Locale for SFRA path transformation (e.g., 'en-GB')
 *
 * The host plugin is responsible for sourcing `defaultSiteId` and `locale` from the
 * template's config (e.g. `config.server.ts`) and/or env vars and passing them in.
 */

import type { Plugin, ViteDevServer } from 'vite';
import httpProxy from 'http-proxy';
import type { IncomingMessage } from 'http';
import { gunzipSync, brotliDecompressSync, inflateSync } from 'zlib';
import { stripPathPrefix, extractPrefixParamValues } from '@salesforce/storefront-next-runtime/site-context';
import { logger } from '../logger';

export interface HybridProxyPluginOptions {
    /** Whether hybrid proxying is enabled */
    enabled: boolean;
    /** SFCC origin URL to proxy non-matching routes to */
    targetOrigin: string;
    /** Cloudflare routing expression (routes matching go to Next) */
    routingRules: string;
    /**
     * Callback that decides if a pathname should be handled by Storefront Next.
     * Called for every request that isn't a Vite internal or SFCC path.
     * Receives the pathname and the raw `routingRules` string; returns true to
     * let React Router handle it, false to proxy to SFCC.
     *
     * @example
     * import { shouldRouteToNext } from './src/lib/ecdn-matcher';
     * hybridProxyPlugin({ routeMatcher: shouldRouteToNext, ... })
     */
    routeMatcher: (pathname: string, routingRules: string) => boolean;
    /** SFCC default site ID (e.g., 'RefArchGlobal'). Required when `enabled` is true. */
    defaultSiteId?: string;
    /** Locale for SFRA paths (e.g., 'en-GB'). Defaults to 'default' if not provided. */
    locale?: string;
    /**
     * The storefront's `url.prefix` (from `config.server.ts`), e.g. `'/:siteId/:localeId'`
     * or `'/:localeId'`. When set, the proxy strips this prefix from the incoming path
     * before decorating to SFRA's `/s/{siteId}/{locale}/…` form, and reuses the
     * site/locale the path already carries instead of the `defaultSiteId`/`locale`
     * fallbacks. This is what keeps a prefixed request like `/uk/cart` from being
     * double-stacked into `/s/{siteId}/{locale}/uk/cart`.
     *
     * Prefix support is OOTB: with `url.prefix` configured, no further opt-in is needed.
     * Leave undefined (or `'/'`) for storefronts that emit bare functional paths.
     */
    urlPrefix?: string;
    /**
     * Known locale identifiers — every locale `id` AND `alias` the storefront serves
     * (e.g. `['en-GB', 'uk', 'de-DE']`). Used to confirm that a captured prefix segment
     * is really a locale before treating it as one, so a bare path like `/cart` under a
     * `/:localeId` prefix isn't mistaken for the locale `cart`. The matched value is
     * passed straight through as the SFRA locale path segment (SFRA resolves both the
     * BM site-path alias `uk` and the canonical `en-GB`).
     */
    localeAliases?: string[];
    /**
     * Known site identifiers — every site `id` AND `alias` the storefront serves
     * (e.g. `['RefArchGlobal', 'global']`). Same role as {@link localeAliases} for the
     * `:siteId` segment of a `/:siteId/:localeId`-style prefix.
     */
    siteAliases?: string[];
    /**
     * Last-resort escape hatch: fully override how an incoming proxy path is rewritten
     * to the SFRA path. Receives the bare pathname (no query) and returns the SFRA path
     * (no query — the proxy re-appends the original query string). Return `null` to fall
     * back to the built-in OOTB rewrite.
     *
     * Prefer leaving this undefined: with `urlPrefix` set the built-in rewrite already
     * handles all standard prefix shapes. Use this only for a non-standard URL model the
     * prefix machinery can't express.
     */
    rewritePath?: (pathname: string) => string | null;
}

/**
 * Check if a request path should skip proxying (Vite internals, assets, etc.)
 *
 * @param pathname - URL pathname to check
 * @returns true if the request should NOT be proxied
 */
export function shouldSkipProxy(pathname: string): boolean {
    // Vite virtual modules (@vite/client, @fs/, @id/, etc.)
    if (pathname.startsWith('/@')) return true;

    // Vite dev server internals
    if (pathname.startsWith('/__')) return true;

    // Source files served by Vite
    if (pathname.startsWith('/src/')) return true;

    // Node modules
    if (pathname.startsWith('/node_modules/')) return true;

    // React Router data requests
    if (pathname.endsWith('.data')) return true;

    // SCAPI proxy paths (handled by React Router)
    if (pathname.startsWith('/mobify/')) return true;

    // SFRA static assets - these MUST be proxied to SFCC
    // /on/demandware.static/... - static assets (CSS, JS, images)
    // /on/demandware.store/... - dynamic endpoints
    if (pathname.startsWith('/on/demandware.')) {
        return false; // DO proxy these to SFCC
    }

    // Vite build output and other asset files (served by Vite/React Router)
    // Only skip if NOT an SFRA path (checked above)
    if (/\.(js|jsx|ts|tsx|css|json|map|woff2?|ttf|svg|png|jpe?g|gif|webp|ico|mp4)$/i.test(pathname)) {
        return true;
    }

    return false;
}

/**
 * Rewrite Set-Cookie header for localhost development.
 *
 * Rewrites SFCC Set-Cookie headers so they work on localhost during local development.
 *
 * **LOCAL DEVELOPMENT ONLY** — This function is part of the hybrid proxy Vite plugin
 * which only runs during `pnpm dev`. In production (MRT deployments), SFCC cookies
 * flow through the eCDN unmodified.
 *
 * Rewrites applied:
 * - **Domain**: `.salesforce.com` → `localhost` (browsers reject cross-domain cookies)
 *
 * Attributes intentionally preserved:
 * - **Secure**: Kept. Localhost is a secure context — browsers accept `Secure` cookies
 *   on `http://localhost` (see https://w3c.github.io/webappsec-secure-contexts/).
 * - **SameSite**: Kept. `SameSite=None; Secure` is valid on localhost since `Secure`
 *   is accepted. This keeps SFCC cookies transparent and in sync with Storefront Next
 *   cookies, which is critical for hybrid auth session bridging.
 *
 * @param cookie - Original Set-Cookie header value from SFCC
 * @returns Rewritten cookie suitable for localhost
 *
 * @example
 * Input:  "dwsid=abc123; Domain=.salesforce.com; Path=/; Secure; SameSite=None; HttpOnly"
 * Output: "dwsid=abc123; Domain=localhost; Path=/; Secure; SameSite=None; HttpOnly"
 */
export function rewriteCookieForLocalhost(cookie: string): string {
    let rewritten = cookie;

    // Replace Domain= with localhost (case-insensitive)
    rewritten = rewritten.replace(/Domain=[^;]+/gi, 'Domain=localhost');

    // Add Domain=localhost if not present
    if (!/Domain=/i.test(cookie)) {
        // Insert after first attribute (cookie name=value)
        rewritten = rewritten.replace(/^([^;]+)/, '$1; Domain=localhost');
    }

    return rewritten.trim();
}

/**
 * Inline script injected into proxied HTML responses to intercept `document.cookie` writes.
 *
 * **Why this is needed (Layer 3 cookie rewriting):**
 *
 * The hybrid proxy rewrites Set-Cookie headers from SFCC responses (Layer 1), but after
 * the SFRA page fully loads, client-side JavaScript sets cookies via `document.cookie`.
 * These writes bypass the proxy entirely.
 *
 * SFRA's JS typically checks `window.location.protocol` to decide whether to add `Secure`.
 * On `http://localhost`, it sees `http:` and omits `Secure`, producing cookies like:
 *
 *     document.cookie = "dwsid=abc; SameSite=None"   // No Secure → browser rejects
 *
 * This interceptor patches `document.cookie` to:
 * 1. Rewrite `Domain=...` → `Domain=localhost`
 * 2. Ensure `Secure` is present (localhost is a secure context)
 * 3. If `SameSite=None` is present without `Secure`, add `Secure`
 *
 * This keeps client-side cookie writes consistent with the proxy's Layer 1 rewrites
 * and ensures hybrid auth cookies (dwsid, cc-*) stay in sync between Storefront Next
 * and SFRA.
 *
 * **LOCAL DEVELOPMENT ONLY** — This script is only injected by the Vite dev server proxy.
 */
const COOKIE_INTERCEPTOR_SCRIPT = `<script data-hybrid-proxy="cookie-interceptor">
(function() {
    var desc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    if (!desc || !desc.set) return;
    Object.defineProperty(document, 'cookie', {
        get: function() { return desc.get.call(this); },
        set: function(val) {
            // Rewrite Domain to localhost
            val = val.replace(/Domain=[^;]+/gi, 'Domain=localhost');
            // Ensure Secure is present if SameSite=None (localhost is a secure context)
            if (/SameSite=None/i.test(val) && !/;\\s*Secure\\b/i.test(val)) {
                val += '; Secure';
            }
            desc.set.call(this, val);
        },
        configurable: true
    });
})();
</script>`;

/**
 * Escape special regex characters in a string for use in `new RegExp()`.
 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Resolve a captured prefix segment to its canonical-cased alias, case-insensitively.
 * Returns the matching entry from `aliases` (preserving the catalog's casing) so the value
 * forwarded to SFRA is always the expected canonical form, or `undefined` when the segment
 * isn't a known site/locale identifier.
 */
function matchAlias(segment: string | undefined, aliases: string[]): string | undefined {
    if (segment === undefined) return undefined;
    const lower = segment.toLowerCase();
    return aliases.find((alias) => alias.toLowerCase() === lower);
}

/**
 * Rewrite an incoming proxy pathname to the SFRA `/s/{siteId}/{locale}/…` shape.
 *
 * This is the OOTB path transform. It is `url.prefix`-aware: when `urlPrefix` is set
 * it strips the configured prefix to recover the bare functional path AND reuses the
 * site/locale the path already carried — so a prefixed request like `/uk/cart` becomes
 * `/s/{siteId}/uk/cart` rather than the double-stacked `/s/{siteId}/{locale}/uk/cart`.
 *
 * It handles every standard prefix shape uniformly:
 * - no prefix (`''`/`/`):     `/cart`            → `/s/{site}/{locale}/cart`
 * - `/:localeId`:             `/uk/cart`         → `/s/{site}/uk/cart`
 * - `/:siteId/:localeId`:     `/global/uk/cart`  → `/s/global/uk/cart`
 *
 * Disambiguation: a captured prefix segment is only treated as a site/locale when it is
 * a known identifier (`siteAliases`/`localeAliases`). This stops a bare path like `/cart`
 * under a `/:localeId` prefix — which is structurally indistinguishable from a locale
 * home `/uk` — from being mis-stripped (here `cart` isn't a known locale, so the whole
 * path is treated as the bare functional path and decorated with the `defaultSiteId`/
 * `defaultLocale` fallbacks). When a prefix segment IS a known site/locale, that value is
 * passed straight through as the SFRA path segment; SFRA resolves both the BM site-path
 * alias (`uk`) and the canonical id (`en-GB`).
 *
 * Paths already in SFCC shape (`/s/…`, `/on/demandware.…`) are returned unchanged — the
 * caller is expected to skip them, but this stays defensive.
 *
 * Pure function (query string handled by the caller) so it's unit-testable in isolation.
 *
 * @param pathname - Incoming pathname on the proxy (no query string).
 * @param opts.defaultSiteId - Site to use when the path doesn't carry one.
 * @param opts.defaultLocale - Locale to use when the path doesn't carry one.
 * @param opts.urlPrefix - The storefront's `url.prefix` (e.g. `'/:siteId/:localeId'`).
 * @param opts.localeAliases - Known locale ids + aliases.
 * @param opts.siteAliases - Known site ids + aliases.
 */
export function rewriteToSfraPath(
    pathname: string,
    opts: {
        defaultSiteId: string;
        defaultLocale: string;
        urlPrefix?: string;
        localeAliases?: string[];
        siteAliases?: string[];
    }
): string {
    const { defaultSiteId, defaultLocale, urlPrefix, localeAliases = [], siteAliases = [] } = opts;

    // Already SFCC-shaped — nothing to decorate.
    if (pathname.startsWith('/s/') || pathname.startsWith('/on/demandware.')) {
        return pathname;
    }

    // Default to the configured fallbacks; override below if the path carries its own.
    let site = defaultSiteId;
    let locale = defaultLocale;
    let barePath = pathname;
    // Whether the locale came from the path (a real locale segment) vs. the fallback.
    // A locale home like `/uk` carries a locale even though its bare path is `/`, so it
    // must keep the locale in the SFRA path; only a truly locale-less root drops it.
    let localeFromPath = false;

    if (urlPrefix && urlPrefix !== '/') {
        const captured = extractPrefixParamValues({ pathname, prefix: urlPrefix });

        // Keys off the literal placeholder names `siteId`/`localeId` — the only names the
        // framework's prefix producers ever emit: `<Link>` and `useNavigate` build `params`
        // as `{ siteId, localeId }`, so a prefix with any other placeholder would already be
        // unresolvable storefront-wide before reaching the proxy.
        // Match captured segments against the known identifiers case-insensitively — shoppers
        // and links routinely use mixed case (`/en-gb/cart`, `/UK/cart`) even though the
        // canonical ids are cased (`en-GB`). A case-sensitive match here would reject those and
        // fall through to the double-stack this function exists to prevent. The matched value is
        // the *canonical-cased* alias from the catalog (not the raw segment), so SFRA always
        // receives the casing it expects.
        const matchedSite = 'siteId' in captured ? matchAlias(captured.siteId, siteAliases) : undefined;
        const matchedLocale = 'localeId' in captured ? matchAlias(captured.localeId, localeAliases) : undefined;

        // Only honor the captured segments when they're genuine site/locale identifiers.
        // This is what distinguishes a locale home (`/uk`) from a bare legacy path (`/cart`)
        // when both fit a single-segment `/:localeId` prefix.
        const siteOk = !('siteId' in captured) || matchedSite !== undefined;
        const localeOk = !('localeId' in captured) || matchedLocale !== undefined;

        if (Object.keys(captured).length > 0 && siteOk && localeOk) {
            if (matchedSite) site = matchedSite;
            if (matchedLocale) {
                locale = matchedLocale;
                localeFromPath = true;
            }
            // Strip the prefix to the bare functional path; '' (locale home) coerces to '/'.
            barePath = stripPathPrefix({ pathname, prefix: urlPrefix }) || '/';
        }
    }

    if (barePath === '/') {
        // A locale home (`/uk` → bare `/` but locale known) keeps its locale: SFRA serves
        // the localized site root at `/s/{site}/{locale}/`. A truly locale-less root maps to
        // the bare `/s/{site}` so SFCC resolves the default — decorating it with a fallback
        // locale would proxy to a non-existent storefront URL.
        return localeFromPath ? `/s/${site}/${locale}/` : `/s/${site}`;
    }

    return `/s/${site}/${locale}${barePath}`;
}

/**
 * Discriminated result of {@link rewriteLocationForProxy}.
 *
 * - `rewritten` — Location was same-origin; the proxy URL is in `url`.
 * - `off-origin` — Location points elsewhere; pass the original header through.
 * - `malformed` — Location couldn't be parsed; caller should warn and pass through.
 */
export type LocationRewriteResult = { kind: 'rewritten'; url: string } | { kind: 'off-origin' } | { kind: 'malformed' };

/**
 * Rewrite an SFCC Location header so the user stays on the proxy origin AND so
 * any query params from the original request survive an SFCC redirect.
 *
 * SFCC frequently redirects bare paths like `/cart` to a canonical SFRA URL
 * (`/s/{siteId}/{locale}/Cart-Show`) without echoing the user's query string in
 * the Location header. Without this merge step, params like `?foo=bar` set by
 * the storefront — including ones the destination page expects — get dropped on
 * the cross-app hop.
 *
 * Resolution rules:
 * - Off-origin Location → `{ kind: 'off-origin' }` so the caller leaves the
 *   header unchanged and the browser navigates as SFCC intended.
 * - Same-origin Location → rewrite the origin to the proxy host, then merge the
 *   original request's query params into the redirect target's URL. Multi-value
 *   keys (e.g. SFRA's `pmid=...&pmid=...`) are preserved on both sides. The
 *   redirect target wins on collision so SFCC can intentionally override a key.
 * - Malformed Location → `{ kind: 'malformed' }` so the caller can warn.
 *
 * @param locationHeader - Raw Location header value from the SFCC response.
 * @param requestUrl - Original request URL on the proxy (e.g. `/cart?foo=bar`).
 * @param targetOrigin - SFCC origin used as the base for relative Location values.
 * @param proxyOrigin - Proxy origin (e.g. `http://localhost:5173`) the caller wants the user to stay on.
 */
export function rewriteLocationForProxy({
    locationHeader,
    requestUrl,
    targetOrigin,
    proxyOrigin,
}: {
    locationHeader: string;
    requestUrl: string;
    targetOrigin: string;
    proxyOrigin: string;
}): LocationRewriteResult {
    let locationUrl: URL;
    try {
        locationUrl = new URL(locationHeader, targetOrigin);
    } catch {
        return { kind: 'malformed' };
    }

    if (locationUrl.origin !== targetOrigin) {
        return { kind: 'off-origin' };
    }

    let requestQuery: URLSearchParams;
    try {
        requestQuery = new URL(requestUrl, proxyOrigin).searchParams;
    } catch {
        requestQuery = new URLSearchParams();
    }

    // Snapshot the redirect target's keys before mutating, so `has(key)` reflects
    // only what SFCC put there. Without this snapshot, the first appended value
    // for a multi-value key would mark the key "present" and drop the rest —
    // breaking SFRA patterns that repeat keys (e.g. `pmid=PROMO1&pmid=PROMO2`).
    const targetKeys = new Set(locationUrl.searchParams.keys());
    for (const [key, value] of requestQuery) {
        if (!targetKeys.has(key)) {
            locationUrl.searchParams.append(key, value);
        }
    }

    return {
        kind: 'rewritten',
        url: `${proxyOrigin}${locationUrl.pathname}${locationUrl.search}${locationUrl.hash}`,
    };
}

/** Cap loud values in debug logs so a long URL doesn't drown the dev console. */
function truncateForLog(value: string, max = 120): string {
    return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * Vite plugin for hybrid proxying between Storefront Next and legacy SFRA.
 *
 * Uses http-proxy to silently forward non-matching requests to SFCC without visible
 * redirects. Rewrites Set-Cookie headers, Location headers, and HTML/JSON response
 * bodies to keep all navigation within the localhost proxy.
 *
 * Routing decisions are delegated to the `routeMatcher` callback injected via options,
 * keeping the SDK free of template-specific routing logic.
 *
 * @param options - Plugin configuration
 * @returns Vite plugin
 */
export function hybridProxyPlugin(options: HybridProxyPluginOptions): Plugin {
    if (!options.enabled) {
        logger.debug('Hybrid proxy disabled (HYBRID_PROXY_ENABLED is not true)');
        return {
            name: 'hybrid-proxy',
        };
    }

    if (!options.targetOrigin) {
        logger.warn('Hybrid proxy: no target origin configured (SFCC_ORIGIN required)');
        return {
            name: 'hybrid-proxy',
        };
    }

    if (!options.defaultSiteId) {
        throw new Error(
            'Hybrid proxy is enabled but no default site ID was provided.\n\n' +
                'Set PUBLIC__app__defaultSiteId in your .env file:\n' +
                '  PUBLIC__app__defaultSiteId=RefArchGlobal\n\n' +
                'See docs/README-HYBRID-PROXY.md for the full reference.'
        );
    }

    logger.info(`Hybrid proxy enabled → ${options.targetOrigin}`);
    logger.debug(`Hybrid proxy routing rules: ${options.routingRules.slice(0, 100)}...`);
    const locale = options.locale || 'default';
    const defaultSiteId = options.defaultSiteId;
    const { urlPrefix, localeAliases, siteAliases, rewritePath } = options;
    logger.debug(
        urlPrefix
            ? `Hybrid proxy path transformation: url.prefix=${urlPrefix} → /s/${defaultSiteId}/{locale}/{bare path}`
            : `Hybrid proxy path transformation: / → /s/${defaultSiteId}, /path → /s/${defaultSiteId}/${locale}/path`
    );

    // Pre-compile regex for URL rewriting in response bodies
    const targetOriginPattern = new RegExp(escapeRegExp(options.targetOrigin), 'g');

    // Create http-proxy instance
    // selfHandleResponse: true prevents http-proxy from automatically piping the
    // proxy response to the client. This lets us buffer HTML responses and rewrite
    // SFCC URLs to localhost, keeping client-side navigation within the proxy.
    const proxy = httpProxy.createProxyServer({
        changeOrigin: true,
        followRedirects: false,
        selfHandleResponse: true,
    });

    // Rewrite request path to SFRA format (/s/{siteId}/{locale}/path)
    proxy.on('proxyReq', (proxyReq, req) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const pathname = url.pathname;

        // Check if path needs SFRA decoration
        // Skip if:
        // - Already has /s/ prefix
        // - Is an /on/demandware.* path (already in SFCC format)
        const needsTransformation = !pathname.startsWith('/s/') && !pathname.startsWith('/on/demandware.');

        if (needsTransformation) {
            const originalPath = proxyReq.path;

            // Last-resort escape hatch: let a customer fully override the path rewrite.
            // Returning null falls through to the built-in, prefix-aware OOTB rewrite.
            const overridden = rewritePath?.(pathname) ?? null;
            const sfraPath =
                overridden ??
                rewriteToSfraPath(pathname, {
                    defaultSiteId,
                    defaultLocale: locale,
                    urlPrefix,
                    localeAliases,
                    siteAliases,
                });

            // Re-append the original query string. `url.search` includes the leading '?'
            // (or is '') so params survive the SFRA hop — SFCC otherwise drops them.
            proxyReq.path = `${sfraPath}${url.search}`;
            logger.debug(`Hybrid proxy path rewrite: ${originalPath} → ${proxyReq.path}`);
        }
    });

    // Handle all proxy responses manually (required by selfHandleResponse: true).
    // For HTML responses: buffer body, decompress, rewrite SFCC URLs to localhost.
    // For non-HTML responses: pipe through with header rewrites only.
    proxy.on('proxyRes', (proxyRes: IncomingMessage, req, res) => {
        const clientRes = res;

        // --- Safety net: detect SFCC error redirects ---
        // When SFCC doesn't recognize a URL it redirects to its 404 page and clears
        // session cookies. This usually means the routing rules are misconfigured —
        // a path that should go to Storefront Next is being proxied to SFCC instead.
        // Strip Set-Cookie headers from these responses to prevent cookie corruption.
        //
        // Both shapes of error redirect are caught: a real 3xx redirect to /404, and
        // a SFRA `plugin_redirect` 200+Location pointing at /404. The 200 case would
        // otherwise reach the 200→302 normalization below and forward SFRA's
        // session-clear cookies to the browser as a "real" redirect — wiping the
        // hybrid session even though the shopper can recover by navigating to a
        // valid URL.
        const locationHeader = proxyRes.headers.location;
        const statusCode = proxyRes.statusCode || 200;
        const isRedirectToError =
            typeof locationHeader === 'string' &&
            /\/404\b/.test(locationHeader) &&
            ((statusCode >= 300 && statusCode < 400) || statusCode === 200);

        if (isRedirectToError) {
            logger.warn(
                `⚠️  SFCC returned a redirect to 404 for ${req.url}. ` +
                    `This usually means your HYBRID_ROUTING_RULES are missing a pattern for this path. ` +
                    `Stripping Set-Cookie headers to prevent session cookie corruption. ` +
                    `Fix: add a matching pattern to HYBRID_ROUTING_RULES (e.g., "^${req.url?.split('?')[0]}.*")`
            );
            delete proxyRes.headers['set-cookie'];
        }

        // --- Header rewrites (apply to ALL responses) ---

        // Rewrite Set-Cookie headers for localhost (skip if already stripped above)
        const setCookieHeaders = proxyRes.headers['set-cookie'];
        if (setCookieHeaders && Array.isArray(setCookieHeaders)) {
            proxyRes.headers['set-cookie'] = setCookieHeaders.map((cookie) => {
                const rewritten = rewriteCookieForLocalhost(cookie);
                logger.debug(`Hybrid proxy cookie rewrite: ${cookie.slice(0, 50)}... → ${rewritten.slice(0, 50)}...`);
                return rewritten;
            });
        }

        // Rewrite Location header in redirects to keep user on localhost AND merge
        // the original request's query params into the redirect target. SFCC redirects
        // bare paths like `/cart` to a canonical SFRA URL without echoing the request's
        // query string, so params like `?foo=bar` would be dropped on the cross-app hop
        // without this merge.
        //
        // Same-origin redirects also get the SFRA `plugin_redirect` 200+Location
        // normalization: that cartridge sometimes returns HTTP 200 with a Location
        // header instead of a proper 3xx redirect, and browsers only follow Location
        // on 3xx responses. We convert 200+Location into a 302 short-circuit so the
        // browser actually follows the redirect. The conversion is nested inside the
        // `rewritten` branch because (a) same-origin is the trust boundary we're
        // willing to coerce a 302 from, and (b) `result.url` is the value we need to
        // emit. An external 200+Location flows through unchanged via the `off-origin`
        // branch, matching the existing trust boundary.
        if (locationHeader && typeof locationHeader === 'string') {
            const proxyOrigin = `http://${req.headers.host}`;
            const result = rewriteLocationForProxy({
                locationHeader,
                requestUrl: req.url ?? '',
                targetOrigin: options.targetOrigin,
                proxyOrigin,
            });
            if (result.kind === 'rewritten') {
                proxyRes.headers.location = result.url;
                logger.debug(
                    `Hybrid proxy location rewrite: ${truncateForLog(locationHeader)} → ${truncateForLog(result.url)}`
                );

                if (statusCode === 200) {
                    proxyRes.resume(); // drain upstream — we're discarding the body
                    const redirectHeaders: Record<string, string | string[]> = {
                        location: result.url,
                    };
                    const setCookie = proxyRes.headers['set-cookie'];
                    if (setCookie) {
                        redirectHeaders['set-cookie'] = setCookie;
                    }
                    clientRes.writeHead(302, redirectHeaders);
                    clientRes.end();
                    logger.debug(
                        `Hybrid proxy normalized 200+Location → 302 for ${req.url} (Location: ${truncateForLog(result.url)})`
                    );
                    return;
                }
            } else if (result.kind === 'malformed') {
                logger.warn(`Hybrid proxy: invalid Location header: ${truncateForLog(locationHeader)}`);
            }
            // off-origin: leave the header alone so the browser follows SFCC's intended redirect
        }

        // --- Response body handling ---

        const contentType = (proxyRes.headers['content-type'] || '').split(';')[0].trim();
        const isRewritable = contentType === 'text/html' || contentType === 'application/json';

        if (!isRewritable) {
            // Non-HTML/JSON: write headers and pipe body through unchanged
            clientRes.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
            proxyRes.pipe(clientRes);
            return;
        }

        // HTML or JSON: buffer the response body for URL rewriting
        const chunks: Buffer[] = [];
        proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
        proxyRes.on('end', () => {
            let body: Buffer<ArrayBufferLike> = Buffer.concat(chunks);

            // Decompress if needed
            const encoding = proxyRes.headers['content-encoding'];
            if (encoding === 'gzip') {
                body = gunzipSync(body);
            } else if (encoding === 'br') {
                body = brotliDecompressSync(body);
            } else if (encoding === 'deflate') {
                body = inflateSync(body);
            }

            // Rewrite SFCC origin URLs to localhost so client-side navigation stays proxied
            const proxyOrigin = `http://${req.headers.host}`;
            let text = body.toString('utf8');
            // Reset lastIndex since the regex has the global flag and is reused across calls
            targetOriginPattern.lastIndex = 0;
            text = text.replace(targetOriginPattern, proxyOrigin);

            // Inject document.cookie interceptor into HTML responses.
            // Must run before any SFRA script, so inject at the start of <head>.
            if (contentType === 'text/html') {
                const headIndex = text.indexOf('<head');
                if (headIndex !== -1) {
                    const insertAfter = text.indexOf('>', headIndex);
                    if (insertAfter !== -1) {
                        text = text.slice(0, insertAfter + 1) + COOKIE_INTERCEPTOR_SCRIPT + text.slice(insertAfter + 1);
                    }
                }
            }

            // Update headers: remove content-encoding (we decompressed) and fix content-length
            const headers = { ...proxyRes.headers };
            delete headers['content-encoding'];
            delete headers['transfer-encoding'];
            headers['content-length'] = String(Buffer.byteLength(text, 'utf8'));

            clientRes.writeHead(proxyRes.statusCode || 200, headers);
            clientRes.end(text);

            logger.debug(`Hybrid proxy rewrote ${contentType} body URLs for ${req.url}`);
        });
    });

    // Error handling
    proxy.on('error', (err, req, res) => {
        logger.error(`Hybrid proxy error: ${err.message} ${req.url}`);
        if ('writeHead' in res && !res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('Bad Gateway: Failed to proxy to SFCC');
        }
    });

    return {
        name: 'hybrid-proxy',
        enforce: 'pre', // Run before Vite's internal middleware

        configureServer(server: ViteDevServer) {
            server.middlewares.use((req, res, next) => {
                const pathname = req.url?.split('?')[0] || '';

                // Skip Vite internals and assets
                if (shouldSkipProxy(pathname)) {
                    return next();
                }

                // SFCC paths always proxy (even if routing rules don't explicitly exclude them)
                // These are internal SFCC endpoints and static assets
                const isSFCCPath = pathname.startsWith('/on/demandware.');

                // Check routing rules (unless it's an SFCC path)
                let shouldRouteToNextApp = false;
                if (!isSFCCPath) {
                    try {
                        shouldRouteToNextApp = options.routeMatcher(pathname, options.routingRules);
                    } catch (error) {
                        // Fail-safe: if routing check fails, let React Router handle it
                        logger.error(`Hybrid proxy error checking routing rules: ${String(error)}`);
                        return next();
                    }

                    if (shouldRouteToNextApp) {
                        // Let React Router handle this route
                        return next();
                    }
                }

                // Proxy to SFCC
                logger.debug(`Hybrid proxy: ${req.method} ${pathname} → ${options.targetOrigin}`);

                try {
                    proxy.web(req, res, {
                        target: options.targetOrigin,
                    });
                } catch (error) {
                    logger.error(`Hybrid proxy failed to proxy request: ${String(error)}`);
                    if (!res.headersSent) {
                        res.writeHead(502, { 'Content-Type': 'text/plain' });
                        res.end('Bad Gateway: Failed to proxy to SFCC');
                    }
                }
            });
        },
    };
}
