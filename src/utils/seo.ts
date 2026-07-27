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
import { buildUrl, stripPathPrefix, type Locale, type Site } from '@salesforce/storefront-next-runtime/site-context';
import type { MetaDescriptor } from 'react-router';
import type { AppConfig } from '@/types/config';
import { buildCanonicalUrl } from '@/utils/canonical-url';

type SeoLocation = {
    pathname: string;
    search: string;
};

type SeoMetaInputs = {
    site: Site;
    appConfig: AppConfig;
    origin: string;
    locale: Locale;
    location: SeoLocation;
};

/**
 * Generates canonical and hreflang meta descriptors for the current request.
 */
export function buildSeoMetaDescriptors({
    site,
    appConfig,
    origin,
    locale,
    location,
}: SeoMetaInputs): MetaDescriptor[] {
    const currentSiteRef = site?.alias ?? site.id;
    const currentLocaleRef = locale?.alias ?? locale.id;

    const canonicalUrl = buildCanonicalUrl(origin, location.pathname, location.search);
    const canonicalDescriptors = canonicalUrl
        ? [{ tagName: 'link', rel: 'canonical', href: canonicalUrl } satisfies MetaDescriptor]
        : [];

    const barePath = getBarePath({
        pathname: location.pathname,
        urlConfig: appConfig.url,
        currentSiteRef,
        currentLocaleRef,
    });

    const alternateDescriptors = buildHreflangDescriptors({
        site,
        urlConfig: appConfig.url,
        origin,
        barePath,
        search: location.search,
        currentSiteRef,
    });

    return [...canonicalDescriptors, ...alternateDescriptors];
}

type BarePathInputs = {
    pathname: string;
    urlConfig: AppConfig['url'];
    currentSiteRef: string;
    currentLocaleRef: string;
};

function getBarePath({ pathname, urlConfig, currentSiteRef, currentLocaleRef }: BarePathInputs): string {
    if (!urlConfig?.prefix || !currentSiteRef || !currentLocaleRef) {
        return pathname;
    }

    // Resolve the prefix dynamically via buildUrl to respect the configured prefix
    // format (e.g. /:siteId/:localeId vs /:localeId/:siteId). Only pass the prefix
    // portion of urlConfig so search params aren't appended.
    const rootWithPrefix = buildUrl({
        to: '/',
        urlConfig: { prefix: urlConfig.prefix },
        params: { siteId: currentSiteRef, localeId: currentLocaleRef },
    });
    const currentPrefix = rootWithPrefix.endsWith('/') ? rootWithPrefix.slice(0, -1) : rootWithPrefix;
    return stripPathPrefix({ pathname, prefix: currentPrefix }) || '/';
}

type HreflangInputs = {
    site: Site;
    urlConfig: AppConfig['url'];
    origin: string;
    barePath: string;
    search: string;
    currentSiteRef: string;
};

function buildHreflangDescriptors({
    site,
    urlConfig,
    origin,
    barePath,
    search,
    currentSiteRef,
}: HreflangInputs): MetaDescriptor[] {
    return site.supportedLocales.flatMap((siteLocale) => {
        const localeRef = siteLocale?.alias ?? siteLocale.id;
        const localePath = buildUrl({
            to: barePath,
            urlConfig,
            params: { siteId: currentSiteRef, localeId: localeRef },
        });
        const absoluteUrl = buildCanonicalUrl(origin, localePath, search);
        // buildCanonicalUrl returns '' when origin is malformed (URL constructor throws)
        if (!absoluteUrl) return [];

        const descriptors: MetaDescriptor[] = [
            { tagName: 'link', rel: 'alternate', hrefLang: siteLocale.id, href: absoluteUrl },
        ];

        if (siteLocale.id === site.defaultLocale) {
            descriptors.push({ tagName: 'link', rel: 'alternate', hrefLang: 'x-default', href: absoluteUrl });
        }

        return descriptors;
    });
}
