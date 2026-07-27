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
import { hybridProxyPlugin, shouldRouteToNext } from '@salesforce/storefront-next-dev';
import { loadConfig } from '@salesforce/storefront-next-runtime/config/load-config';
import type { Config } from '@/types/config';

/**
 * Collect every site/locale identifier the storefront serves — both canonical ids and
 * their site-path aliases. The proxy uses these to recognize a prefix segment as a real
 * site/locale before stripping it, so a bare legacy path (e.g. `/cart` under a
 * `/:localeId` prefix) isn't mistaken for one. Mirrors how `src/middlewares/
 * site-context.server.ts` decorates sites/locales with their alias-map entries.
 */
function collectAliases(app: Config['app']) {
    const sites = app.commerce?.sites ?? [];
    const siteAliasMap = app.siteAliasMap ?? {};
    const localeAliasMap = app.localeAliasMap ?? {};

    const siteAliases = new Set<string>();
    const localeAliases = new Set<string>();

    for (const site of sites) {
        siteAliases.add(site.id);
        if (siteAliasMap[site.id]) siteAliases.add(siteAliasMap[site.id]);
        for (const locale of site.supportedLocales ?? []) {
            localeAliases.add(locale.id);
            if (localeAliasMap[locale.id]) localeAliases.add(localeAliasMap[locale.id]);
        }
    }

    return { siteAliases: [...siteAliases], localeAliases: [...localeAliases] };
}

/**
 * Hybrid proxy for local dev against legacy SFRA. Returns false outside development.
 * See docs/README-HYBRID-PROXY.md#custom-route-matching to customize routeMatcher.
 *
 * Prefix handling is out of the box: the `url.prefix` from `config.server.ts` (e.g.
 * `/:siteId/:localeId` or `/:localeId`) is read here and passed to the SDK plugin, which
 * strips it before decorating to SFRA's `/s/{siteId}/{locale}/…` path and reuses the
 * site/locale the URL already carries. No env var or manual override is needed for the
 * standard prefix shapes; `hybridProxyPlugin`'s `rewritePath` option is the last-resort
 * escape hatch for non-standard URL models. See docs/README-HYBRID-PROXY.md.
 *
 * Env vars:
 * - HYBRID_PROXY_ENABLED: 'true' to enable proxying (string)
 *   Example: HYBRID_PROXY_ENABLED=true
 * - SFCC_ORIGIN: explicit target origin override, highest priority (string, optional)
 *   Example: SFCC_ORIGIN=https://my-sandbox.demandware.net
 * - SCAPI_PROXY_HOST: secondary target origin override (string, optional)
 *   Example: SCAPI_PROXY_HOST=https://internal-proxy.example.com
 * - HYBRID_ROUTING_RULES: routing rules string (string, optional)
 *   Example: HYBRID_ROUTING_RULES='/account/*,/wishlist/*'
 * - HYBRID_PROXY_LOCALE: fallback locale for paths that carry no locale prefix (string, optional)
 *   Priority: HYBRID_PROXY_LOCALE > i18n fallbackLng > 'default' (plugin fallback). With a
 *   locale-bearing `url.prefix`, the locale comes from the path and this is only the fallback.
 *   Example: HYBRID_PROXY_LOCALE=en-US
 */
export async function hybridProxy({ mode, env }: { mode: string; env: Record<string, string> }) {
    if (mode !== 'development') return false;

    // Skip the config load + alias scan when the proxy is off — nothing downstream uses them.
    const enabled = process.env.HYBRID_PROXY_ENABLED === 'true';
    if (!enabled) {
        return hybridProxyPlugin({
            enabled: false,
            targetOrigin: '',
            routingRules: '',
            routeMatcher: shouldRouteToNext,
        });
    }

    const shortCode = env.PUBLIC__app__commerce__api__shortCode;
    const scapiProxyHost = process.env.SCAPI_PROXY_HOST;

    // url.prefix and the site/locale catalog aren't env-overridable, so read them from
    // config.server.ts the same way route discovery does (jiti under vite-node).
    const { app } = await loadConfig<Config>();
    const { siteAliases, localeAliases } = collectAliases(app);

    return hybridProxyPlugin({
        enabled,
        targetOrigin:
            process.env.SFCC_ORIGIN ||
            scapiProxyHost ||
            (shortCode && `https://${shortCode}.api.commercecloud.salesforce.com`) ||
            '',
        routingRules: process.env.HYBRID_ROUTING_RULES ?? '',
        routeMatcher: shouldRouteToNext,
        defaultSiteId: env.PUBLIC__app__defaultSiteId,
        locale: process.env.HYBRID_PROXY_LOCALE || env.PUBLIC__app__i18n__fallbackLng,
        urlPrefix: app.url?.prefix,
        siteAliases,
        localeAliases,
    });
}
