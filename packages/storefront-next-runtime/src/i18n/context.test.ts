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
import { getTranslation, getLocale, mockI18nContext } from './context';

// Minimal RouterContextProvider mock
function createTestContext() {
    const store = new Map();
    return {
        get: (key: unknown) => store.get(key),
        set: (key: unknown, value: unknown) => store.set(key, value),
    } as any;
}

describe('i18n/context', () => {
    describe('getTranslation', () => {
        describe('server-side (window undefined)', () => {
            let originalWindow: typeof window;

            beforeEach(() => {
                originalWindow = global.window;
                // @ts-expect-error — simulate server environment
                delete global.window;
            });

            afterEach(() => {
                global.window = originalWindow;
            });

            it('returns translation function from context', () => {
                const context = createTestContext();
                const mockInstance = { t: vi.fn((k: string) => k), language: 'en' } as any;
                mockI18nContext(context, { locale: 'en', instance: mockInstance });

                const { t, i18next } = getTranslation(context);

                expect(i18next).toBe(mockInstance);
                expect(t).toBe(mockInstance.t);
            });

            it('throws when i18next data not in context', () => {
                const context = createTestContext();

                expect(() => getTranslation(context)).toThrow(
                    'i18next data not found in context. Ensure i18next middleware runs before loaders.'
                );
            });
        });

        describe('client-side (window defined)', () => {
            it('returns global i18next without context', () => {
                const { t, i18next } = getTranslation();

                expect(typeof t).toBe('function');
                expect(typeof i18next).toBe('object');
            });

            it('returns global i18next even when context is provided', () => {
                const context = createTestContext();
                const { t } = getTranslation(context);

                expect(typeof t).toBe('function');
            });

            it('returns consistent t reference across calls', () => {
                const r1 = getTranslation();
                const r2 = getTranslation();

                expect(r1.t).toBe(r2.t);
            });

            it('t is bound to the i18next instance', () => {
                const result = getTranslation();
                expect(result.t).toBe(result.i18next.t);
            });

            it('i18next instance exposes t function', () => {
                const result = getTranslation();
                expect(typeof result.i18next.t).toBe('function');
            });
        });

        it('handles undefined context gracefully', () => {
            expect(() => getTranslation(undefined)).not.toThrow();
        });
    });

    describe('getLocale', () => {
        let originalWindow: typeof window;

        beforeEach(() => {
            originalWindow = global.window;
            // @ts-expect-error — simulate server environment
            delete global.window;
        });

        afterEach(() => {
            global.window = originalWindow;
        });

        it('returns locale from context', () => {
            const context = createTestContext();
            mockI18nContext(context, { locale: 'fr-FR' });

            expect(getLocale(context)).toBe('fr-FR');
        });

        it('returns undefined when context has no i18n data', () => {
            const context = createTestContext();

            expect(getLocale(context)).toBeUndefined();
        });
    });

    describe('mockI18nContext', () => {
        it('sets default locale and i18next instance', () => {
            const context = createTestContext();
            mockI18nContext(context);

            expect(getLocale(context)).toBe('en-GB');
        });

        it('accepts locale override', () => {
            const context = createTestContext();
            mockI18nContext(context, { locale: 'de-DE' });

            expect(getLocale(context)).toBe('de-DE');
        });

        it('accepts instance override', () => {
            const context = createTestContext();
            const fakeInstance = { t: vi.fn(), language: 'ja' } as any;
            mockI18nContext(context, { instance: fakeInstance });

            // Verify by reading via getTranslation in a server-like env
            const saved = global.window;
            // @ts-expect-error — simulate server environment
            delete global.window;
            const { i18next } = getTranslation(context);
            global.window = saved;
            expect(i18next).toBe(fakeInstance);
        });
    });
});
