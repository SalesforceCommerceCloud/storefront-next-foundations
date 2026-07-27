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
import type { ContextResolver, PageManifest, QualifierContext, VariationEntry } from '../types';
import { validateRule } from '../validate-rule';

/**
 * Selects the appropriate page variation from a manifest by evaluating each
 * variation's visibility rule in order. Returns the first variation whose rule
 * passes, or falls back to the manifest's default variation.
 *
 * The qualifier context is resolved lazily — the `contextResolver` is only
 * called when a variation's `ruleRequiresContext` flag is `true`, and only
 * once (the result is cached for subsequent variations).
 *
 * @param manifest - The page manifest containing all variations.
 * @param options - Resolution options.
 * @param options.contextResolver - Optional async function that returns the shopper's qualifier context. Only called if a variation's rule needs it.
 * @param options.locale - The current locale (e.g. `"en_US"`). Used to evaluate locale-based visibility rules.
 * @returns The selected variation entry and resolved context, or `null` if no variation (including default) exists.
 *
 * @example
 * ```ts
 * import { getPageFromManifest } from '@salesforce/storefront-next-runtime/design/data';
 *
 * const manifest = {
 *     pageId: 'homepage',
 *     context: { campaignQualifiers: [], customerGroups: ['vip-customers'], dataBindings: [] },
 *     variationOrder: ['vip-homepage', 'holiday-homepage'],
 *     variations: {
 *         'vip-homepage': {
 *             ruleRequiresContext: true,
 *             pageRequiresContext: false,
 *             visibilityRule: { activeLocales: ['en-US'], customerGroups: ['vip-customers'] },
 *             page: { id: 'homepage', typeId: 'storePage', regions: [] },
 *             regions: {},
 *         },
 *         'holiday-homepage': {
 *             ruleRequiresContext: false,
 *             pageRequiresContext: false,
 *             visibilityRule: {
 *                 activeLocales: ['en-US'],
 *                 schedule: {
 *                     start: new Date('2026-12-01').toISOString(),
 *                     end: new Date('2026-12-31').toISOString(),
 *                 },
 *             },
 *             page: { id: 'homepage', typeId: 'storePage', regions: [] },
 *             regions: {},
 *         },
 *         'default-homepage': {
 *             ruleRequiresContext: false,
 *             pageRequiresContext: false,
 *             page: { id: 'homepage', typeId: 'storePage', regions: [] },
 *             regions: {},
 *         },
 *     },
 *     defaultVariation: 'default-homepage',
 *     componentInfo: {},
 * };
 *
 * // VIP shopper — matches first variation
 * const result = await getPageFromManifest(manifest, {
 *     locale: 'en-US',
 *     contextResolver: async () => ({
 *         customerGroups: { 'vip-customers': true },
 *         campaignQualifiers: {},
 *     }),
 * });
 * // result.entry === manifest.variations['vip-homepage']
 *
 * // Non-VIP shopper outside holiday window — falls back to default
 * const fallback = await getPageFromManifest(manifest, {
 *     locale: 'en-US',
 *     contextResolver: async () => ({
 *         customerGroups: {},
 *         campaignQualifiers: {},
 *     }),
 * });
 * // fallback.entry === manifest.variations['default-homepage']
 * ```
 */
export async function getPageFromManifest(
    manifest: PageManifest,
    {
        contextResolver,
        locale,
    }: {
        contextResolver?: ContextResolver;
        locale: string;
    }
): Promise<{
    entry: VariationEntry;
    context: QualifierContext | null;
} | null> {
    let context: QualifierContext | null = null;
    let resolvedVariation: VariationEntry | null = null;

    for (const variationId of manifest.variationOrder) {
        const variation = manifest.variations[variationId];

        if (variation?.ruleRequiresContext && !context) {
            context = (await contextResolver?.(manifest.context)) ?? null;
        }

        if (!variation?.visibilityRule || validateRule(variation.visibilityRule, locale, context)) {
            resolvedVariation = variation;
            break;
        }
    }

    if (!resolvedVariation) {
        resolvedVariation = manifest.variations[manifest.defaultVariation];
    }

    if (!resolvedVariation) {
        return null;
    }

    return {
        entry: resolvedVariation,
        context,
    };
}
