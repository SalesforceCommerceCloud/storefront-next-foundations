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
import { describe, test, expect, vi } from 'vitest';
import { transformPage, transformComponent, transformRegion } from './transform';
import type { ShopperExperience } from '@/scapi-client/types';

type Page = ShopperExperience.schemas['Page'];
type Region = ShopperExperience.schemas['Region'];
type Component = ShopperExperience.schemas['Component'];

const makeComponent = (overrides: Partial<Component> = {}): Component => ({
    id: 'comp-1',
    typeId: 'commerce_assets.banner',
    regions: [],
    ...overrides,
});

const makeRegion = (overrides: Partial<Region> = {}): Region => ({
    id: 'region-1',
    components: [],
    ...overrides,
});

const makePage = (overrides: Partial<Page> = {}): Page => ({
    id: 'page-1',
    typeId: 'storePage',
    regions: [],
    ...overrides,
});

describe('transformPage', () => {
    test('returns page unchanged with empty visitor', () => {
        const page = makePage();
        const result = transformPage(page, {});
        expect(result).toEqual(page);
    });

    test('automatically traverses regions and components without handlers', () => {
        const page = makePage({
            regions: [
                makeRegion({
                    id: 'header',
                    components: [makeComponent({ id: 'banner' }), makeComponent({ id: 'nav' })],
                }),
            ],
        });

        const result = transformPage(page, {});
        expect(result?.regions?.[0].components).toHaveLength(2);
    });

    test('visitComponent can filter components by returning null', () => {
        const page = makePage({
            regions: [
                makeRegion({
                    components: [
                        makeComponent({ id: 'keep' }),
                        makeComponent({ id: 'remove' }),
                        makeComponent({ id: 'keep-2' }),
                    ],
                }),
            ],
        });

        const result = transformPage(page, {
            visitComponent(ctx) {
                return ctx.node.id === 'remove' ? null : ctx.node;
            },
        });

        expect(result?.regions?.[0].components?.map((c) => c.id)).toEqual(['keep', 'keep-2']);
    });

    test('visitRegion can filter regions by returning null', () => {
        const page = makePage({
            regions: [makeRegion({ id: 'keep-region' }), makeRegion({ id: 'remove-region' })],
        });

        const result = transformPage(page, {
            visitRegion(ctx) {
                return ctx.node.id === 'remove-region' ? null : ctx.node;
            },
        });

        expect(result?.regions?.map((r) => r.id)).toEqual(['keep-region']);
    });

    test('visitPage receives the page and can transform it', () => {
        const page = makePage({ id: 'original' });

        const result = transformPage(page, {
            visitPage(ctx) {
                return { ...ctx.node, id: 'transformed' };
            },
        });

        expect(result?.id).toBe('transformed');
    });

    test('visitPage handler must call visitRegions to traverse children', () => {
        const visitComponent = vi.fn((ctx) => ctx.node);

        const page = makePage({
            regions: [makeRegion({ components: [makeComponent()] })],
        });

        transformPage(page, {
            visitPage(ctx) {
                return ctx.node;
            },
            visitComponent,
        });

        expect(visitComponent).not.toHaveBeenCalled();
    });

    test('visitPage handler can traverse children via context.visitRegions', () => {
        const componentIds: string[] = [];

        const page = makePage({
            regions: [
                makeRegion({
                    components: [makeComponent({ id: 'c1' }), makeComponent({ id: 'c2' })],
                }),
            ],
        });

        transformPage(page, {
            visitPage(ctx) {
                const regions = ctx.visitRegions(ctx.node.regions);
                return { ...ctx.node, regions };
            },
            visitComponent(ctx) {
                componentIds.push(ctx.node.id);
                return ctx.node;
            },
        });

        expect(componentIds).toEqual(['c1', 'c2']);
    });

    test('visitRegion handler must call visitComponents to traverse children', () => {
        const visitComponent = vi.fn((ctx) => ctx.node);

        const page = makePage({
            regions: [makeRegion({ components: [makeComponent()] })],
        });

        transformPage(page, {
            visitRegion(ctx) {
                return ctx.node;
            },
            visitComponent,
        });

        expect(visitComponent).not.toHaveBeenCalled();
    });

    test('nested regions inside components are traversed', () => {
        const visitedIds: string[] = [];

        const page = makePage({
            regions: [
                makeRegion({
                    id: 'top-region',
                    components: [
                        makeComponent({
                            id: 'container',
                            regions: [
                                makeRegion({
                                    id: 'nested-region',
                                    components: [makeComponent({ id: 'nested-comp' })],
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        });

        transformPage(page, {
            visitComponent(ctx) {
                visitedIds.push(ctx.node.id);
                ctx.node.regions = ctx.visitRegions(ctx.node.regions);
                return ctx.node;
            },
        });

        expect(visitedIds).toEqual(['container', 'nested-comp']);
    });

    describe('VisitorContext properties', () => {
        test('provides parentRegion when visitRegion handler is defined', () => {
            const capturedParentRegions: (string | undefined)[] = [];

            const page = makePage({
                regions: [
                    makeRegion({
                        id: 'header',
                        components: [
                            makeComponent({
                                id: 'container',
                                regions: [
                                    makeRegion({
                                        id: 'inner',
                                        components: [makeComponent({ id: 'nested' })],
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            });

            transformPage(page, {
                visitRegion(ctx) {
                    const components = ctx.visitComponents(ctx.node.components);
                    return { ...ctx.node, components };
                },
                visitComponent(ctx) {
                    capturedParentRegions.push(ctx.parentRegion?.id);
                    ctx.node.regions = ctx.visitRegions(ctx.node.regions);
                    return ctx.node;
                },
            });

            // With a visitRegion handler, parentRegion correctly tracks
            // the actual parent region for each component.
            expect(capturedParentRegions).toEqual(['header', 'inner']);
        });

        test('page reference is available when visitPage handler is defined', () => {
            let capturedPageId: string | undefined;

            const page = makePage({
                id: 'homepage',
                regions: [
                    makeRegion({
                        components: [makeComponent({ id: 'banner' })],
                    }),
                ],
            });

            transformPage(page, {
                visitPage(ctx) {
                    ctx.node.regions = ctx.visitRegions(ctx.node.regions);
                    return ctx.node;
                },
                visitComponent(ctx) {
                    capturedPageId = ctx.page?.id;
                    return ctx.node;
                },
            });

            expect(capturedPageId).toBe('homepage');
        });
    });
});

describe('transformPage — non-mutation', () => {
    test('auto-traversal does not mutate the original page object', () => {
        const innerComp = makeComponent({ id: 'inner' });
        const region = makeRegion({ id: 'r1', components: [innerComp] });
        const page = makePage({ regions: [region] });

        const result = transformPage(page, {
            visitComponent(ctx) {
                return { ...ctx.node, id: 'replaced' };
            },
        });

        // Result should have the replaced component
        expect(result?.regions?.[0].components?.[0].id).toBe('replaced');

        // Original should be untouched
        expect(page.regions?.[0].components?.[0].id).toBe('inner');
    });

    test('auto-traversal does not mutate the original region object', () => {
        const comp1 = makeComponent({ id: 'c1' });
        const comp2 = makeComponent({ id: 'c2' });
        const region = makeRegion({ id: 'r1', components: [comp1, comp2] });
        const page = makePage({ regions: [region] });

        const result = transformPage(page, {
            visitComponent(ctx) {
                return ctx.node.id === 'c2' ? null : ctx.node;
            },
        });

        // Result should have only c1
        expect(result?.regions?.[0].components).toHaveLength(1);

        // Original region should still have both components
        expect(region.components).toHaveLength(2);
    });

    test('auto-traversal does not mutate the original component with nested regions', () => {
        const nested = makeComponent({ id: 'nested' });
        const nestedRegion = makeRegion({ id: 'nested-r', components: [nested] });
        const parent = makeComponent({ id: 'parent', regions: [nestedRegion] });
        const topRegion = makeRegion({ id: 'top', components: [parent] });
        const page = makePage({ regions: [topRegion] });

        const result = transformPage(page, {
            visitComponent(ctx) {
                if (ctx.node.id === 'nested') return null;
                return { ...ctx.node, regions: ctx.visitRegions(ctx.node.regions) };
            },
        });

        // Result: parent should have empty nested region
        expect(result?.regions?.[0].components?.[0].regions?.[0].components).toHaveLength(0);

        // Original: parent should still have nested component
        expect(parent.regions?.[0].components).toHaveLength(1);
        expect(parent.regions?.[0].components?.[0].id).toBe('nested');
    });
});

describe('VisitorContext.type', () => {
    test('exposes the node type for page context', () => {
        let capturedType: string | undefined;

        const page = makePage();
        transformPage(page, {
            visitPage(ctx) {
                capturedType = ctx.type;
                return ctx.node;
            },
        });

        expect(capturedType).toBe('page');
    });

    test('exposes the node type for region context', () => {
        let capturedType: string | undefined;

        const page = makePage({
            regions: [makeRegion({ id: 'r1' })],
        });
        transformPage(page, {
            visitRegion(ctx) {
                capturedType = ctx.type;
                return ctx.node;
            },
        });

        expect(capturedType).toBe('region');
    });

    test('exposes the node type for component context', () => {
        let capturedType: string | undefined;

        const page = makePage({
            regions: [makeRegion({ components: [makeComponent({ id: 'c1' })] })],
        });
        transformPage(page, {
            visitComponent(ctx) {
                capturedType = ctx.type;
                return ctx.node;
            },
        });

        expect(capturedType).toBe('component');
    });
});

describe('transformComponent', () => {
    test('applies visitor to a single component', () => {
        const component = makeComponent({ id: 'hero' });

        const result = transformComponent(component, {
            visitComponent(ctx) {
                return { ...ctx.node, id: 'transformed-hero' };
            },
        });

        expect(result?.id).toBe('transformed-hero');
    });

    test('returns null when visitor filters the component', () => {
        const result = transformComponent(makeComponent(), {
            visitComponent() {
                return null;
            },
        });

        expect(result).toBeNull();
    });

    test('automatically traverses nested regions without visitComponent handler', () => {
        const component = makeComponent({
            regions: [
                makeRegion({
                    components: [makeComponent({ id: 'child-1' }), makeComponent({ id: 'child-2' })],
                }),
            ],
        });

        const result = transformComponent(component, {});
        expect(result?.regions?.[0].components).toHaveLength(2);
    });
});

describe('transformRegion', () => {
    test('applies visitor to a single region', () => {
        const region = makeRegion({ id: 'sidebar' });

        const result = transformRegion(region, {
            visitRegion(ctx) {
                return { ...ctx.node, id: 'transformed-sidebar' };
            },
        });

        expect(result?.id).toBe('transformed-sidebar');
    });

    test('returns null when visitor filters the region', () => {
        const result = transformRegion(makeRegion(), {
            visitRegion() {
                return null;
            },
        });

        expect(result).toBeNull();
    });

    test('automatically traverses child components without visitRegion handler', () => {
        const region = makeRegion({
            components: [makeComponent({ id: 'c1' }), makeComponent({ id: 'c2' })],
        });

        const visitedIds: string[] = [];
        transformRegion(region, {
            visitComponent(ctx) {
                visitedIds.push(ctx.node.id);
                return ctx.node;
            },
        });

        expect(visitedIds).toEqual(['c1', 'c2']);
    });
});
