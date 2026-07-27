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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AppConfig, Config } from '@/types/config';
import { mockBuildConfig, mockConfig } from '@/test-utils/config';
import { deepMerge } from '@/test-utils/deep-merge';
import { resolveDynamicImageAttributes } from '@/lib/images/dynamic-image';
import { preloadDynamicImage } from './preload';

const preloadMock = vi.hoisted(() => vi.fn());

vi.mock('react-dom', async () => {
    const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
    return { ...actual, preload: preloadMock };
});

const SFCC_SRC =
    'https://demo-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwbeefee44/images/large/P0048_001.jpg';

const buildConfig = (overrides?: Partial<Config>): AppConfig =>
    overrides ? deepMerge(mockBuildConfig, overrides as Record<string, unknown>).app : mockConfig;

describe('preloadDynamicImage', () => {
    beforeEach(() => {
        preloadMock.mockClear();
    });

    it('no-ops when src is empty', () => {
        preloadDynamicImage({ config: buildConfig(), src: '', widths: [400, 800] });

        expect(preloadMock).not.toHaveBeenCalled();
    });

    it('emits one preload() per <source> when widths are provided', () => {
        preloadDynamicImage({ config: buildConfig(), src: SFCC_SRC, widths: [400, 800] });

        // Two distinct widths → two breakpoints → two preload calls.
        expect(preloadMock).toHaveBeenCalledTimes(2);

        for (const [, opts] of preloadMock.mock.calls) {
            expect(opts).toMatchObject({
                as: 'image',
                fetchPriority: 'low',
            });
            expect(typeof opts.imageSrcSet).toBe('string');
            expect(opts.imageSrcSet).toMatch(/\bsw=\d+/);
            expect(typeof opts.imageSizes).toBe('string');
            expect(opts.type).toMatch(/^image\//);
        }
    });

    it('routes URLs through DIS when enabled (host rewrite + format conversion)', () => {
        preloadDynamicImage({ config: buildConfig(), src: SFCC_SRC, widths: [400] });

        const [href, opts] = preloadMock.mock.calls[0];
        // DIS rewrite places asset under DIS host with /dw/image/v2/{realm}/ prefix.
        expect(String(href)).toContain('edge.disstg.commercecloud.salesforce.com');
        expect(String(href)).toMatch(/\/dw\/image\/v\d+\//);
        // Format conversion: webp output, jpg fallback hint.
        expect(String(opts.imageSrcSet)).toContain('.webp');
        expect(String(opts.imageSrcSet)).toContain('sfrm=jpg');
        expect(opts.type).toBe('image/webp');
    });

    it('attaches a media query string per <source> for distinct breakpoints', () => {
        preloadDynamicImage({ config: buildConfig(), src: SFCC_SRC, widths: [400, 800] });

        const mediaValues = preloadMock.mock.calls.map(([, opts]) => opts.media);
        // Each breakpoint produces a media query (e.g. `(min-width: ...)` / `(max-width: ...)`).
        for (const m of mediaValues) {
            expect(typeof m).toBe('string');
            expect(m).toMatch(/\(min-width|\(max-width/);
        }
    });

    it('respects custom fetchPriority', () => {
        preloadDynamicImage({
            config: buildConfig(),
            src: SFCC_SRC,
            widths: [400],
            fetchPriority: 'high',
        });

        expect(preloadMock).toHaveBeenCalledTimes(1);
        const [, opts] = preloadMock.mock.calls[0];
        expect(opts.fetchPriority).toBe('high');
    });

    it('falls back to a single preload when no widths/heights are provided', () => {
        // Precondition: with no dimensions, the resolver produces no <source>s — this is the
        // contract that drives the fallback branch. Asserting it explicitly so the test fails
        // loudly if the resolver ever starts returning links here.
        const resolved = resolveDynamicImageAttributes({ src: SFCC_SRC, config: buildConfig() });
        expect(resolved.links).toHaveLength(0);

        preloadDynamicImage({ config: buildConfig(), src: SFCC_SRC });

        expect(preloadMock).toHaveBeenCalledTimes(1);
        const [href, opts] = preloadMock.mock.calls[0];
        expect(typeof href).toBe('string');
        expect(opts).toEqual({ as: 'image', fetchPriority: 'low' });
        // The fallback src is the (possibly DIS-rewritten) image URL — not a srcSet.
        expect(opts.imageSrcSet).toBeUndefined();
    });

    it('skips DIS rewrite when enableDis is false in config', () => {
        const config = buildConfig({ app: { images: { enableDis: false } } } as Partial<Config>);

        preloadDynamicImage({ config, src: SFCC_SRC, widths: [400] });

        // With DIS disabled, the resolved src is a relative static path, no DIS host,
        // and the srcSet is not converted to webp/jpg.
        const [href, opts] = preloadMock.mock.calls[0];
        const srcSet = String(opts.imageSrcSet ?? href);
        expect(srcSet).not.toContain('edge.disstg.commercecloud.salesforce.com');
        expect(srcSet).not.toMatch(/\/dw\/image\/v\d+\//);
        expect(srcSet).not.toContain('sfrm=jpg');
    });
});
