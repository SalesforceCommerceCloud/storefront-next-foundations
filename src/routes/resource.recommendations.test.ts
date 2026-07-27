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
import { RouterContextProvider } from 'react-router';
import { siteContext } from '@salesforce/storefront-next-runtime/site-context';
import { resourceRoutes } from '@/route-paths';

vi.mock('@/lib/product/recommendations.server', () => ({
    fetchProductRecommendations: vi.fn(),
}));
vi.mock('@/lib/logger.server', () => ({
    getLogger: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

const buildContext = (currency?: string): RouterContextProvider => {
    const ctx = new RouterContextProvider();
    if (currency !== undefined) {
        ctx.set(siteContext, { currency } as never);
    }
    return ctx;
};

const ORIGIN = 'https://example.com';

const buildUrl = (params: Record<string, string> = {}) => {
    const url = new URL(`${ORIGIN}${resourceRoutes.recommendations}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return url.toString();
};

const buildRequest = (params: Record<string, string> = {}, headers: Record<string, string> = {}) =>
    new Request(buildUrl(params), {
        method: 'GET',
        headers: { Origin: ORIGIN, ...headers },
    });

describe('resource.recommendations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 405 on POST', async () => {
        const { action } = await import('./resource.recommendations');
        const res = action();
        expect(res.status).toBe(405);
    });

    it('returns 403 cross-origin', async () => {
        const { loader } = await import('./resource.recommendations');
        const res = await loader({
            request: new Request(buildUrl({ recommenderName: 'home' }), {
                method: 'GET',
                headers: { Origin: 'https://attacker.com' },
            }),
            context: new RouterContextProvider(),
        } as never);
        expect(res.status).toBe(403);
    });

    it('returns 400 when recommenderName is missing', async () => {
        const { loader } = await import('./resource.recommendations');
        const res = await loader({
            request: buildRequest({}),
            context: new RouterContextProvider(),
        } as never);
        expect(res.status).toBe(400);
    });

    it('returns 400 when products is malformed JSON', async () => {
        const { loader } = await import('./resource.recommendations');
        const res = await loader({
            request: buildRequest({ recommenderName: 'home', products: 'not-json' }),
            context: new RouterContextProvider(),
        } as never);
        expect(res.status).toBe(400);
    });

    it('returns 400 when args is malformed JSON', async () => {
        const { loader } = await import('./resource.recommendations');
        const res = await loader({
            request: buildRequest({ recommenderName: 'home', args: 'not-json' }),
            context: new RouterContextProvider(),
        } as never);
        expect(res.status).toBe(400);
    });

    it('returns 403 when both Origin and Referer headers are absent', async () => {
        const { loader } = await import('./resource.recommendations');
        // Construct a request with neither Origin nor Referer set. The same-origin gate
        // currently fails closed in this case, so any future change should be accompanied
        // by a deliberate decision to relax this and update this test.
        const res = await loader({
            request: new Request(buildUrl({ recommenderName: 'home' }), { method: 'GET' }),
            context: new RouterContextProvider(),
        } as never);
        expect(res.status).toBe(403);
    });

    it('accepts the request when only Referer is present and points to the same origin', async () => {
        const { fetchProductRecommendations } = await import('@/lib/product/recommendations.server');
        (fetchProductRecommendations as ReturnType<typeof vi.fn>).mockResolvedValue({ recs: [] });
        const { loader } = await import('./resource.recommendations');
        const res = await loader({
            request: new Request(buildUrl({ recommenderName: 'home' }), {
                method: 'GET',
                headers: { Referer: `${ORIGIN}/some/page` },
            }),
            context: new RouterContextProvider(),
        } as never);
        expect(res.status).toBe(200);
    });

    it('silently drops non-object args (e.g. an array) and forwards args without those keys', async () => {
        const { fetchProductRecommendations } = await import('@/lib/product/recommendations.server');
        (fetchProductRecommendations as ReturnType<typeof vi.fn>).mockResolvedValue({ recs: [] });
        const { loader } = await import('./resource.recommendations');
        const res = await loader({
            request: buildRequest({
                recommenderName: 'home',
                // Valid JSON, but not an object — must be ignored rather than rejected.
                args: JSON.stringify(['evil', 'array']),
                type: 'zone',
            }),
            context: new RouterContextProvider(),
        } as never);
        expect(res.status).toBe(200);
        expect(fetchProductRecommendations).toHaveBeenCalledWith(
            expect.objectContaining({}),
            expect.objectContaining({ name: 'home', args: { type: 'zone' } })
        );
    });

    it('forwards translated args (type folded into args.type) to fetchProductRecommendations', async () => {
        const { fetchProductRecommendations } = await import('@/lib/product/recommendations.server');
        (fetchProductRecommendations as ReturnType<typeof vi.fn>).mockResolvedValue({ recs: [] });
        const { loader } = await import('./resource.recommendations');
        await loader({
            request: buildRequest({
                recommenderName: 'home-zone',
                type: 'zone',
                products: JSON.stringify([{ id: 'p-1' }]),
                currency: 'USD',
                args: JSON.stringify({ limit: 8 }),
            }),
            context: new RouterContextProvider(),
        } as never);
        expect(fetchProductRecommendations).toHaveBeenCalledWith(expect.objectContaining({}), {
            name: 'home-zone',
            products: [{ id: 'p-1' }],
            currency: 'USD',
            args: { limit: 8, type: 'zone' },
        });
    });

    it('sets Cache-Control: no-store on success response', async () => {
        const { fetchProductRecommendations } = await import('@/lib/product/recommendations.server');
        (fetchProductRecommendations as ReturnType<typeof vi.fn>).mockResolvedValue({ recs: [] });
        const { loader } = await import('./resource.recommendations');
        const res = await loader({
            request: buildRequest({ recommenderName: 'home' }),
            context: new RouterContextProvider(),
        } as never);
        expect(res.headers.get('Cache-Control')).toBe('no-store');
    });

    it('returns 500 when helper throws unexpectedly', async () => {
        const { fetchProductRecommendations } = await import('@/lib/product/recommendations.server');
        (fetchProductRecommendations as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
        const { loader } = await import('./resource.recommendations');
        const res = await loader({
            request: buildRequest({ recommenderName: 'x' }),
            context: new RouterContextProvider(),
        } as never);
        expect(res.status).toBe(500);
    });

    it('falls back to siteContext currency when query param is absent', async () => {
        const { fetchProductRecommendations } = await import('@/lib/product/recommendations.server');
        (fetchProductRecommendations as ReturnType<typeof vi.fn>).mockResolvedValue({ recs: [] });
        const { loader } = await import('./resource.recommendations');
        await loader({
            request: buildRequest({ recommenderName: 'home' }),
            context: buildContext('EUR'),
        } as never);
        expect(fetchProductRecommendations).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ currency: 'EUR' })
        );
    });

    it('prefers explicit currency query param over siteContext currency', async () => {
        const { fetchProductRecommendations } = await import('@/lib/product/recommendations.server');
        (fetchProductRecommendations as ReturnType<typeof vi.fn>).mockResolvedValue({ recs: [] });
        const { loader } = await import('./resource.recommendations');
        await loader({
            request: buildRequest({ recommenderName: 'home', currency: 'JPY' }),
            context: buildContext('EUR'),
        } as never);
        expect(fetchProductRecommendations).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ currency: 'JPY' })
        );
    });

    it('accepts the request when X-Forwarded-Host matches Origin despite mismatched Host (MRT scenario)', async () => {
        const { fetchProductRecommendations } = await import('@/lib/product/recommendations.server');
        (fetchProductRecommendations as ReturnType<typeof vi.fn>).mockResolvedValue({ recs: [] });
        const { loader } = await import('./resource.recommendations');
        const res = await loader({
            request: new Request(buildUrl({ recommenderName: 'home' }), {
                method: 'GET',
                headers: {
                    Origin: 'https://public.example.com',
                    Host: 'internal.lambda.amazonaws.com',
                    'X-Forwarded-Host': 'public.example.com',
                    'X-Forwarded-Proto': 'https',
                },
            }),
            context: new RouterContextProvider(),
        } as never);
        expect(res.status).toBe(200);
    });

    it('accepts the request when Referer matches X-Forwarded-Host despite mismatched Host (MRT Referer fallback)', async () => {
        const { fetchProductRecommendations } = await import('@/lib/product/recommendations.server');
        (fetchProductRecommendations as ReturnType<typeof vi.fn>).mockResolvedValue({ recs: [] });
        const { loader } = await import('./resource.recommendations');
        const res = await loader({
            request: new Request(buildUrl({ recommenderName: 'home' }), {
                method: 'GET',
                headers: {
                    Referer: 'https://public.example.com/some/page',
                    Host: 'internal.lambda.amazonaws.com',
                    'X-Forwarded-Host': 'public.example.com',
                    'X-Forwarded-Proto': 'https',
                },
            }),
            context: new RouterContextProvider(),
        } as never);
        expect(res.status).toBe(200);
    });

    it('returns 403 when Origin does not match X-Forwarded-Host', async () => {
        const { loader } = await import('./resource.recommendations');
        const res = await loader({
            request: new Request(buildUrl({ recommenderName: 'home' }), {
                method: 'GET',
                headers: {
                    Origin: 'https://evil.com',
                    Host: 'internal.lambda.amazonaws.com',
                    'X-Forwarded-Host': 'public.example.com',
                    'X-Forwarded-Proto': 'https',
                },
            }),
            context: new RouterContextProvider(),
        } as never);
        expect(res.status).toBe(403);
    });

    it('accepts the request when Origin matches request.url but not X-Forwarded-Host (local-dev with EXTERNAL_DOMAIN_NAME)', async () => {
        const { fetchProductRecommendations } = await import('@/lib/product/recommendations.server');
        (fetchProductRecommendations as ReturnType<typeof vi.fn>).mockResolvedValue({ recs: [] });
        const { loader } = await import('./resource.recommendations');
        const res = await loader({
            request: new Request(buildUrl({ recommenderName: 'home' }), {
                method: 'GET',
                headers: {
                    Origin: ORIGIN,
                    'X-Forwarded-Host': 'my-store.commercecloud.salesforce.com',
                    'X-Forwarded-Proto': 'https',
                },
            }),
            context: new RouterContextProvider(),
        } as never);
        expect(res.status).toBe(200);
    });

    it('returns 403 (not 500) when X-Forwarded-Host contains invalid URL characters', async () => {
        const { loader } = await import('./resource.recommendations');
        const res = await loader({
            request: new Request(buildUrl({ recommenderName: 'home' }), {
                method: 'GET',
                headers: {
                    Origin: ORIGIN,
                    'X-Forwarded-Host': 'invalid host with spaces',
                    'X-Forwarded-Proto': 'https',
                },
            }),
            context: new RouterContextProvider(),
        } as never);
        expect(res.status).toBe(403);
    });

    it('omits currency when neither query param nor siteContext provides one', async () => {
        const { fetchProductRecommendations } = await import('@/lib/product/recommendations.server');
        (fetchProductRecommendations as ReturnType<typeof vi.fn>).mockResolvedValue({ recs: [] });
        const { loader } = await import('./resource.recommendations');
        await loader({
            request: buildRequest({ recommenderName: 'home' }),
            context: new RouterContextProvider(),
        } as never);
        const call = (fetchProductRecommendations as ReturnType<typeof vi.fn>).mock.calls.at(-1);
        expect(call?.[1]).not.toHaveProperty('currency');
    });
});
