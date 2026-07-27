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
import type { ShopperExperience } from '@/scapi-client/types';
import { VisitorContextError } from '../errors/visitor-context-error';
import type { InferNodeFromType, VisitorContextType } from '../types';

/**
 * Context object passed to {@link PageVisitor} handler methods during page tree
 * traversal. Provides access to the current node via {@link node}, the tree
 * position via {@link page}, {@link parentRegion}, and {@link parentComponent},
 * and traversal methods ({@link visitRegions}, {@link visitComponents}) for
 * continuing into child nodes.
 *
 * When a visitor handler is defined, the handler is responsible for traversing
 * into children by calling the appropriate context method. If the handler does
 * not call these methods, children will not be visited.
 */
export class VisitorContext<TNode> {
    constructor(
        private readonly context: {
            /** The current node being visited. */
            node: TNode;
            /** The node type */
            type: VisitorContextType;
            /** The visitor being used to transform the page tree. */
            visitor: PageVisitor;
            /** The root page being traversed. */
            page?: ShopperExperience.schemas['Page'];
            /** The parent visitor context, providing access to the node that contains the current one in the page tree. */
            parent?: VisitorContext<
                | ShopperExperience.schemas['Page']
                | ShopperExperience.schemas['Region']
                | ShopperExperience.schemas['Component']
            >;
            /** The parent region of the current node, if traversing within a region. */
            parentRegion?: ShopperExperience.schemas['Region'];
            /** The parent component of the current node, if traversing within a component's nested regions. */
            parentComponent?: ShopperExperience.schemas['Component'];
        }
    ) {}

    get type(): VisitorContextType {
        return this.context.type;
    }

    /**
     * The current node being visited.
     */
    get node(): TNode {
        return this.context.node;
    }

    /**
     * The root page being traversed.
     */
    get page(): ShopperExperience.schemas['Page'] | undefined {
        return this.context.page;
    }

    /**
     * The parent visitor context, providing access to the node that contains the current one in the page tree.
     */
    get parent():
        | VisitorContext<
              | ShopperExperience.schemas['Page']
              | ShopperExperience.schemas['Region']
              | ShopperExperience.schemas['Component']
          >
        | undefined {
        return this.context.parent;
    }

    /**
     * The parent region of the current node, if traversing within a region.
     */
    get parentRegion(): ShopperExperience.schemas['Region'] | undefined {
        return this.context.parentRegion;
    }

    /**
     * The parent component of the current node, if traversing within a component's nested regions.
     */
    get parentComponent(): ShopperExperience.schemas['Component'] | undefined {
        return this.context.parentComponent;
    }

    /**
     * Traverses an array of regions, invoking the visitor's `visitRegion` handler
     * on each one. Regions for which the handler returns `null` are excluded from
     * the result. Call this from within a `visitPage` or `visitComponent` handler
     * to continue traversal into child regions.
     *
     * @param regions - The regions to traverse.
     * @returns The filtered array of transformed regions.
     *
     * @example
     * ```ts
     * transformPage(page, {
     *     visitPage(context) {
     *         // Traverse into regions explicitly
     *         const regions = context.visitRegions(context.node.regions);
     *         return { ...context.node, regions };
     *     },
     * });
     * ```
     */
    visitRegions(regions: ShopperExperience.schemas['Region'][] = []): ShopperExperience.schemas['Region'][] {
        const newRegions = [];

        for (const region of regions) {
            const newRegion = this.visitRegion(region);

            if (newRegion) {
                newRegions.push(newRegion);
            }
        }

        return newRegions;
    }

    /**
     * Traverses a single region. If the visitor has a `visitRegion` handler, the
     * handler is called with a new {@link VisitorContext} for the region. Otherwise,
     * the region's child components are traversed automatically.
     *
     * @param region - The region to visit.
     * @returns The transformed region, or `null` to exclude it.
     */
    visitRegion(region: ShopperExperience.schemas['Region']): ShopperExperience.schemas['Region'] | null {
        const regionContext = this.toChildContext('region', region);

        if (this.context.visitor.visitRegion) {
            return this.context.visitor.visitRegion(regionContext);
        } else if (region.components) {
            return {
                ...region,
                components: regionContext.visitComponents(region.components),
            };
        }

        return region;
    }

    /**
     * Traverses an array of components, invoking the visitor's `visitComponent`
     * handler on each one. Components for which the handler returns `null` are
     * excluded from the result. Call this from within a `visitRegion` handler to
     * continue traversal into child components.
     *
     * @param components - The components to traverse.
     * @returns The filtered array of transformed components.
     *
     * @example
     * ```ts
     * transformPage(page, {
     *     visitRegion(context) {
     *         // Traverse into components explicitly
     *         const components = context.visitComponents(context.node.components);
     *         return { ...context.node, components };
     *     },
     * });
     * ```
     */
    visitComponents(
        components: ShopperExperience.schemas['Component'][] = []
    ): ShopperExperience.schemas['Component'][] {
        const newComponents = [];

        for (const component of components) {
            const newComponent = this.visitComponent(component);

            if (newComponent) {
                newComponents.push(newComponent);
            }
        }

        return newComponents;
    }

    /**
     * Traverses a single component. If the visitor has a `visitComponent` handler,
     * the handler is called with a new {@link VisitorContext} for the component.
     * Otherwise, the component's nested regions are traversed automatically.
     *
     * @param component - The component to visit.
     * @returns The transformed component, or `null` to exclude it.
     */
    visitComponent(component: ShopperExperience.schemas['Component']): ShopperExperience.schemas['Component'] | null {
        const componentContext = this.toChildContext('component', component);

        if (this.context.visitor.visitComponent) {
            return this.context.visitor.visitComponent(componentContext);
        } else if (component.regions) {
            return {
                ...component,
                regions: componentContext.visitRegions(component.regions),
            };
        }

        return component;
    }

    /**
     * Traverses a single page. If the visitor has a `visitPage` handler, the
     * handler is called with a new {@link VisitorContext} for the page. Otherwise,
     * the page's regions are traversed automatically.
     *
     * @param page - The page to visit.
     * @returns The transformed page, or `null` to exclude it.
     */
    visitPage(page: ShopperExperience.schemas['Page']): ShopperExperience.schemas['Page'] | null {
        const pageContext = new VisitorContext({
            type: 'page',
            visitor: this.context.visitor,
            page,
            parentComponent: undefined,
            parentRegion: undefined,
            parent: undefined,
            node: page,
        });

        if (this.context.visitor.visitPage) {
            return this.context.visitor.visitPage(pageContext);
        } else if (page.regions) {
            const newPage = {
                ...page,
                regions: pageContext.visitRegions(page.regions),
            };

            return newPage;
        }

        return page;
    }

    private toChildContext<TType extends VisitorContextType>(
        type: TType,
        node: InferNodeFromType<TType>
    ): VisitorContext<InferNodeFromType<TType>> {
        VisitorContextError.assert(this.context.type, type);

        const parent = this as VisitorContext<
            | ShopperExperience.schemas['Region']
            | ShopperExperience.schemas['Component']
            | ShopperExperience.schemas['Page']
        >;

        if (type === 'region') {
            return new VisitorContext({
                type: 'region',
                visitor: this.context.visitor,
                page: this.page,
                node,
                parent,
                parentComponent: this.node as ShopperExperience.schemas['Component'],
                parentRegion: this.parentRegion,
            });
        }

        return new VisitorContext({
            type: 'component',
            visitor: this.context.visitor,
            page: this.page,
            node,
            parent,
            parentComponent: this.parentComponent,
            parentRegion: this.node as ShopperExperience.schemas['Region'],
        });
    }
}

class RootVisitorContext extends VisitorContext<null> {
    constructor(visitor: PageVisitor) {
        super({
            node: null,
            type: 'root',
            visitor,
        });
    }
}

/**
 * Visitor interface for traversing and transforming a Page Designer page tree.
 * Implement any combination of visit methods to intercept pages, regions, or
 * components during traversal. Return `null` from `visitRegion` or
 * `visitComponent` to remove that element from the tree.
 */
export interface PageVisitor {
    visitPage?(context: VisitorContext<ShopperExperience.schemas['Page']>): ShopperExperience.schemas['Page'];
    visitRegion?(
        context: VisitorContext<ShopperExperience.schemas['Region']>
    ): ShopperExperience.schemas['Region'] | null;
    visitComponent?(
        component: VisitorContext<ShopperExperience.schemas['Component']>
    ): ShopperExperience.schemas['Component'] | null;
}

/**
 * Traverses a page tree using the visitor pattern, applying the visitor's
 * callbacks to the page, its regions, and their nested components. This is
 * the top-level entry point for page tree transformation.
 *
 * When a visitor handler is defined, it receives a {@link VisitorContext} and
 * is responsible for traversing into children using the context's traversal
 * methods (`visitRegions`, `visitComponents`). If the handler does not call
 * these methods, children will not be visited. When no handler is defined for
 * a node type, children are traversed automatically.
 *
 * Returning `null` from a `visitRegion` or `visitComponent` callback removes
 * that element and its children from the resulting tree.
 *
 * @param page - The page to traverse.
 * @param visitor - The visitor with callbacks to apply at each tree node.
 * @returns A new page with visitor transformations applied, or `null`.
 *
 * @example
 * ```ts
 * import { transformPage } from '@salesforce/storefront-next-runtime/design/data';
 *
 * const page = { id: 'homepage', typeId: 'storePage', regions: [
 *     { id: 'header', components: [
 *         { id: 'hero-banner', typeId: 'commerce_assets.heroBanner', regions: [] },
 *         { id: 'promo-tile', typeId: 'commerce_assets.promoTile', regions: [] },
 *     ]},
 * ]};
 *
 * // When only visitComponent is defined, regions are traversed automatically.
 * // The handler receives a VisitorContext — use context.node to access the component.
 * transformPage(page, {
 *     visitComponent(context) {
 *         console.log(`Component: ${context.node.typeId} in region ${context.parentRegion?.id}`);
 *         return context.node;
 *     },
 * });
 *
 * // When visitRegion is defined, the handler must traverse into children explicitly.
 * // Without calling context.visitComponents(), components inside the region are skipped.
 * transformPage(page, {
 *     visitRegion(context) {
 *         console.log(`Entering region: ${context.node.id}`);
 *         const components = context.visitComponents(context.node.components);
 *         return { ...context.node, components };
 *     },
 *     visitComponent(context) {
 *         console.log(`  Component: ${context.node.typeId}`);
 *         return context.node;
 *     },
 * });
 * ```
 */
export function transformPage(
    page: ShopperExperience.schemas['Page'],
    visitor: PageVisitor
): ShopperExperience.schemas['Page'] | null {
    return new RootVisitorContext(visitor).visitPage(page);
}

/**
 * Applies the visitor to a single component. If the visitor's `visitComponent`
 * handler is defined, it receives a {@link VisitorContext} and is responsible
 * for traversing into the component's nested regions using `context.visitRegions()`.
 * If no `visitComponent` handler is defined, nested regions are traversed
 * automatically. Returns `null` to exclude the component from the result.
 *
 * @param component - The component to transform.
 * @param visitor - The visitor with callbacks.
 * @returns The transformed component, or `null` to exclude it.
 *
 * @example
 * ```ts
 * import { transformComponent } from '@salesforce/storefront-next-runtime/design/data';
 *
 * // Replace the image URL in a hero banner component and traverse its nested regions
 * const heroBanner = {
 *     id: 'hero-1',
 *     typeId: 'commerce_assets.heroBanner',
 *     data: { imageUrl: '/images/summer-sale.jpg' },
 *     regions: [{ id: 'banner-content', components: [] }],
 * };
 *
 * const result = transformComponent(heroBanner, {
 *     visitComponent(context) {
 *         // Traverse into nested regions using the context API
 *         const regions = context.visitRegions(context.node.regions);
 *
 *         if (context.node.typeId === 'commerce_assets.heroBanner') {
 *             return { ...context.node, regions, data: { ...context.node.data, imageUrl: '/images/winter-sale.jpg' } };
 *         }
 *         return { ...context.node, regions };
 *     },
 * });
 * ```
 */
export function transformComponent(
    component: ShopperExperience.schemas['Component'],
    visitor: PageVisitor
): ShopperExperience.schemas['Component'] | null {
    return new RootVisitorContext(visitor).visitComponent(component);
}

/**
 * Applies the visitor to a single region. If the visitor's `visitRegion`
 * handler is defined, it receives a {@link VisitorContext} and is responsible
 * for traversing into the region's child components using `context.visitComponents()`.
 * If no `visitRegion` handler is defined, child components are traversed
 * automatically. Returns `null` to exclude the region and all its children
 * from the result.
 *
 * @param region - The region to transform.
 * @param visitor - The visitor with callbacks.
 * @returns The transformed region, or `null` to exclude it.
 *
 * @example
 * ```ts
 * import { transformRegion } from '@salesforce/storefront-next-runtime/design/data';
 *
 * // Filter empty regions and traverse into non-empty ones
 * const emptyRegion = { id: 'sidebar', components: [] };
 * const populatedRegion = { id: 'main', components: [
 *     { id: 'product-grid', typeId: 'commerce_assets.productGrid', regions: [] },
 * ]};
 *
 * const visitor = {
 *     visitRegion(context) {
 *         if (!context.node.components?.length) {
 *             return null; // Remove empty regions
 *         }
 *         // Traverse into child components using the context API
 *         const components = context.visitComponents(context.node.components);
 *         return { ...context.node, components };
 *     },
 * };
 *
 * transformRegion(emptyRegion, visitor);      // => null (removed)
 * transformRegion(populatedRegion, visitor);   // => { id: 'main', components: [...] }
 * ```
 */
export function transformRegion(
    region: ShopperExperience.schemas['Region'],
    visitor: PageVisitor
): ShopperExperience.schemas['Region'] | null {
    return new RootVisitorContext(visitor).visitRegion(region);
}
