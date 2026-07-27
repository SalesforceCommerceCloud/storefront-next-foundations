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
 * Pure, environment-agnostic helpers for matching hybrid legacy routes and building their
 * redirect paths. Kept in a plain (non-`.client`) module because they run on BOTH the server
 * and the client — the site-aware `<Link>` (`@/components/link`) calls them during SSR, and the
 * client-only middleware (`legacy-routes.client.ts`) calls them in the browser.
 *
 * (React Router's Vite plugin strips all exports from `*.client` modules during SSR, so these
 * cannot live alongside the browser middleware — importing them there yields `undefined` on the
 * server. See `legacy-routes.client.ts` for the middleware itself.)
 */

/** A single legacy-route entry after expanding the bare-string shorthand to object form. */
export type LegacyRoute = { pattern: string; suffix?: string };

/**
 * Append a legacy SEO suffix (e.g. `.html`) to a pathname for the full-page redirect.
 *
 * Guards against double-suffixing: if the pathname already ends with the suffix, it's returned
 * unchanged. This keeps the redirect idempotent when a link is already authored with the suffix
 * (e.g. `/product/123.html`) or when the matched param itself carried it.
 */
export function appendSuffix(pathname: string, suffix?: string): string {
    if (!suffix || pathname.endsWith(suffix)) {
        return pathname;
    }
    return `${pathname}${suffix}`;
}

// Cache compiled regex patterns to avoid recreating them on every navigation
const regexCache = new Map<string, RegExp>();

/**
 * Converts a route pattern with parameters and/or wildcards into a RegExp.
 *
 * Supports:
 * - React Router style named params: ':id' matches a single path segment ([^/]+)
 * - Splat wildcard: '*' matches any path content, including '/' (.*)
 *
 * @param pattern - Route pattern like '/product/:id', '/categoryLv1/*', or '/category/:cat/*'
 * @returns RegExp that matches the pattern
 */
function routePatternToRegex(pattern: string): RegExp {
    // Escape regex specials except '*', which is treated as a wildcard below
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const withParams = escaped.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '([^/]+)');
    const withWildcards = withParams.replace(/\*/g, '.*');
    return new RegExp(`^${withWildcards}$`);
}

/**
 * Checks if a pathname matches a route pattern.
 * Supports exact matches, parameterized routes, and wildcard splats.
 *
 * @param pathname - The pathname to check (e.g., '/product/123')
 * @param pattern - The route pattern (e.g., '/product/:id', '/categoryLv1/*', or '/checkout')
 * @returns true if the pathname matches the pattern
 */
export function matchesRoutePattern(pathname: string, pattern: string): boolean {
    // If pattern has no params or wildcards, do a fast exact-string match
    if (!pattern.includes(':') && !pattern.includes('*')) {
        return pathname === pattern;
    }

    // Check the regex cache first to avoid recreating RegExp objects
    let regex = regexCache.get(pattern);
    if (!regex) {
        regex = routePatternToRegex(pattern);
        regexCache.set(pattern, regex);
    }

    return regex.test(pathname);
}

/**
 * Find the first legacy route whose pattern matches the pathname, returning the normalized entry
 * (so the caller can read its `suffix`). Returns `undefined` when nothing matches.
 *
 * Matching is trailing-slash tolerant: a pathname like `/login/` matches a `/login` pattern. The
 * legacy backend (SFRA/SiteGenesis) and CDN rewrites are inconsistent about trailing slashes — the
 * same logical route can arrive as `/login` or `/login/` depending on how it was linked or
 * rewritten — and exact patterns like `/login` would otherwise miss the slashed variant, sending
 * one form to the legacy backend and the other to Storefront Next. We try the pathname as-is
 * first, then (for non-root paths) retry with a single trailing slash trimmed. Splat patterns
 * (`/cat/*`) already absorb their own trailing slash, so this only changes exact/`:param` patterns;
 * the documented "`/parent/*` does not match bare `/parent`" behavior is unaffected.
 *
 * @param pathname - The pathname to check (already stripped of any site/locale prefix)
 * @param routes - The configured `legacyRoutes` (bare strings or `{ pattern, suffix }` objects)
 */
export function findLegacyRoute(
    pathname: string,
    routes: ReadonlyArray<string | LegacyRoute>
): LegacyRoute | undefined {
    // Candidate forms to try, in order: the pathname as-is, then a trailing-slash-trimmed variant
    // (only for non-root paths that actually end in '/'). Root '/' is never trimmed to ''.
    const candidates = pathname !== '/' && pathname.endsWith('/') ? [pathname, pathname.slice(0, -1)] : [pathname];

    for (const route of routes) {
        // Expand the bare-string shorthand to object form so existing string-only configs work.
        const normalized: LegacyRoute = typeof route === 'string' ? { pattern: route } : route;
        if (candidates.some((candidate) => matchesRoutePattern(candidate, normalized.pattern))) {
            return normalized;
        }
    }
    return undefined;
}
