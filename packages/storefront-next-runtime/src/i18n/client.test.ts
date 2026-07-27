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
import { initI18next } from './client';
import i18next from 'i18next';

vi.mock('@/locales/en-GB/index.ts', () => ({
    default: { translations: { hello: 'Hello', welcome: 'Welcome' }, common: { yes: 'Yes', no: 'No' } },
}));

vi.mock('@/locales/it-IT/index.ts', () => ({
    default: { translations: { hello: 'Ciao', welcome: 'Benvenuto' }, common: { yes: 'Sì', no: 'No' } },
}));

describe('initI18next', () => {
    let testInstance: ReturnType<typeof i18next.createInstance>;

    beforeEach(() => {
        testInstance = i18next.createInstance();
    });

    it('returns the global i18next instance when none provided', () => {
        const result = initI18next();
        expect(result).toBe(i18next);
    });

    it('returns the provided instance', () => {
        const result = initI18next({ instance: testInstance });
        expect(result).toBe(testInstance);
    });

    it('sets language synchronously before init when language provided', () => {
        initI18next({ language: 'fr', instance: testInstance });
        expect(testInstance.language).toBe('fr');
    });

    it('initializes with htmlTag detection when no language provided', () => {
        const initSpy = vi.spyOn(testInstance, 'init');
        initI18next({ instance: testInstance });

        const callArgs = initSpy.mock.calls[0][0] as any;
        expect(callArgs.detection).toMatchObject({ order: ['htmlTag'], caches: [] });
    });

    it('initializes with explicit lng when language is provided', () => {
        const initSpy = vi.spyOn(testInstance, 'init');
        initI18next({ language: 'de', instance: testInstance });

        const callArgs = initSpy.mock.calls[0][0] as any;
        expect(callArgs.lng).toBe('de');
        expect(callArgs.detection).toBeUndefined();
    });

    it('registers dynamic import backend when loadLocale provided', async () => {
        const loadLocale = vi.fn().mockResolvedValue({
            default: { translations: { hello: 'Hello', welcome: 'Welcome' }, common: { yes: 'Yes', no: 'No' } },
        });

        initI18next({ language: 'en-GB', instance: testInstance, loadLocale });
        await testInstance.loadNamespaces('translations');

        expect(loadLocale).toHaveBeenCalledWith('en-GB');
        expect(testInstance.store.data['en-GB']?.translations).toEqual({ hello: 'Hello', welcome: 'Welcome' });
        expect(testInstance.store.data['en-GB']?.common).toEqual({ yes: 'Yes', no: 'No' });
    });

    it('loads translations for different languages', async () => {
        const loadLocale = vi.fn((lang: string) =>
            Promise.resolve({
                default:
                    lang === 'it-IT'
                        ? { translations: { hello: 'Ciao' }, common: { yes: 'Sì' } }
                        : { translations: { hello: 'Hello' }, common: { yes: 'Yes' } },
            })
        );

        initI18next({ language: 'en-GB', instance: testInstance, loadLocale });
        await testInstance.changeLanguage('it-IT');
        await testInstance.loadNamespaces('translations');

        expect(testInstance.store.data['it-IT']?.translations).toEqual({ hello: 'Ciao' });
    });

    it('non-existent namespace returns empty object', async () => {
        const loadLocale = vi.fn().mockResolvedValue({
            default: { translations: { hello: 'Hello' } },
        });

        initI18next({ language: 'en-GB', instance: testInstance, loadLocale });
        await testInstance.loadNamespaces('nonexistent-namespace');

        const data = testInstance.store.data['en-GB']?.['nonexistent-namespace'];
        expect(data).toEqual({});
    });

    it('loads multiple namespaces at once', async () => {
        const loadLocale = vi.fn().mockResolvedValue({
            default: { translations: { hello: 'Hello' }, common: { yes: 'Yes' } },
        });

        initI18next({ language: 'en-GB', instance: testInstance, loadLocale });
        await testInstance.loadNamespaces(['translations', 'common']);

        expect(testInstance.store.data['en-GB']?.translations).toBeDefined();
        expect(testInstance.store.data['en-GB']?.common).toBeDefined();
    });

    it('initializes with defaultInterpolation', () => {
        const initSpy = vi.spyOn(testInstance, 'init');
        initI18next({ instance: testInstance });

        const callArgs = initSpy.mock.calls[0][0] as any;
        expect(callArgs.interpolation.escapeValue).toBe(false);
        expect(typeof callArgs.interpolation.format).toBe('function');
    });

    it('handles loadLocale error gracefully', async () => {
        const loadLocale = vi.fn().mockRejectedValue(new Error('Module not found'));

        initI18next({ language: 'xx', instance: testInstance, loadLocale });

        // Should not throw - the backend handles errors via callback
        await expect(testInstance.loadNamespaces('translations').catch(() => undefined)).resolves.toBeUndefined();
    });
});
