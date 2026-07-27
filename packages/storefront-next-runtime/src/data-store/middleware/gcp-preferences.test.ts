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
import { DataStore, DataStoreServiceError } from '@salesforce/mrt-utilities/middleware';
import { gcpPreferencesMiddleware, gcpPreferencesContext, getGcpApiKey, getGcpPreferences } from './gcp-preferences';

type MiddlewareNext = Parameters<MiddlewareFunction<Response>>[1];

describe('gcpPreferencesMiddleware', () => {
    let context: RouterContextProvider;
    let next: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        process.env.AWS_REGION = 'us-east-1';
        process.env.MOBIFY_PROPERTY_ID = 'prop-1';
        process.env.DEPLOY_TARGET = 'production';

        const store = new Map<unknown, unknown>();
        context = {
            set: (ctx: unknown, value: unknown) => store.set(ctx, value),
            get: (ctx: unknown) => store.get(ctx),
        } as unknown as RouterContextProvider;

        next = vi.fn().mockResolvedValue(new Response('ok'));
    });

    it('stores preferences in context when the entry is valid', async () => {
        const sendMock = vi.fn().mockResolvedValue({
            Item: { value: { 'api-key': 'gcp-ootb-key' } },
        });
        DataStore._testDocumentClient = {
            send: sendMock,
        } as unknown as typeof DataStore._testDocumentClient;

        await gcpPreferencesMiddleware(
            {
                request: new Request('https://example.com'),
                context,
                params: {},
                pattern: '',
                url: new URL(new Request('https://example.com').url),
            },
            next as MiddlewareNext
        );

        expect(sendMock).toHaveBeenCalled();
        expect(getGcpPreferences(context)).toEqual({ apiKey: 'gcp-ootb-key' });
        expect(getGcpApiKey(context)).toBe('gcp-ootb-key');
        expect(context.get(gcpPreferencesContext)).toEqual({ apiKey: 'gcp-ootb-key' });
        expect(next).toHaveBeenCalledOnce();
    });

    it('coerces non-string api-key values to an empty string', async () => {
        DataStore._testDocumentClient = {
            send: vi.fn().mockResolvedValue({
                Item: { value: { 'api-key': 12345 } },
            }),
        } as unknown as typeof DataStore._testDocumentClient;

        await gcpPreferencesMiddleware(
            {
                request: new Request('https://example.com'),
                context,
                params: {},
                pattern: '',
                url: new URL(new Request('https://example.com').url),
            },
            next as MiddlewareNext
        );

        expect(getGcpPreferences(context)).toEqual({ apiKey: '' });
        expect(getGcpApiKey(context)).toBe('');
        expect(next).toHaveBeenCalledOnce();
    });

    it('coerces a missing api-key map key to an empty string', async () => {
        DataStore._testDocumentClient = {
            send: vi.fn().mockResolvedValue({
                Item: { value: {} },
            }),
        } as unknown as typeof DataStore._testDocumentClient;

        await gcpPreferencesMiddleware(
            {
                request: new Request('https://example.com'),
                context,
                params: {},
                pattern: '',
                url: new URL(new Request('https://example.com').url),
            },
            next as MiddlewareNext
        );

        expect(getGcpPreferences(context)).toEqual({ apiKey: '' });
        expect(getGcpApiKey(context)).toBe('');
        expect(next).toHaveBeenCalledOnce();
    });

    it('calls next without populating the context when the entry value is missing or non-object', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        DataStore._testDocumentClient = {
            send: vi.fn().mockResolvedValue({
                Item: { value: undefined },
            }),
        } as unknown as typeof DataStore._testDocumentClient;

        await gcpPreferencesMiddleware(
            {
                request: new Request('https://example.com'),
                context,
                params: {},
                pattern: '',
                url: new URL(new Request('https://example.com').url),
            },
            next as MiddlewareNext
        );

        expect(context.get(gcpPreferencesContext)).toBeUndefined();
        expect(next).toHaveBeenCalledOnce();

        warnSpy.mockRestore();
    });

    it('calls next without populating the context when the entry is missing', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        DataStore._testDocumentClient = {
            send: vi.fn().mockResolvedValue({}),
        } as unknown as typeof DataStore._testDocumentClient;

        await gcpPreferencesMiddleware(
            {
                request: new Request('https://example.com'),
                context,
                params: {},
                pattern: '',
                url: new URL(new Request('https://example.com').url),
            },
            next as MiddlewareNext
        );

        expect(context.get(gcpPreferencesContext)).toBeUndefined();
        expect(next).toHaveBeenCalledOnce();

        warnSpy.mockRestore();
    });

    it('calls next without populating the context when the entry value is not an object', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        DataStore._testDocumentClient = {
            send: vi.fn().mockResolvedValue({
                Item: { value: 'not-an-object' },
            }),
        } as unknown as typeof DataStore._testDocumentClient;

        await gcpPreferencesMiddleware(
            {
                request: new Request('https://example.com'),
                context,
                params: {},
                pattern: '',
                url: new URL(new Request('https://example.com').url),
            },
            next as MiddlewareNext
        );

        expect(context.get(gcpPreferencesContext)).toBeUndefined();
        expect(next).toHaveBeenCalledOnce();

        warnSpy.mockRestore();
    });

    it('defaults to fallback when SFNEXT_DATA_STORE_UNAVAILABLE_MODE is unset', async () => {
        delete process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE;
        DataStore._testDocumentClient = {
            send: vi.fn().mockRejectedValue(new DataStoreServiceError('boom')),
        } as unknown as typeof DataStore._testDocumentClient;
        DataStore._testLogMRTError = vi.fn();
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        vi.resetModules();
        const fresh = await import('./gcp-preferences');
        await fresh.gcpPreferencesMiddleware(
            {
                request: new Request('https://example.com'),
                context,
                params: {},
                pattern: '',
                url: new URL(new Request('https://example.com').url),
            },
            next as MiddlewareNext
        );

        expect(context.get(fresh.gcpPreferencesContext)).toEqual({ apiKey: '' });
        expect(next).toHaveBeenCalledOnce();
        warnSpy.mockRestore();
    });

    it('throws on service error when SFNEXT_DATA_STORE_UNAVAILABLE_MODE=throw', async () => {
        process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE = 'throw';
        DataStore._testDocumentClient = {
            send: vi.fn().mockRejectedValue(new DataStoreServiceError('boom')),
        } as unknown as typeof DataStore._testDocumentClient;
        DataStore._testLogMRTError = vi.fn();

        vi.resetModules();
        const fresh = await import('./gcp-preferences');

        await expect(
            fresh.gcpPreferencesMiddleware(
                {
                    request: new Request('https://example.com'),
                    context,
                    params: {},
                    pattern: '',
                    url: new URL(new Request('https://example.com').url),
                },
                next as MiddlewareNext
            )
        ).rejects.toThrow(`Data store request failed for 'gcp'.`);
        expect(next).not.toHaveBeenCalled();
        delete process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE;
    });

    afterEach(() => {
        delete process.env.AWS_REGION;
        delete process.env.MOBIFY_PROPERTY_ID;
        delete process.env.DEPLOY_TARGET;
        delete process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE;
        DataStore._testDocumentClient = null;
        DataStore._testLogMRTError = null;
    });
});

describe('getGcpPreferences', () => {
    it('returns empty preferences without warning when the context is not populated', () => {
        const emptyContext = {
            set: vi.fn(),
            get: vi.fn().mockReturnValue(null),
        } as unknown as RouterContextProvider;

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        expect(getGcpPreferences(emptyContext)).toEqual({ apiKey: '' });
        expect(warnSpy).not.toHaveBeenCalled();

        warnSpy.mockRestore();
    });

    it('returns preferences without warning when the middleware populated the context with empty values', () => {
        const ctx = {
            set: vi.fn(),
            get: vi.fn().mockReturnValue({ apiKey: '' }),
        } as unknown as RouterContextProvider;
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        expect(getGcpPreferences(ctx)).toEqual({ apiKey: '' });
        expect(warnSpy).not.toHaveBeenCalled();

        warnSpy.mockRestore();
    });
});

describe('getGcpApiKey (convenience getter)', () => {
    it('returns the apiKey field from preferences when populated', () => {
        const ctx = {
            set: vi.fn(),
            get: vi.fn().mockReturnValue({ apiKey: 'gcp-ootb-key' }),
        } as unknown as RouterContextProvider;

        expect(getGcpApiKey(ctx)).toBe('gcp-ootb-key');
    });

    it('returns an empty string when preferences context is not populated', () => {
        const emptyContext = {
            set: vi.fn(),
            get: vi.fn().mockReturnValue(null),
        } as unknown as RouterContextProvider;
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        expect(getGcpApiKey(emptyContext)).toBe('');

        warnSpy.mockRestore();
    });
});
