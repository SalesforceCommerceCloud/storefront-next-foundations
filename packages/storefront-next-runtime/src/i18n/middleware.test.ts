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
import { createI18nMiddleware } from './middleware';

const mockOriginalMiddleware = vi.fn((_args: unknown, next: () => unknown) => next());
const mockGetLocale = vi.fn(() => 'en-GB');
const mockGetInstance = vi.fn(() => ({ t: vi.fn() }));

vi.mock('remix-i18next/middleware', () => ({
    createI18nextMiddleware: vi.fn(() => [mockOriginalMiddleware, mockGetLocale, mockGetInstance]),
}));

vi.mock('../site-context/index.js', () => ({
    requestToLocaleMap: {
        get: vi.fn(() => 'en-GB'),
    },
}));

describe('createI18nMiddleware', () => {
    let context: Map<unknown, unknown>;
    let args: any;
    const next = vi.fn(() => Promise.resolve(new Response('ok')));

    beforeEach(() => {
        context = new Map();
        args = {
            request: new Request('https://example.com/'),
            context: {
                get: (k: unknown) => context.get(k),
                set: (k: unknown, v: unknown) => context.set(k, v),
            },
        };
        vi.clearAllMocks();
        mockOriginalMiddleware.mockImplementation((_a: unknown, n: () => unknown) => n());
    });

    it('returns a middleware function', () => {
        const middleware = createI18nMiddleware({
            resources: {},
            supportedLanguages: ['en-GB'],
            fallbackLanguage: 'en-GB',
        });

        expect(typeof middleware).toBe('function');
    });

    it('calls the underlying middleware on invocation', async () => {
        const middleware = createI18nMiddleware({
            resources: {},
            supportedLanguages: ['en-GB'],
            fallbackLanguage: 'en-GB',
        });

        await middleware(args, next);

        expect(mockOriginalMiddleware).toHaveBeenCalledTimes(1);
    });

    it('sets i18next accessor functions in context', async () => {
        const { i18nextContext } = await import('./context');

        const middleware = createI18nMiddleware({
            resources: {},
            supportedLanguages: ['en-GB'],
            fallbackLanguage: 'en-GB',
        });

        await middleware(args, next);

        const data = context.get(i18nextContext);
        expect(data).toBeDefined();
        expect(typeof (data as any).getLocale).toBe('function');
        expect(typeof (data as any).getI18nextInstance).toBe('function');
    });

    it('lazy-initializes: createI18nextMiddleware called only once across invocations', async () => {
        const { createI18nextMiddleware } = await import('remix-i18next/middleware');

        const middleware = createI18nMiddleware({
            resources: {},
            supportedLanguages: ['en-GB'],
            fallbackLanguage: 'en-GB',
        });

        await middleware(args, next);
        await middleware(args, next);
        await middleware(args, next);

        expect(createI18nextMiddleware).toHaveBeenCalledTimes(1);
    });

    it('merges caller interpolation options with defaults', async () => {
        const { createI18nextMiddleware } = await import('remix-i18next/middleware');
        const customInterpolation = { prefix: '[[', suffix: ']]' };

        const middleware = createI18nMiddleware({
            resources: {},
            supportedLanguages: ['en-GB'],
            fallbackLanguage: 'en-GB',
            interpolation: customInterpolation,
        });

        await middleware(args, next);

        const call = (createI18nextMiddleware as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(call.i18next.interpolation).toMatchObject(customInterpolation);
        expect(call.i18next.interpolation.escapeValue).toBe(false);
    });
});
