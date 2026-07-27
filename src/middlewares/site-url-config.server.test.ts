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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MiddlewareFunction, RouterContextProvider } from 'react-router';
import { DataStore } from '@salesforce/storefront-next-runtime/data-store';
import { siteContext, type SiteContext } from '@salesforce/storefront-next-runtime/site-context';
import { siteUrlConfigMiddleware, getSiteUrlConfig, SITE_URL_CONFIG_KEY_SUFFIX } from './site-url-config.server';

type MiddlewareNext = Parameters<MiddlewareFunction<Response>>[1];

describe('siteUrlConfigMiddleware', () => {
    let context: RouterContextProvider;
    let next: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        process.env.AWS_REGION = 'us-east-1';
        process.env.MOBIFY_PROPERTY_ID = 'prop-1';
        process.env.DEPLOY_TARGET = 'production';

        const store = new Map<unknown, unknown>();
        // Site context must be populated before the middleware runs because
        // the entry key is `{siteId}-url-config`.
        store.set(siteContext, {
            site: { id: 'RefArch' },
        } as unknown as SiteContext);

        context = {
            set: (ctx: unknown, value: unknown) => store.set(ctx, value),
            get: (ctx: unknown) => store.get(ctx),
        } as unknown as RouterContextProvider;

        next = vi.fn().mockResolvedValue(new Response('ok'));
    });

    afterEach(() => {
        delete process.env.AWS_REGION;
        delete process.env.MOBIFY_PROPERTY_ID;
        delete process.env.DEPLOY_TARGET;
        DataStore._testDocumentClient = null;
        DataStore._testLogMRTError = null;
    });

    it('uses the {siteId}-url-config suffix verbatim from the ECOM provider', () => {
        expect(SITE_URL_CONFIG_KEY_SUFFIX).toBe('url-config');
    });

    it('does not fetch the entry until a consumer reads it', async () => {
        const sendMock = vi.fn().mockResolvedValue({
            Item: { value: { data: { mediaHostPrefix: 'https://www.example.com' } } },
        });
        DataStore._testDocumentClient = {
            send: sendMock,
        } as unknown as typeof DataStore._testDocumentClient;

        await siteUrlConfigMiddleware(
            {
                request: new Request('https://example.com'),
                context,
                params: {},
                pattern: '',
                url: new URL('https://example.com'),
            },
            next as MiddlewareNext
        );

        // Middleware just registered a loader — the Data Store should not
        // have been hit yet.
        expect(sendMock).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledOnce();

        // First read triggers the fetch and resolves the value.
        const value = await getSiteUrlConfig(context);
        expect(value).toEqual({ mediaHostPrefix: 'https://www.example.com' });
        expect(sendMock).toHaveBeenCalledOnce();
    });

    it('reuses the cached promise on subsequent reads within a request', async () => {
        const sendMock = vi.fn().mockResolvedValue({
            Item: { value: { data: { mediaHostPrefix: 'https://www.example.com' } } },
        });
        DataStore._testDocumentClient = {
            send: sendMock,
        } as unknown as typeof DataStore._testDocumentClient;

        await siteUrlConfigMiddleware(
            {
                request: new Request('https://example.com'),
                context,
                params: {},
                pattern: '',
                url: new URL('https://example.com'),
            },
            next as MiddlewareNext
        );

        await getSiteUrlConfig(context);
        await getSiteUrlConfig(context);
        await getSiteUrlConfig(context);

        // Three reads, one fetch.
        expect(sendMock).toHaveBeenCalledOnce();
    });

    it('builds the data-store key from the active site id', async () => {
        const sendMock = vi.fn().mockResolvedValue({
            Item: { value: { data: { mediaHostPrefix: 'https://www.example.com' } } },
        });
        DataStore._testDocumentClient = {
            send: sendMock,
        } as unknown as typeof DataStore._testDocumentClient;

        await siteUrlConfigMiddleware(
            {
                request: new Request('https://example.com'),
                context,
                params: {},
                pattern: '',
                url: new URL('https://example.com'),
            },
            next as MiddlewareNext
        );

        // Force the lazy fetch.
        await getSiteUrlConfig(context);

        // The DocumentClient send is called with a GetCommand whose input
        // carries the constructed key. Inspect the first call's argument.
        const call = sendMock.mock.calls[0]?.[0] as { input?: { Key?: { key?: string } } } | undefined;
        expect(call?.input?.Key?.key).toBe('RefArch-url-config');
    });

    it('throws when site context is missing on read — the entry key cannot be built', async () => {
        // Reset to a context that doesn't have siteContext populated.
        const store = new Map<unknown, unknown>();
        const emptyContext = {
            set: (ctx: unknown, value: unknown) => store.set(ctx, value),
            get: (ctx: unknown) => store.get(ctx),
        } as unknown as RouterContextProvider;

        // Middleware itself succeeds — the entry-key build is deferred to
        // the first read.
        await siteUrlConfigMiddleware(
            {
                request: new Request('https://example.com'),
                url: new URL('https://example.com'),
                context: emptyContext,
                params: {},
                pattern: '',
            },
            next as MiddlewareNext
        );

        await expect(getSiteUrlConfig(emptyContext)).rejects.toThrow('Site id not found');
    });

    it('returns null on read when the entry is missing', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        DataStore._testDocumentClient = {
            send: vi.fn().mockResolvedValue({}),
        } as unknown as typeof DataStore._testDocumentClient;

        await siteUrlConfigMiddleware(
            {
                request: new Request('https://example.com'),
                context,
                params: {},
                pattern: '',
                url: new URL('https://example.com'),
            },
            next as MiddlewareNext
        );

        expect(await getSiteUrlConfig(context)).toBeNull();
        expect(next).toHaveBeenCalledOnce();

        warnSpy.mockRestore();
    });
});

describe('getSiteUrlConfig', () => {
    it('returns null when the context has not been populated with a loader', async () => {
        const emptyContext = {
            set: vi.fn(),
            get: vi.fn().mockReturnValue(null),
        } as unknown as RouterContextProvider;

        await expect(getSiteUrlConfig(emptyContext)).resolves.toBeNull();
    });

    it('invokes the loader stored in context and returns its resolved value', async () => {
        const loader = vi.fn().mockResolvedValue({ mediaHostPrefix: 'https://www.example.com' });
        const ctx = {
            set: vi.fn(),
            get: vi.fn().mockReturnValue(loader),
        } as unknown as RouterContextProvider;

        await expect(getSiteUrlConfig(ctx)).resolves.toEqual({ mediaHostPrefix: 'https://www.example.com' });
        expect(loader).toHaveBeenCalledOnce();
    });
});
