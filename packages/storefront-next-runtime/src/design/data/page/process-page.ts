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
import { transformPage } from './transform';
import { resolveComponentDataBindings } from './resolve-data-bindings';
import {
    resolveAttributeValues,
    type AttributeDefinition,
    type AttributeResolutionContext,
} from './attribute-resolution';
import { validateRule } from '../validate-rule';
import type { QualifierContext, PageManifest, VariationEntry, RegionInfo } from '../types';
import type { ShopperExperience } from '@/scapi-client/types';

/**
 * Context required for page processing. Contains the shopper's runtime
 * qualifiers, the component-level visibility rules, and the locale used
 * to resolve locale-specific component content from the page manifest.
 */
export interface PageProcessorContext {
    /** The shopper's active qualifiers (campaigns, customer groups), or `null` if not resolved. */
    qualifiers: QualifierContext | null;
    /** Component visibility rule definitions extracted from the page layout. */
    componentInfo: PageManifest['componentInfo'];
    /** Page-level region configuration (e.g. maxComponents limits) for top-level regions not nested under a component. */
    pageInfo: {
        regions: VariationEntry['regions'];
    };
    /** The locale to use when resolving locale-specific component content (e.g. `"en_US"`). */
    locale: string;
    /** The site's default locale, used as a fallback when the current locale has no content entry (e.g. `"en_US"`). */
    defaultLocale: string;
    /**
     * Per-request resolution surface used by {@link resolveAttributeValues} to
     * convert manifest envelopes into the wire shape SCAPI `getPage` would have
     * returned. The storefront-next middleware builds it once per request and
     * Page Designer preview supplies an editor-mode equivalent.
     */
    attrCtx: AttributeResolutionContext;
    /**
     * Per-component-type attribute definitions hoisted by the manifest builder.
     * Keyed by `typeId`. Optional — when omitted, the resolver falls back to
     * structural detection for the image envelope and passes everything else
     * through.
     */
    componentTypes?: Record<string, { attributeDefinitions: Record<string, AttributeDefinition> }>;
    /**
     * When `true` (default), invisible components are removed from the tree and
     * regions are truncated to their `maxComponents` limit. When `false`, invisible
     * components and overflow components are kept in the tree but marked with
     * `visible: false` — used in design/preview mode so the editor can display them.
     */
    pruneInvisible?: boolean;
}

/**
 * Filters a page's components based on their visibility rules and resolves
 * data binding expressions in a single traversal. Traverses the page tree
 * using the visitor pattern and:
 *
 * 1. Removes any component whose visibility rules do not pass against the
 *    shopper's qualifier context.
 * 2. Resolves data binding expressions in each surviving component's `data`
 *    attributes using the resolved data bindings from context resolution.
 *
 * A component is visible if **any** of its visibility rules pass (OR logic).
 * If a component has rules and none of them pass, it is removed. Components
 * without rules are always included.
 *
 * @param page - The page to process.
 * @param context - The processing context with qualifier data, visibility rules, and resolved data bindings.
 * @returns A new page with invisible components filtered out and data binding expressions resolved.
 *
 * @example
 * ```ts
 * import { processPage } from '@salesforce/storefront-next-runtime/design/data';
 *
 * const page = {
 *     id: 'homepage',
 *     typeId: 'storePage',
 *     regions: [{
 *         id: 'main',
 *         components: [
 *             { id: 'public-banner', typeId: 'commerce_assets.heroBanner', regions: [] },
 *             { id: 'loyalty-offer', typeId: 'commerce_assets.promoTile', regions: [] },
 *         ],
 *     }],
 * };
 *
 * // The "loyalty-offer" component requires the shopper to be in "loyalty-members"
 * const componentInfo = {
 *     'public-banner': { visibilityRules: [] },
 *     'loyalty-offer': {
 *         visibilityRules: [{ customerGroups: ['loyalty-members'] }],
 *     },
 * };
 *
 * // Guest shopper — not in any customer group
 * const filtered = processPage(page, {
 *     qualifiers: { customerGroups: {}, campaignQualifiers: {} },
 *     componentInfo,
 * });
 * // filtered.regions[0].components has only "public-banner"
 * // "loyalty-offer" was removed because the shopper isn't a loyalty member
 * ```
 */
/**
 * Builds a component's `data` map by walking each attribute definition and
 * picking the first non-undefined value in priority order:
 *
 *   active-locale content → fallback content → attrDef.defaultValue
 *
 * The fallback bucket is selected whole-blob style (matching SCAPI/SFRA's
 * `__data` resolution): the site-default-locale bucket if it carries any
 * content, otherwise the literal-default ("default") bucket. Buckets are not
 * per-key merged with each other — only the active-locale bucket layers
 * per-key on top of the chosen fallback (preserving today's locale override
 * semantics).
 *
 * If none of those have a value the attribute is omitted from the result.
 *
 * When no `typeDefs` are supplied, we fall back to the legacy behavior:
 * `{ ...nodeData, ...fallbackContent, ...localeContent }`. This keeps
 * already-deployed manifests rendering until the manifest builder starts
 * emitting `componentTypes`.
 */
function composeComponentData({
    nodeData,
    literalDefaultContent,
    defaultContent,
    localeContent,
    typeDefs,
}: {
    nodeData: Record<string, unknown> | undefined;
    literalDefaultContent: Record<string, unknown>;
    defaultContent: Record<string, unknown>;
    localeContent: Record<string, unknown>;
    typeDefs: Record<string, AttributeDefinition> | undefined;
}): Record<string, unknown> {
    const fallbackContent = Object.keys(defaultContent).length > 0 ? defaultContent : literalDefaultContent;

    if (!typeDefs || Object.keys(typeDefs).length === 0) {
        return {
            ...(nodeData ?? {}),
            ...fallbackContent,
            ...localeContent,
        };
    }

    const result: Record<string, unknown> = {};

    for (const attrId of Object.keys(typeDefs)) {
        const def = typeDefs[attrId];

        if (Object.prototype.hasOwnProperty.call(localeContent, attrId)) {
            result[attrId] = localeContent[attrId];
        } else if (Object.prototype.hasOwnProperty.call(fallbackContent, attrId)) {
            result[attrId] = fallbackContent[attrId];
        } else if (def.defaultValue !== undefined) {
            result[attrId] = def.defaultValue;
        }
    }

    return result;
}

export function processPage(
    page: ShopperExperience.schemas['Page'],
    processorContext: PageProcessorContext
): ShopperExperience.schemas['Page'] {
    const { pruneInvisible = true } = processorContext;

    return transformPage(page, {
        visitPage(ctx) {
            // Page-level `data` is rare today (most pages carry no top-level
            // attributes), but the schema permits it and SCAPI passes whatever
            // is there straight through. Run the resolver so any image-typed
            // page attribute lights up the same way component attributes do.
            // We only emit a `data` property when the source page had one, to
            // match the SCAPI shape (which omits the field for pages without
            // top-level attributes).
            const pageNode = ctx.node;
            const result: ShopperExperience.schemas['Page'] = {
                ...pageNode,
                regions: ctx.visitRegions(pageNode.regions),
            };

            if (pageNode.data !== undefined) {
                const typeDefs = processorContext.componentTypes?.[pageNode.typeId]?.attributeDefinitions;
                result.data = resolveAttributeValues(
                    pageNode.data as Record<string, unknown>,
                    pageNode.typeId,
                    typeDefs,
                    processorContext.attrCtx
                ) as typeof pageNode.data;
            }

            return result;
        },
        visitRegion(ctx) {
            let regionInfo: RegionInfo | undefined;

            if (ctx.parent?.type === 'page') {
                regionInfo = processorContext.pageInfo.regions[ctx.node.id];
            } else if (ctx.parent?.type === 'component') {
                regionInfo = processorContext.componentInfo[ctx.parent.node.id]?.regions?.[ctx.node.id];
            }

            // Visit each component first — this runs visitComponent which
            // filters out components that fail their visibility rules.
            let components = ctx.visitComponents(ctx.node.components);

            if (regionInfo?.maxComponents != null) {
                if (pruneInvisible) {
                    components = components.slice(0, regionInfo.maxComponents);
                } else {
                    const result: ShopperExperience.schemas['Component'][] = [];
                    let visibleCount = 0;

                    for (const comp of components) {
                        if (comp.visible) {
                            visibleCount++;
                        }

                        if (visibleCount > regionInfo.maxComponents) {
                            result.push({ ...comp, visible: false });
                        } else {
                            result.push(comp);
                        }
                    }

                    components = result;
                }
            }

            return {
                ...ctx.node,
                components,
            };
        },
        visitComponent(ctx) {
            const componentInfo = processorContext.componentInfo[ctx.node.id];
            const visibilityRules = componentInfo?.visibilityRules ?? [];
            let isVisible = true;

            // Visibility rules use OR logic: the component is visible
            // if ANY rule passes. Only remove it when it has its own
            // rules and none of them pass.
            if (visibilityRules.length > 0) {
                const anyRulePassed = visibilityRules.some((rule) =>
                    validateRule(rule, processorContext.locale, processorContext.qualifiers)
                );

                if (!anyRulePassed) {
                    if (pruneInvisible) {
                        return null;
                    }

                    isVisible = false;
                }
            }

            // Compose the component's `data` map per attribute definition with
            // resolution priority: active-locale content → fallback content →
            // attribute-definition default value → key omitted. The fallback
            // is the site-default-locale bucket when present, otherwise the
            // literal-default ("default") bucket. Whole-blob fallback matches
            // SCAPI's `__data` resolution — the literal-default does not
            // per-key merge with the site-default-locale blob.
            // When no type definitions are available, fall back to the legacy
            // merge so existing manifests still resolve.
            const literalDefaultContent = componentInfo?.content?.default ?? {};
            const defaultContent = componentInfo?.content?.[processorContext.defaultLocale] ?? {};
            const localeContent = componentInfo?.content?.[processorContext.locale] ?? {};
            const isLocalized = Boolean(componentInfo?.content?.[processorContext.locale]);
            const typeDefs = processorContext.componentTypes?.[ctx.node.typeId]?.attributeDefinitions;

            const composedData = composeComponentData({
                nodeData: ctx.node.data as Record<string, unknown> | undefined,
                literalDefaultContent,
                defaultContent,
                localeContent,
                typeDefs,
            });

            const name = componentInfo?.name ?? ctx.node.name;
            const fragment = componentInfo?.fragment ?? ctx.node.fragment ?? false;

            let node: ShopperExperience.schemas['Component'] = {
                ...ctx.node,
                name,
                fragment,
                localized: isLocalized,
                visible: isVisible,
                data: composedData as typeof ctx.node.data,
            };

            // Resolve data binding expressions (overrides content for bound attributes).
            node = resolveComponentDataBindings(
                node,
                componentInfo?.dataBinding,
                processorContext.qualifiers?.dataBindings
            );

            // Stamp attribute envelopes with the per-request URL/host/route info.
            // Runs *after* the data-binding overlay so any binding-resolved values
            // are also passed through the resolver (e.g. markup/url rewriting).
            const resolvedData = resolveAttributeValues(
                node.data as Record<string, unknown> | undefined,
                node.typeId,
                typeDefs,
                processorContext.attrCtx
            );

            node = {
                ...node,
                data: resolvedData as typeof node.data,
            };

            return {
                ...node,
                regions: ctx.visitRegions(ctx.node.regions),
            };
        },
    }) as ShopperExperience.schemas['Page'];
}
