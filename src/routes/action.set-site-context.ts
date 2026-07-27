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
import { data, redirect } from 'react-router';
import type { Route } from './+types/action.set-site-context';
import { siteContext, getSiteContextCookies, type SiteContext } from '@salesforce/storefront-next-runtime/site-context';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import { getLogger } from '@/lib/logger.server';
import { resolveCookieDomain } from '@/lib/cookie-utils.server';
import { routes } from '@/route-paths';

/**
 * Unified server action for all site context changes (site, locale, currency).
 *
 * Dispatches based on a `type` discriminator field in the form data:
 * - `type: 'site'`     — sets site + locale cookies, redirects to `/`
 * - `type: 'locale'`   — sets locale cookie, redirects to the new locale URL
 * - `type: 'currency'` — sets currency cookie, returns JSON
 *
 * Note: This MUST be a server action (not clientAction) because we need to set
 * the Set-Cookie HTTP header, which can only be done server-side.
 */
export const action = async ({ request, context }: Route.ActionArgs) => {
    const logger = getLogger(context);
    const formData = await request.formData();
    const type = formData.get('type') as string;
    const payload = JSON.parse(String(formData.get('payload') ?? '{}'));

    const cookies = getSiteContextCookies(context);
    if (!cookies) {
        logger.error('SetSiteContext: cookies not initialized');
        throw new Response('Site context cookies not initialized', { status: 500 });
    }

    switch (type) {
        case 'site': {
            const { siteId } = payload;
            if (!siteId) {
                logger.warn('SetSiteContext: siteId parameter missing');
                throw new Response('siteId is required', { status: 400 });
            }

            const config = getConfig(context);
            const site = config.commerce.sites.find((s) => s.id === siteId);
            if (!site) {
                logger.warn('SetSiteContext: site not found', {
                    siteId,
                    availableSites: config.commerce.sites.map((s) => s.id),
                });
                throw new Response(`Site "${siteId}" not found`, { status: 400 });
            }

            // Match the cookie Domain the site-context middleware would write for the target site
            // (per-site commerce.sites[].cookies.domain, else the global app.cookies.domain), so the
            // action and middleware don't write the same cookie under two different domain scopes.
            const domain = resolveCookieDomain(context, site);
            const domainOpt = domain ? { domain } : undefined;
            const [siteCookieHeader, localeCookieHeader, currencyCookieHeader] = await Promise.all([
                cookies.siteCookie.serialize(siteId, domainOpt),
                cookies.localeCookie.serialize(site.defaultLocale, domainOpt),
                cookies.currencyCookie.serialize(site.defaultCurrency, domainOpt),
            ]);

            logger.info('SetSiteContext: site changed', {
                siteId,
                defaultLocale: site.defaultLocale,
                defaultCurrency: site.defaultCurrency,
            });
            return redirect(routes.home, {
                headers: [
                    ['Set-Cookie', siteCookieHeader],
                    ['Set-Cookie', localeCookieHeader],
                    ['Set-Cookie', currencyCookieHeader],
                ],
            });
        }

        case 'locale': {
            const { locale, pathname } = payload as { locale?: string; pathname?: string };
            if (!locale) {
                logger.warn('SetSiteContext: locale parameter missing');
                throw new Response('Locale is required', { status: 400 });
            }

            const currentSite = (context.get(siteContext) as SiteContext).site;
            if (!currentSite.supportedLocales.some((l) => l.id === locale)) {
                logger.warn('SetSiteContext: unsupported locale', {
                    locale,
                    supportedLocales: currentSite.supportedLocales.map((l) => l.id),
                });
                throw new Response(`Locale "${locale}" is not supported`, { status: 400 });
            }

            // Restrict redirect to same-origin relative paths to prevent open redirects
            const redirectTo = pathname && pathname.startsWith('/') ? pathname : routes.home;

            const domain = resolveCookieDomain(context);
            const cookieHeader = await cookies.localeCookie.serialize(locale, domain ? { domain } : undefined);

            logger.info('SetSiteContext: locale changed', { locale, redirectTo });
            return redirect(redirectTo, {
                headers: {
                    'Set-Cookie': cookieHeader,
                },
            });
        }

        case 'currency': {
            const { currency } = payload as { currency?: string };
            if (!currency) {
                logger.warn('SetSiteContext: currency parameter missing');
                throw new Response('Currency is required', { status: 400 });
            }

            const currentSite = (context.get(siteContext) as SiteContext).site;
            if (!currentSite.supportedCurrencies.includes(currency)) {
                logger.warn('SetSiteContext: unsupported currency', {
                    currency,
                    supportedCurrencies: currentSite.supportedCurrencies,
                });
                throw new Response(`Currency "${currency}" is not supported`, { status: 400 });
            }

            const domain = resolveCookieDomain(context);
            const cookieHeader = await cookies.currencyCookie.serialize(currency, domain ? { domain } : undefined);

            logger.info('SetSiteContext: currency changed', { currency });
            return data(
                { success: true },
                {
                    headers: {
                        'Set-Cookie': cookieHeader,
                    },
                }
            );
        }

        default:
            throw new Response(`Unknown site context action type: "${type}"`, { status: 400 });
    }
};
