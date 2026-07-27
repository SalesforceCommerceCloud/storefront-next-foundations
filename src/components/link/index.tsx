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
import { forwardRef } from 'react';
import {
    Link as RouterLink,
    NavLink as RouterNavLink,
    type LinkProps as RouterLinkProps,
    type NavLinkProps as RouterNavLinkProps,
    type To,
} from 'react-router';
import { buildUrl, useSite } from '@salesforce/storefront-next-runtime/site-context';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import { useCurrentSiteAndLocaleRef } from '@/hooks/use-current-site-and-locale-ref';
import { appendSuffix, findLegacyRoute } from '@/middlewares/legacy-routes';

/** Resolved navigation target plus whether it must bypass client-side routing. */
type ResolvedTarget = { to: To; reloadDocument: boolean };

/**
 * Resolve a `<Link to>` for the current site context, and decide whether the navigation must be a
 * full document load.
 *
 * Two cases:
 *
 * 1. **Legacy route (hybrid mode).** If `to` matches a configured `hybrid.legacyRoutes` pattern,
 *    the destination is owned by the legacy backend (SFRA / SiteGenesis), not React Router. We
 *    hand off with a real browser navigation so the CDN routes it to the legacy backend.
 *    `reloadDocument: true` makes React Router render a plain `<a>` and skip client-side routing —
 *    so it never starts a client navigation, never lazy-imports the target route chunk, and never
 *    races its own failed-chunk reload. (That race strands Safari on the current page: RR begins
 *    importing the target route module, the full-page redirect aborts the import, and RR's "Error
 *    loading route module, reloading page" recovery wins — reloading the page the user was already
 *    on. `legacy-routes.client.ts` stays as a backstop for programmatic `navigate()` calls, but
 *    link clicks are resolved here, before RR ever engages.)
 *
 *    The href is the **bare functional path** `to` (with the route's `suffix` like `.html`
 *    appended) — NOT the site-prefixed `buildUrl` output. The legacy backend applies its own
 *    site/locale prefix, so a storefront-next-prefixed path would double up
 *    (e.g. `/s/{site}/{locale}/global/en-GB/...`).
 *
 * 2. **Storefront Next route (default).** Prefix `to` with the active site/locale via `buildUrl`
 *    and let React Router handle it client-side, exactly as before.
 *
 * Non-string `to` (object form) is passed through untouched in both cases — callers that build a
 * `{ pathname, search }` object opt out of both transformations.
 */
function useResolvedTarget(to: To): ResolvedTarget {
    const { site } = useSite();
    const config = useConfig();
    const { siteRef, localeRef } = useCurrentSiteAndLocaleRef();

    // Object `to`, or no site context → behave like React Router's Link (no transform, no reload).
    if (typeof to !== 'string' || !site) {
        return { to, reloadDocument: false };
    }

    // Legacy-route check runs on the bare functional path. Unlike the client middleware — whose
    // input is the already-prefixed browser URL, so it must strip the site/locale prefix first —
    // a `<Link to>` is authored as the bare functional path (e.g. `/product/123`), exactly the
    // shape `legacyRoutes` patterns are written against. We must NOT run `stripPathPrefix` here:
    // with the default `url.prefix = '/:siteId/:localeId'` (both segments wildcards) it would
    // consume the path's own leading segments (`/product/123` → `/`), collapsing every
    // multi-segment link onto a `/` legacy route and breaking the handoff.
    const hybrid = config.hybrid;
    if (hybrid?.enabled && hybrid.legacyRoutes?.length) {
        // Split any query string / hash off a string `to` (e.g. '/product/1?c=red#r') so matching
        // and suffixing operate on the path alone. Without this, `appendSuffix` would land the
        // suffix after the query ('/product/1?c=red.html') and the `endsWith` guard would misfire.
        const queryHashStart = to.search(/[?#]/);
        const pathPart = queryHashStart === -1 ? to : to.slice(0, queryHashStart);
        const queryHash = queryHashStart === -1 ? '' : to.slice(queryHashStart);

        const matchedRoute = findLegacyRoute(pathPart, hybrid.legacyRoutes);
        if (matchedRoute) {
            return { to: `${appendSuffix(pathPart, matchedRoute.suffix)}${queryHash}`, reloadDocument: true };
        }
    }

    // Storefront Next route → site-context-prefixed, client-side navigation.
    return {
        to: buildUrl({ to, urlConfig: config.url, params: { siteId: siteRef, localeId: localeRef } }),
        reloadDocument: false,
    };
}

/**
 * Site-context-aware <Link>. Drop-in replacement for React Router's <Link>.
 * Automatically prepends URL prefix and appends search params from Url config. For configured
 * hybrid legacy routes it forces a full-document navigation (see {@link useResolvedTarget}).
 * When no SiteProvider is mounted, behaves identically to React Router's Link.
 */
export const Link = forwardRef<HTMLAnchorElement, RouterLinkProps>(function Link({ to: _to, ...rest }, ref) {
    const { to, reloadDocument } = useResolvedTarget(_to);
    return <RouterLink ref={ref} to={to} reloadDocument={reloadDocument} {...rest} />;
});

/**
 * Site-context-aware <NavLink>. Drop-in replacement for React Router's <NavLink>.
 * Inherits all NavLink functionality (active class, aria-current).
 */
export const NavLink = forwardRef<HTMLAnchorElement, RouterNavLinkProps>(function NavLink({ to: _to, ...rest }, ref) {
    const { to, reloadDocument } = useResolvedTarget(_to);
    return <RouterNavLink ref={ref} to={to} reloadDocument={reloadDocument} {...rest} />;
});
