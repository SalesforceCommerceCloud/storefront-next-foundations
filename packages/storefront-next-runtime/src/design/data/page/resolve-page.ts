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
import type {
    IdentifierType,
    ManifestStorage,
    ContextResolver,
    QualifierContext,
    PageMetadataOverlay,
    VariationEntry,
} from '../types';
import type { ShopperExperience } from '@/scapi-client/types';
import { ContentAssignmentResolvers } from '../manifest/content-assignment-resolvers';
import { resolveDynamicPageId } from '../manifest/resolve-dynamic-page-id';
import { getPageFromManifest } from '../manifest/get-page';
import { processPage } from './process-page';
import type { AttributeResolutionContext } from './attribute-resolution';
import { RequiredError } from '../errors/required';

/**
 * Page metadata fields the manifest builder may locale-overlay. Used by
 * {@link applyPageMetadataOverlay} to know which keys to copy from the
 * overlay onto the resolved page; structural fields like `id`, `typeId`,
 * and `regions` are intentionally excluded.
 */
const PAGE_METADATA_OVERLAY_KEYS = [
    'name',
    'aspectTypeId',
    'description',
    'pageTitle',
    'pageDescription',
    'pageKeywords',
] as const satisfies readonly (keyof PageMetadataOverlay)[];

/**
 * Applies a per-locale page metadata overlay to the variation's default-locale
 * page. The overlay is a **full replacement** for the listed metadata fields
 * — when a key is present in the overlay it wins; when absent we fall through
 * to the default-locale value (Q6 of the design plan).
 *
 * Returns a shallow copy of the page with overlaid fields applied. Structural
 * fields (`id`, `typeId`, `regions`, `data`) are never touched.
 */
function applyPageMetadataOverlay(variation: VariationEntry, locale: string): ShopperExperience.schemas['Page'] {
    const overlay = variation.pageContent?.[locale];

    if (!overlay) {
        return variation.page;
    }

    const out: ShopperExperience.schemas['Page'] = { ...variation.page };

    for (const key of PAGE_METADATA_OVERLAY_KEYS) {
        if (overlay[key] !== undefined) {
            out[key] = overlay[key];
        }
    }

    return out;
}

/**
 * Main entry point for the page resolution pipeline. Orchestrates the full flow:
 *
 * 1. **Resolve dynamic page ID** — For product/category identifiers, looks up
 *    the assigned page ID via content assignments in the site manifest.
 * 2. **Fetch page manifest** — Loads all variations for the resolved page.
 * 3. **Select variation** — Evaluates visibility rules to pick the right variation.
 * 4. **Load qualifier context** — Lazily fetches the shopper's context only if needed.
 * 5. **Process page** — Filters out components that fail visibility rules.
 *
 * Returns `null` if the page ID cannot be resolved, the manifest doesn't exist,
 * or no variation is available.
 *
 * @param options - The resolution options.
 * @param options.id - The identifier to resolve (product ID, category ID, or page ID).
 * @param options.identifierType - The type of identifier: `'product'`, `'category'`, or `'page'`.
 * @param options.locale - The locale to resolve the page for (e.g. `"en-US"`).
 * @param options.manifestStorage - Storage implementation for fetching manifests.
 * @param options.contextResolver - Optional async function that returns the shopper's qualifier context. Only called if a visibility rule needs it.
 * @param options.aspectType - The aspect type to resolve the page for when the identifier type is `'product'` or `'category'`.
 * @param options.categoryId - Optional fallback category ID (or a Promise resolving to one) used only when `identifierType` is `'product'` and the product has no content assignment for the requested aspect type. The promise is awaited lazily — the happy path never pays for it.
 * @param options.pruneInvisible - When `true` (default), invisible and overflow components are removed. When `false`, they are kept but marked `visible: false` for design/preview mode.
 * @returns The fully resolved and filtered page, or `null`.
 *
 * @example
 * ```ts
 * import { resolvePage } from '@salesforce/storefront-next-runtime/design/data';
 *
 * // Resolve the PDP page for a specific product with an active holiday campaign
 * const page = await resolvePage({
 *     id: 'nike-air-max-90',
 *     identifierType: 'product',
 *     aspectType: 'pdp',
 *     locale: 'en-US',
 *     manifestStorage: {
 *         async getPageManifest(id) {
 *             // Fetch from CDN, filesystem, or database
 *             return fetchManifest(`/manifests/${id}.json`);
 *         },
 *         async getSiteManifest() {
 *             return fetchManifest('/manifests/site.json');
 *         },
 *     },
 *     contextResolver: async () => ({
 *         customerGroups: { 'vip-customers': true },
 *         campaignQualifiers: {
 *             'holiday-sale-2026': { 'free-shipping': true },
 *         },
 *     }),
 * });
 *
 * if (page) {
 *     // page.regions contains only components visible to this VIP shopper
 *     // during the holiday sale campaign
 *     renderPage(page);
 * }
 * ```
 */
export async function resolvePage({
    id,
    identifierType,
    aspectType,
    categoryId,
    locale,
    defaultLocale,
    manifestStorage,
    contextResolver,
    attrCtx,
    pruneInvisible = true,
}: {
    id: string;
    identifierType: IdentifierType;
    aspectType?: string;
    /**
     * Fallback category ID (or a Promise resolving to one) consulted only
     * when `identifierType === 'product'` and the product has no content
     * assignment for the requested aspect type. Awaited lazily — the happy
     * path skips it.
     */
    categoryId?: string | Promise<string | null | undefined> | null;
    locale: string;
    defaultLocale: string;
    manifestStorage: ManifestStorage;
    contextResolver?: ContextResolver;
    /**
     * Per-request resolution surface for attribute envelope rewriting. Built
     * once per request by the storefront-next middleware (or Page Designer
     * preview). The `componentTypes` map travels on the
     * {@link PageManifest} itself and is read off the manifest below before
     * being threaded into {@link processPage}.
     */
    attrCtx: AttributeResolutionContext;
    pruneInvisible?: boolean;
}): Promise<ShopperExperience.schemas['Page'] | null> {
    let resolvedId: string | null = null;

    if (ContentAssignmentResolvers.has(identifierType)) {
        const siteManifest = await manifestStorage.getSiteManifest();

        RequiredError.assert(aspectType, `Aspect type is required for identifier type ${identifierType}`, (v) => !v);

        resolvedId = await resolveDynamicPageId({ id, identifierType, aspectType, siteManifest, categoryId });
    } else {
        resolvedId = id;
    }

    if (!resolvedId) {
        return null;
    }

    const pageManifest = await manifestStorage.getPageManifest(resolvedId);

    if (!pageManifest) {
        return null;
    }

    const pageResults = await getPageFromManifest(pageManifest, {
        contextResolver,
        locale,
    });

    if (!pageResults) {
        return null;
    }

    let context: QualifierContext | null = null;

    if (pageResults.entry.pageRequiresContext) {
        context = pageResults.context ?? (await contextResolver?.(pageManifest.context)) ?? null;
    }

    // Apply per-locale page metadata overlay before processing. The overlay
    // carries the SCAPI-shape page metadata fields (`name`, `aspectTypeId`,
    // `description`, `pageTitle`, `pageDescription`, `pageKeywords`) that may
    // differ per locale. When the request locale isn't in `pageContent`, we
    // fall back to the default-locale page on `variation.page`. Q6 of the
    // design plan locks in full-replacement semantics; see
    // {@link applyPageMetadataOverlay} for the field-by-field policy.
    const localizedPage = applyPageMetadataOverlay(pageResults.entry, locale);

    // Thread manifest-level pageLibraryDomain onto the resolution context so
    // the markup rewriter can resolve ?$staticlink$ without the caller having
    // to know the library domain up-front (B.2 — the manifest is the source
    // of truth for this value).
    const resolvedAttrCtx =
        pageManifest.pageLibraryDomain && !attrCtx.pageLibraryDomain
            ? { ...attrCtx, pageLibraryDomain: pageManifest.pageLibraryDomain }
            : attrCtx;

    return processPage(localizedPage, {
        qualifiers: context,
        componentInfo: pageManifest.componentInfo,
        pageInfo: {
            regions: pageResults.entry.regions,
        },
        locale,
        defaultLocale,
        attrCtx: resolvedAttrCtx,
        // `componentTypes` lives on the manifest. May be `undefined` for
        // older manifests; the optional typing on `PageProcessorContext`
        // covers that case.
        componentTypes: pageManifest.componentTypes,
        pruneInvisible,
    });
}
