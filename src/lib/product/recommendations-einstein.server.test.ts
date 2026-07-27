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

const mockGetAuth = vi.fn();
const mockGetMrtTimeout = vi.fn(() => null as number | null);

vi.mock('@/middlewares/auth.server', () => ({
    getAuth: (ctx: unknown) => mockGetAuth(ctx),
}));
vi.mock('@/lib/api-clients.server', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api-clients.server')>('@/lib/api-clients.server');
    return {
        ...actual,
        getMrtRequestTimeoutMs: () => mockGetMrtTimeout(),
    };
});
vi.mock('@salesforce/storefront-next-runtime/config', async () => {
    const actual = await vi.importActual<typeof import('@salesforce/storefront-next-runtime/config')>(
        '@salesforce/storefront-next-runtime/config'
    );
    return {
        ...actual,
        getConfig: () => ({
            engagement: {
                adapters: {
                    einstein: {
                        enabled: true,
                        host: 'https://api.cquotient.com',
                        einsteinId: 'test-client-id',
                        realm: 'aaij',
                        siteId: 'TestSite',
                        isProduction: false,
                    },
                },
            },
        }),
    };
});

describe('getEinsteinRecommendations', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        mockGetAuth.mockReturnValue({ usid: 'usid-1', userType: 'guest' });
    });

    it('derives cookieId from usid and posts to /personalization/recs/{site}/{name}', async () => {
        const { getEinsteinRecommendations } = await import('./recommendations-einstein.server');
        const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ recs: [] }) });
        vi.stubGlobal('fetch', fetchSpy);

        const request = new Request('http://localhost/', {
            headers: { 'x-forwarded-for': '203.0.113.5', 'user-agent': 'UA' },
        });
        await getEinsteinRecommendations({
            context: new RouterContextProvider(),
            request,
            name: 'home-top-revenue-for-category',
        });

        expect(fetchSpy).toHaveBeenCalledOnce();
        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe(
            'https://api.cquotient.com/v3/personalization/recs/aaij-TestSite/home-top-revenue-for-category'
        );
        const body = JSON.parse((init as RequestInit).body as string);
        expect(body.cookieId).toBe('usid-1');
        expect(body.userId).toBeUndefined();
        expect(body.clientIp).toBe('203.0.113.5');
        expect(body.clientUserAgent).toBe('UA');
        expect(body.instanceType).toBe('sbx');
        expect(body.realm).toBe('aaij');
    });

    it('adds userId for registered shoppers', async () => {
        mockGetAuth.mockReturnValue({ usid: 'usid-1', customerId: 'C-1', userType: 'registered' });
        const { getEinsteinRecommendations } = await import('./recommendations-einstein.server');
        const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ recs: [] }) });
        vi.stubGlobal('fetch', fetchSpy);
        await getEinsteinRecommendations({
            context: new RouterContextProvider(),
            request: new Request('http://localhost/'),
            name: 'home-top-revenue-for-category',
        });
        const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
        expect(body.userId).toBe('C-1');
    });

    it('routes args.type === "zone" to the zone endpoint', async () => {
        const { getEinsteinRecommendations } = await import('./recommendations-einstein.server');
        const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ recs: [] }) });
        vi.stubGlobal('fetch', fetchSpy);
        await getEinsteinRecommendations({
            context: new RouterContextProvider(),
            request: new Request('http://localhost/'),
            name: 'home-zone',
            args: { type: 'zone' },
        });
        expect(fetchSpy.mock.calls[0][0]).toBe(
            'https://api.cquotient.com/v3/personalization/aaij-TestSite/zones/home-zone/recs'
        );
    });

    it('strips reserved keys from caller-supplied args', async () => {
        const { getEinsteinRecommendations } = await import('./recommendations-einstein.server');
        const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ recs: [] }) });
        vi.stubGlobal('fetch', fetchSpy);
        await getEinsteinRecommendations({
            context: new RouterContextProvider(),
            request: new Request('http://localhost/'),
            name: 'home-top-revenue-for-category',
            args: {
                cookieId: 'caller-spoof',
                userId: 'caller-spoof',
                clientIp: '1.2.3.4',
                clientUserAgent: 'spoof',
                instanceType: 'prd',
                realm: 'spoof',
                type: 'recommender',
                limit: 8,
            },
        });
        const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
        expect(body.cookieId).toBe('usid-1'); // server-derived
        expect(body.clientIp).toBeUndefined();
        expect(body.clientUserAgent).toBeUndefined();
        expect(body.instanceType).toBe('sbx');
        expect(body.realm).toBe('aaij'); // server-derived, caller cannot spoof
        expect(body.limit).toBe(8); // non-reserved key passes through
    });

    it('forwards signal and re-throws AbortError', async () => {
        const { getEinsteinRecommendations } = await import('./recommendations-einstein.server');
        const ac = new AbortController();
        ac.abort();
        const fetchSpy = vi.fn().mockImplementation((_url, init: RequestInit) => {
            if (init.signal?.aborted) return Promise.reject(new DOMException('aborted', 'AbortError'));
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ recs: [] }) });
        });
        vi.stubGlobal('fetch', fetchSpy);
        await expect(
            getEinsteinRecommendations({
                context: new RouterContextProvider(),
                request: new Request('http://localhost/'),
                name: 'home-top-revenue-for-category',
                signal: ac.signal,
            })
        ).rejects.toMatchObject({ name: 'AbortError' });
    });

    it.each([
        ['realm', ''],
        ['host', ''],
    ])('returns {} when config is enabled but %s is invalid', async (field, value) => {
        // Per-field matrix lives in einstein-config.test.ts; these cases lock in the wiring
        // that any validator failure short-circuits the recs call without hitting the network.
        vi.resetModules();
        vi.doMock('@salesforce/storefront-next-runtime/config', () => ({
            getConfig: () => ({
                engagement: {
                    adapters: {
                        einstein: {
                            enabled: true,
                            host: 'https://api.cquotient.com',
                            einsteinId: 'test-client-id',
                            realm: 'aaij',
                            siteId: 'TestSite',
                            isProduction: false,
                            [field]: value,
                        },
                    },
                },
            }),
        }));
        const { getEinsteinRecommendations } = await import('./recommendations-einstein.server');
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);
        const result = await getEinsteinRecommendations({
            context: new RouterContextProvider(),
            request: new Request('http://localhost/'),
            name: 'home',
        });
        expect(result).toEqual({});
        expect(fetchSpy).not.toHaveBeenCalled();
        vi.doUnmock('@salesforce/storefront-next-runtime/config');
    });

    it('returns {} when adapter is disabled', async () => {
        // Re-import after temporarily overriding the mock requires module-level reset.
        // Instead, exercise via einsteinId/realm absent? Plan says enabled flag.
        // Use a direct mock override via doMock pattern.
        vi.resetModules();
        vi.doMock('@salesforce/storefront-next-runtime/config', () => ({
            getConfig: () => ({
                engagement: {
                    adapters: {
                        einstein: {
                            enabled: false,
                            host: 'https://api.cquotient.com',
                            einsteinId: 'test-client-id',
                            realm: 'aaij',
                            siteId: 'TestSite',
                            isProduction: false,
                        },
                    },
                },
            }),
        }));
        const { getEinsteinRecommendations } = await import('./recommendations-einstein.server');
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);
        const result = await getEinsteinRecommendations({
            context: new RouterContextProvider(),
            request: new Request('http://localhost/'),
            name: 'home',
        });
        expect(result).toEqual({});
        expect(fetchSpy).not.toHaveBeenCalled();
        vi.doUnmock('@salesforce/storefront-next-runtime/config');
    });
});
