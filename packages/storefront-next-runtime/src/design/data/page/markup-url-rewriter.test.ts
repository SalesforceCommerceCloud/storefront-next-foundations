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
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rewriteMarkup, _resetStaticLinkWarningForTesting } from './markup-url-rewriter';
import type { AttributeResolutionContext } from './attribute-resolution';

function createCtx(overrides?: Partial<AttributeResolutionContext>): AttributeResolutionContext {
    return {
        host: 'https://www.example.com',
        locale: 'en_US',
        pageLibraryDomain: 'Library-Sites-RefArch-Site',
        resolveMediaUrl: (ref) =>
            `https://www.example.com/on/demandware.static/-/${ref.libraryDomain}/${ref.locale ?? 'default'}/v1/${ref.path.replace(/^\//, '')}`,
        ...overrides,
    };
}

describe('markup-url-rewriter', () => {
    beforeEach(() => {
        _resetStaticLinkWarningForTesting();
    });

    describe('rewriteMarkup', () => {
        it('returns empty string for null/empty input', () => {
            const ctx = createCtx();
            expect(rewriteMarkup('', ctx)).toBe('');
            expect(rewriteMarkup(null as unknown as string, ctx)).toBe('');
        });

        it('passes through plain text unchanged', () => {
            const ctx = createCtx();
            const input = '<p>Hello world</p>';
            expect(rewriteMarkup(input, ctx)).toBe(input);
        });

        it('passes through markup with links unchanged', () => {
            const ctx = createCtx();
            const input = '<a href="/search?cgid=sale">Sale</a> <a href="/product/abc">Product</a>';
            expect(rewriteMarkup(input, ctx)).toBe(input);
        });
    });

    describe('?$staticlink$', () => {
        it('rewrites image path with ?$staticlink$ to resolved URL', () => {
            const ctx = createCtx();
            const input = '<img src="images/logo.png?$staticlink$">';
            const result = rewriteMarkup(input, ctx);
            expect(result).toBe(
                '<img src="https://www.example.com/on/demandware.static/-/Library-Sites-RefArch-Site/en_US/v1/images/logo.png">'
            );
        });

        it('handles path with leading slash', () => {
            const ctx = createCtx();
            const input = '<img src="/images/banner.jpg?$staticlink$">';
            const result = rewriteMarkup(input, ctx);
            expect(result).toBe(
                '<img src="https://www.example.com/on/demandware.static/-/Library-Sites-RefArch-Site/en_US/v1/images/banner.jpg">'
            );
        });

        it('handles multiple staticlink occurrences', () => {
            const ctx = createCtx();
            const input = '<img src="a.png?$staticlink$"><img src="b.png?$staticlink$">';
            const result = rewriteMarkup(input, ctx);
            expect(result).toContain('/v1/a.png');
            expect(result).toContain('/v1/b.png');
        });

        it('uses staticLinkFor when provided', () => {
            const ctx = createCtx({
                staticLinkFor: (ref) => `https://cdn.example.com/static/${ref.path.replace(/^\//, '')}`,
            });
            const input = '<img src="images/hero.png?$staticlink$">';
            const result = rewriteMarkup(input, ctx);
            expect(result).toBe('<img src="https://cdn.example.com/static/images/hero.png">');
        });

        it('passes through when pageLibraryDomain is not set', () => {
            const ctx = createCtx({ pageLibraryDomain: undefined });
            const input = '<img src="images/logo.png?$staticlink$">';
            const result = rewriteMarkup(input, ctx);
            expect(result).toBe(input);
        });

        it('dispatches onWarn once when pageLibraryDomain is not set', () => {
            const onWarn = vi.fn();
            const ctx = createCtx({ pageLibraryDomain: undefined, onWarn });
            const input = '<img src="images/logo.png?$staticlink$">';

            rewriteMarkup(input, ctx);
            rewriteMarkup(input, ctx);

            expect(onWarn).toHaveBeenCalledTimes(1);
            expect(onWarn).toHaveBeenCalledWith(
                expect.objectContaining({
                    kind: 'staticlink-rewrite-skipped',
                    attrType: 'markup',
                })
            );
        });

        it('stays silent when pageLibraryDomain is not set and onWarn is not configured', () => {
            const ctx = createCtx({ pageLibraryDomain: undefined });
            const input = '<img src="images/logo.png?$staticlink$">';

            // No throw, no console output — handler is fully optional.
            expect(() => rewriteMarkup(input, ctx)).not.toThrow();
        });

        it('is case-insensitive', () => {
            const ctx = createCtx();
            const input = '<img src="images/logo.png?$STATICLINK$">';
            const result = rewriteMarkup(input, ctx);
            expect(result).toContain('/v1/images/logo.png');
        });

        it('handles srcset with multiple images', () => {
            const ctx = createCtx();
            const input = '<img srcset="small.png?$staticlink$ 300w, large.png?$staticlink$ 1000w">';
            const result = rewriteMarkup(input, ctx);
            expect(result).toContain('/v1/small.png');
            expect(result).toContain('/v1/large.png');
        });

        it('only rewrites staticlink, leaving other content intact', () => {
            const ctx = createCtx();
            const input = '<a href="/product/abc"><img src="logo.png?$staticlink$"></a>';
            const result = rewriteMarkup(input, ctx);
            expect(result).toContain('/product/abc');
            expect(result).toContain('/v1/logo.png');
        });
    });
});
