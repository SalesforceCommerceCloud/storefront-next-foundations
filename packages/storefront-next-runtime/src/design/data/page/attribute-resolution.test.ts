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
import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
    resolveAttributeValues,
    _resetWarnedKeysForTesting,
    type AttributeDefinition,
    type AttributeResolutionContext,
} from './attribute-resolution';

const buildCtx = (overrides: Partial<AttributeResolutionContext> = {}): AttributeResolutionContext => ({
    host: 'https://www.shop.example',
    resolveMediaUrl: ({ libraryDomain, path }) => `https://www.shop.example/${libraryDomain}${path}`,
    ...overrides,
});

describe('resolveAttributeValues', () => {
    beforeEach(() => {
        _resetWarnedKeysForTesting();
    });

    describe('null/empty data', () => {
        test('returns empty object for null data', () => {
            expect(resolveAttributeValues(null, 'type.foo', undefined, buildCtx())).toEqual({});
        });

        test('returns empty object for undefined data', () => {
            expect(resolveAttributeValues(undefined, 'type.foo', undefined, buildCtx())).toEqual({});
        });

        test('returns empty object for empty data with no defs', () => {
            expect(resolveAttributeValues({}, 'type.foo', undefined, buildCtx())).toEqual({});
        });
    });

    describe('structural detection (no componentTypes)', () => {
        test('recognizes image envelope and stamps URL', () => {
            const data = {
                hero: {
                    focalPoint: { x: 0.5, y: 0.5 },
                    metaData: { width: 1200, height: 600 },
                    media: { libraryDomain: 'Library-Sites-Lib', path: '/images/hero.jpg' },
                },
            };

            const out = resolveAttributeValues(data, 'type.card', undefined, buildCtx());

            expect(out.hero).toEqual({
                focalPoint: { x: 0.5, y: 0.5 },
                metaData: { width: 1200, height: 600 },
                url: 'https://www.shop.example/Library-Sites-Lib/images/hero.jpg',
            });
            // The `media` sub-object is dropped from the resolved shape.
            expect(out.hero).not.toHaveProperty('media');
        });

        test('drops focalPoint and metaData when absent', () => {
            const data = {
                hero: {
                    media: { libraryDomain: 'Lib', path: '/img.jpg' },
                },
            };

            const out = resolveAttributeValues(data, 'type.card', undefined, buildCtx());

            expect(out.hero).toEqual({ url: 'https://www.shop.example/Lib/img.jpg' });
        });

        test('passes through string-typed attributes unchanged', () => {
            const data = { heading: 'Welcome' };

            expect(resolveAttributeValues(data, 'type.card', undefined, buildCtx())).toEqual({
                heading: 'Welcome',
            });
        });

        test('passes through plain objects that lack media subkey', () => {
            const data = { custom: { foo: 'bar' } };

            expect(resolveAttributeValues(data, 'type.card', undefined, buildCtx())).toEqual({
                custom: { foo: 'bar' },
            });
        });

        test('passes through objects whose media subkey lacks libraryDomain/path', () => {
            const data = { hero: { media: { foo: 'bar' } } };

            expect(resolveAttributeValues(data, 'type.card', undefined, buildCtx())).toEqual({
                hero: { media: { foo: 'bar' } },
            });
        });
    });

    describe('type-driven dispatch (with componentTypes)', () => {
        test('dispatches image by attrDef.type', () => {
            const defs: Record<string, AttributeDefinition> = { hero: { id: 'hero', type: 'image' } };
            const data = {
                hero: {
                    media: { libraryDomain: 'Lib', path: '/img.jpg' },
                },
            };

            const out = resolveAttributeValues(data, 'type.card', defs, buildCtx());

            expect(out.hero).toEqual({ url: 'https://www.shop.example/Lib/img.jpg' });
        });

        test('prefers type-based dispatch over structural detection when defs are present', () => {
            // The value below is structurally a valid image envelope (has
            // media.libraryDomain + media.path) but the attrDef declares it
            // as a string. Type-driven dispatch must win: the value passes
            // through unchanged. If structural detection were applied here
            // (the pre-E behavior), the resolver would have stamped a URL.
            const defs: Record<string, AttributeDefinition> = {
                looksLikeImage: { id: 'looksLikeImage', type: 'string' },
            };
            const data = {
                looksLikeImage: {
                    media: { libraryDomain: 'Lib', path: '/img.jpg' },
                },
            };

            const resolveMediaUrl = vi.fn(({ libraryDomain, path }) => `https://e.example/${libraryDomain}${path}`);
            const out = resolveAttributeValues(data, 'type.card', defs, buildCtx({ resolveMediaUrl }));

            expect(out.looksLikeImage).toEqual({
                media: { libraryDomain: 'Lib', path: '/img.jpg' },
            });
            expect(resolveMediaUrl).not.toHaveBeenCalled();
        });

        test('routes image-typed attribute through resolveMediaUrl when defs are present', () => {
            const resolveMediaUrl = vi.fn(
                ({ libraryDomain, path, locale }) =>
                    `https://e.example/${libraryDomain}/${locale ?? 'no-locale'}${path}`
            );
            const ctx = buildCtx({ resolveMediaUrl, locale: 'en_US' });

            const defs: Record<string, AttributeDefinition> = { hero: { id: 'hero', type: 'image' } };
            const data = {
                hero: {
                    focalPoint: { x: 0.5, y: 0.5 },
                    metaData: { width: 1200, height: 600 },
                    media: { libraryDomain: 'Library-Sites-Lib', path: '/images/hero.jpg' },
                },
            };

            const out = resolveAttributeValues(data, 'commerce_assets.heroBanner', defs, ctx);

            expect(out.hero).toEqual({
                focalPoint: { x: 0.5, y: 0.5 },
                metaData: { width: 1200, height: 600 },
                url: 'https://e.example/Library-Sites-Lib/en_US/images/hero.jpg',
            });
            expect(resolveMediaUrl).toHaveBeenCalledWith({
                libraryDomain: 'Library-Sites-Lib',
                path: '/images/hero.jpg',
                locale: 'en_US',
            });
        });

        test('passes string/text/boolean/integer/enum/custom/product/category/page through unchanged', () => {
            const defs: Record<string, AttributeDefinition> = {
                a: { id: 'a', type: 'string' },
                b: { id: 'b', type: 'text' },
                c: { id: 'c', type: 'boolean' },
                d: { id: 'd', type: 'integer' },
                e: { id: 'e', type: 'enum' },
                f: { id: 'f', type: 'custom' },
                g: { id: 'g', type: 'product' },
                h: { id: 'h', type: 'category' },
                i: { id: 'i', type: 'page' },
            };
            const data = { a: 'a', b: 'b', c: true, d: 1, e: 'e', f: { x: 1 }, g: 'sku', h: 'cat', i: 'pg' };

            expect(resolveAttributeValues(data, 'type.card', defs, buildCtx())).toEqual(data);
        });

        test('passes through unknown types and dispatches a deduped onWarn', () => {
            const onWarn = vi.fn();

            const defs: Record<string, AttributeDefinition> = { futureAttr: { id: 'futureAttr', type: 'rich_markup' } };
            const data = { futureAttr: '<p>future</p>' };

            const result1 = resolveAttributeValues(data, 'type.x', defs, buildCtx({ onWarn }));
            expect(result1.futureAttr).toBe('<p>future</p>');
            expect(onWarn).toHaveBeenCalledTimes(1);
            expect(onWarn).toHaveBeenCalledWith(
                expect.objectContaining({
                    kind: 'unknown-attribute-type',
                    typeId: 'type.x',
                    attrId: 'futureAttr',
                    attrType: 'rich_markup',
                })
            );

            // Second call with the same triple should not fire onWarn again.
            resolveAttributeValues(data, 'type.x', defs, buildCtx({ onWarn }));
            expect(onWarn).toHaveBeenCalledTimes(1);
        });

        test('stays silent when onWarn is not configured', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const defs: Record<string, AttributeDefinition> = { futureAttr: { id: 'futureAttr', type: 'silent_kind' } };
            resolveAttributeValues({ futureAttr: 'x' }, 'type.x', defs, buildCtx());

            expect(warnSpy).not.toHaveBeenCalled();
            warnSpy.mockRestore();
        });

        test('passes through attributes not in the type definitions', () => {
            const defs: Record<string, AttributeDefinition> = { a: { id: 'a', type: 'string' } };
            const data = { a: 'a', strayKey: 'preserved' };

            expect(resolveAttributeValues(data, 'type.card', defs, buildCtx())).toEqual({
                a: 'a',
                strayKey: 'preserved',
            });
        });
    });

    describe('malformed image envelopes', () => {
        test('passes through and dispatches onWarn once on malformed envelope', () => {
            const onWarn = vi.fn();

            const defs: Record<string, AttributeDefinition> = { hero: { id: 'hero', type: 'image' } };
            // `media` is missing entirely — not recognizable as an envelope.
            const data = { hero: { focalPoint: { x: 1, y: 1 } } };

            const result = resolveAttributeValues(data, 'type.card', defs, buildCtx({ onWarn }));

            expect(result.hero).toEqual({ focalPoint: { x: 1, y: 1 } });
            expect(onWarn).toHaveBeenCalledTimes(1);
            expect(onWarn).toHaveBeenCalledWith(
                expect.objectContaining({ kind: 'malformed-image', typeId: 'type.card', attrId: 'hero' })
            );

            // Second call same triple → no duplicate warning.
            resolveAttributeValues(data, 'type.card', defs, buildCtx({ onWarn }));
            expect(onWarn).toHaveBeenCalledTimes(1);
        });
    });

    describe('locale plumbing', () => {
        test('forwards ctx.locale into resolveMediaUrl', () => {
            const resolveMediaUrl = vi.fn(
                ({ libraryDomain, path, locale }: { libraryDomain: string; path: string; locale?: string }) =>
                    `https://e.example/${libraryDomain}/${locale ?? 'no-locale'}${path}`
            );
            const ctx = buildCtx({ resolveMediaUrl, locale: 'fr_FR' });
            const data = { hero: { media: { libraryDomain: 'Lib', path: '/x.jpg' } } };

            const out = resolveAttributeValues(data, 'type.card', undefined, ctx);

            expect(out.hero).toEqual({ url: 'https://e.example/Lib/fr_FR/x.jpg' });
            expect(resolveMediaUrl).toHaveBeenCalledWith({
                libraryDomain: 'Lib',
                path: '/x.jpg',
                locale: 'fr_FR',
            });
        });
    });

    describe('markup attribute dispatch', () => {
        test('rewrites ?$staticlink$ in markup using pageLibraryDomain', () => {
            const resolveMediaUrl = vi.fn(
                ({ libraryDomain, path }: { libraryDomain: string; path: string }) =>
                    `https://cdn.example/${libraryDomain}${path.startsWith('/') ? path : `/${path}`}`
            );
            const ctx = buildCtx({
                resolveMediaUrl,
                pageLibraryDomain: 'Library-Sites-MyLib',
                locale: 'en_US',
            });
            const defs: Record<string, AttributeDefinition> = { body: { id: 'body', type: 'markup' } };
            const data = { body: '<img src="images/hero.png?$staticlink$">' };

            const out = resolveAttributeValues(data, 'type.hero', defs, ctx);

            expect(out.body).toBe('<img src="https://cdn.example/Library-Sites-MyLib/images/hero.png">');
        });

        test('passes through markup with embedded links unchanged', () => {
            const defs: Record<string, AttributeDefinition> = { body: { id: 'body', type: 'markup' } };
            const data = { body: '<a href="/search?q=shoes">Shop</a>' };

            const out = resolveAttributeValues(data, 'type.hero', defs, buildCtx());

            expect(out.body).toBe('<a href="/search?q=shoes">Shop</a>');
        });

        test('passes through non-string markup values unchanged', () => {
            const defs: Record<string, AttributeDefinition> = { body: { id: 'body', type: 'markup' } };
            const data = { body: 12345 };

            const out = resolveAttributeValues(data, 'type.hero', defs, buildCtx());

            expect(out.body).toBe(12345);
        });
    });

    describe('url attribute dispatch', () => {
        test('passes through relative url paths unchanged', () => {
            const defs: Record<string, AttributeDefinition> = { link: { id: 'link', type: 'url' } };
            const data = { link: '/product/12345' };

            const out = resolveAttributeValues(data, 'type.banner', defs, buildCtx());

            expect(out.link).toBe('/product/12345');
        });

        test('passes through absolute URL strings unchanged', () => {
            const defs: Record<string, AttributeDefinition> = { link: { id: 'link', type: 'url' } };
            const data = { link: 'https://www.example.com/search?cgid=mens' };

            const out = resolveAttributeValues(data, 'type.banner', defs, buildCtx());

            expect(out.link).toBe('https://www.example.com/search?cgid=mens');
        });
    });

    describe('file attribute dispatch', () => {
        test('resolves file envelope to a URL string', () => {
            const defs: Record<string, AttributeDefinition> = { doc: { id: 'doc', type: 'file' } };
            const data = {
                doc: { media: { libraryDomain: 'Library-Sites-Lib', path: '/files/whitepaper.pdf' } },
            };

            const out = resolveAttributeValues(data, 'type.download', defs, buildCtx());

            expect(out.doc).toBe('https://www.shop.example/Library-Sites-Lib/files/whitepaper.pdf');
            expect(typeof out.doc).toBe('string');
        });

        test('forwards locale to resolveMediaUrl', () => {
            const resolveMediaUrl = vi.fn(
                ({ libraryDomain, path, locale }: { libraryDomain: string; path: string; locale?: string }) =>
                    `https://cdn.example/${libraryDomain}/${locale ?? 'default'}${path}`
            );
            const ctx = buildCtx({ resolveMediaUrl, locale: 'de_DE' });
            const defs: Record<string, AttributeDefinition> = { doc: { id: 'doc', type: 'file' } };
            const data = {
                doc: { media: { libraryDomain: 'Lib', path: '/files/guide.pdf' } },
            };

            const out = resolveAttributeValues(data, 'type.download', defs, ctx);

            expect(out.doc).toBe('https://cdn.example/Lib/de_DE/files/guide.pdf');
            expect(resolveMediaUrl).toHaveBeenCalledWith({
                libraryDomain: 'Lib',
                path: '/files/guide.pdf',
                locale: 'de_DE',
            });
        });

        test('passes through malformed file values and dispatches onWarn', () => {
            const onWarn = vi.fn();
            const defs: Record<string, AttributeDefinition> = { doc: { id: 'doc', type: 'file' } };
            const data = { doc: 'just-a-string' };

            const out = resolveAttributeValues(data, 'type.download', defs, buildCtx({ onWarn }));

            expect(out.doc).toBe('just-a-string');
            expect(onWarn).toHaveBeenCalledTimes(1);
            expect(onWarn).toHaveBeenCalledWith(
                expect.objectContaining({ kind: 'malformed-file', typeId: 'type.download', attrId: 'doc' })
            );
        });

        test('passes through null file values', () => {
            const defs: Record<string, AttributeDefinition> = { doc: { id: 'doc', type: 'file' } };
            const data = { doc: null };

            const out = resolveAttributeValues(data, 'type.download', defs, buildCtx());

            expect(out.doc).toBeNull();
        });
    });

    describe('cms_record attribute dispatch', () => {
        test('resolves inner attributes of a cms_record envelope', () => {
            const defs: Record<string, AttributeDefinition> = { record: { id: 'record', type: 'cms_record' } };
            const data = {
                record: {
                    id: 'rec-123',
                    type: {
                        id: 'custom_record_type',
                        name: 'Custom Record',
                        attributeDefinitions: [
                            { id: 'title', type: 'string' },
                            { id: 'banner', type: 'image' },
                        ],
                    },
                    attributes: {
                        title: 'Hello World',
                        banner: {
                            focalPoint: { x: 0.5, y: 0.5 },
                            media: { libraryDomain: 'Lib', path: '/img.jpg' },
                        },
                    },
                },
            };

            const out = resolveAttributeValues(data, 'type.card', defs, buildCtx());

            expect(out.record).toEqual({
                id: 'rec-123',
                type: {
                    id: 'custom_record_type',
                    name: 'Custom Record',
                    attributeDefinitions: [
                        { id: 'title', type: 'string' },
                        { id: 'banner', type: 'image' },
                    ],
                },
                attributes: {
                    title: 'Hello World',
                    banner: {
                        focalPoint: { x: 0.5, y: 0.5 },
                        url: 'https://www.shop.example/Lib/img.jpg',
                    },
                },
            });
        });

        test('recursively resolves nested cms_record (3 levels)', () => {
            const defs: Record<string, AttributeDefinition> = { outer: { id: 'outer', type: 'cms_record' } };
            const data = {
                outer: {
                    id: 'outer-1',
                    type: {
                        id: 'outer_type',
                        attributeDefinitions: [
                            { id: 'inner', type: 'cms_record' },
                            { id: 'label', type: 'string' },
                        ],
                    },
                    attributes: {
                        label: 'Outer',
                        inner: {
                            id: 'inner-1',
                            type: {
                                id: 'inner_type',
                                attributeDefinitions: [{ id: 'deepest', type: 'cms_record' }],
                            },
                            attributes: {
                                deepest: {
                                    id: 'deepest-1',
                                    type: {
                                        id: 'deepest_type',
                                        attributeDefinitions: [{ id: 'img', type: 'image' }],
                                    },
                                    attributes: {
                                        img: {
                                            media: { libraryDomain: 'Lib', path: '/deep.png' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            };

            const out = resolveAttributeValues(data, 'type.page', defs, buildCtx());
            const outer = out.outer as any;

            expect(outer.id).toBe('outer-1');
            expect(outer.attributes.label).toBe('Outer');
            expect(outer.attributes.inner.id).toBe('inner-1');
            expect(outer.attributes.inner.attributes.deepest.id).toBe('deepest-1');
            expect(outer.attributes.inner.attributes.deepest.attributes.img).toEqual({
                url: 'https://www.shop.example/Lib/deep.png',
            });
        });

        test('passes through null cms_record values', () => {
            const defs: Record<string, AttributeDefinition> = { record: { id: 'record', type: 'cms_record' } };
            const data = { record: null };

            const out = resolveAttributeValues(data, 'type.card', defs, buildCtx());

            expect(out.record).toBeNull();
        });

        test('passes through malformed cms_record and dispatches onWarn', () => {
            const onWarn = vi.fn();
            const defs: Record<string, AttributeDefinition> = { record: { id: 'record', type: 'cms_record' } };
            const data = { record: { id: 'no-type-field' } };

            const out = resolveAttributeValues(data, 'type.card', defs, buildCtx({ onWarn }));

            expect(out.record).toEqual({ id: 'no-type-field' });
            expect(onWarn).toHaveBeenCalledTimes(1);
            expect(onWarn).toHaveBeenCalledWith(
                expect.objectContaining({ kind: 'malformed-cms-record', typeId: 'type.card', attrId: 'record' })
            );
        });

        test('stops recursing at max depth and dispatches onWarn', () => {
            const onWarn = vi.fn();

            // Build a chain 11 levels deep (exceeds MAX_CMS_RECORD_DEPTH of 10)
            const buildNested = (depth: number): any => {
                if (depth > 11) {
                    return {
                        id: `leaf-${depth}`,
                        type: { id: 'leaf', attributeDefinitions: [{ id: 'val', type: 'string' }] },
                        attributes: { val: 'end' },
                    };
                }

                return {
                    id: `level-${depth}`,
                    type: {
                        id: `type_${depth}`,
                        attributeDefinitions: [{ id: 'child', type: 'cms_record' }],
                    },
                    attributes: { child: buildNested(depth + 1) },
                };
            };

            const defs: Record<string, AttributeDefinition> = { deep: { id: 'deep', type: 'cms_record' } };
            const data = { deep: buildNested(0) };

            resolveAttributeValues(data, 'type.x', defs, buildCtx({ onWarn }));

            // Should have resolved some levels but stopped at depth 10
            const depthCall = onWarn.mock.calls.find(
                ([w]) => (w as { kind: string }).kind === 'cms-record-depth-exceeded'
            );
            expect(depthCall).toBeDefined();
        });
    });
});
