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
import { describe, test, expect, vi } from 'vitest';
import { getPageFromManifest } from './get-page';
import type { PageManifest, VariationEntry, QualifierContext } from '../types';

const makePage = (id = 'test-page') => ({ id, typeId: 'storePage', regions: [] });

const makeVariation = (overrides: Partial<VariationEntry> = {}): VariationEntry => ({
    ruleRequiresContext: false,
    pageRequiresContext: false,
    page: makePage(),
    regions: {},
    ...overrides,
});

const LOCALE = 'en-US';

const makeManifest = (overrides: Partial<PageManifest> = {}): PageManifest => ({
    pageId: 'test-page',
    context: { campaignQualifiers: [], customerGroups: [], dataBindings: [] },
    variationOrder: [],
    variations: {},
    defaultVariation: 'default',
    componentInfo: {},
    ...overrides,
});

describe('getPageFromManifest', () => {
    test('returns the first variation whose rule passes', async () => {
        const manifest = makeManifest({
            variationOrder: ['vip-variation', 'default'],
            variations: {
                'vip-variation': makeVariation({
                    visibilityRule: { activeLocales: ['en-US'], customerGroups: ['vip'] },
                    ruleRequiresContext: true,
                    page: makePage('vip-page'),
                }),
                default: makeVariation({ page: makePage('default-page') }),
            },
        });

        const result = await getPageFromManifest(manifest, {
            locale: LOCALE,
            contextResolver: () =>
                Promise.resolve({
                    customerGroups: { vip: true },
                    campaignQualifiers: {},
                }),
        });

        expect(result?.entry.page.id).toBe('vip-page');
    });

    test('falls back to defaultVariation when no variation matches', async () => {
        const manifest = makeManifest({
            variationOrder: ['vip-variation'],
            variations: {
                'vip-variation': makeVariation({
                    visibilityRule: { activeLocales: ['en-US'], customerGroups: ['vip'] },
                    ruleRequiresContext: true,
                }),
                default: makeVariation({ page: makePage('default-page') }),
            },
            defaultVariation: 'default',
        });

        const result = await getPageFromManifest(manifest, {
            locale: LOCALE,
            contextResolver: () =>
                Promise.resolve({
                    customerGroups: {},
                    campaignQualifiers: {},
                }),
        });

        expect(result?.entry.page.id).toBe('default-page');
    });

    test('returns null when no variation matches and no default exists', async () => {
        const manifest = makeManifest({
            variationOrder: ['vip-variation'],
            variations: {
                'vip-variation': makeVariation({
                    visibilityRule: { activeLocales: ['en-US'], customerGroups: ['vip'] },
                    ruleRequiresContext: true,
                }),
            },
            defaultVariation: 'nonexistent',
        });

        const result = await getPageFromManifest(manifest, {
            locale: LOCALE,
            contextResolver: () =>
                Promise.resolve({
                    customerGroups: {},
                    campaignQualifiers: {},
                }),
        });

        expect(result).toBeNull();
    });

    test('variation without visibilityRule always passes', async () => {
        const manifest = makeManifest({
            variationOrder: ['no-rule-variation'],
            variations: {
                'no-rule-variation': makeVariation({ page: makePage('unconditional') }),
            },
        });

        const result = await getPageFromManifest(manifest, { locale: LOCALE });
        expect(result?.entry.page.id).toBe('unconditional');
    });

    test('contextResolver is only called when ruleRequiresContext is true', async () => {
        const contextResolver = vi.fn(
            (): Promise<QualifierContext> =>
                Promise.resolve({
                    customerGroups: {},
                    campaignQualifiers: {},
                })
        );

        const manifest = makeManifest({
            variationOrder: ['schedule-only'],
            variations: {
                'schedule-only': makeVariation({
                    ruleRequiresContext: false,
                    visibilityRule: { activeLocales: ['en-US'] },
                }),
            },
        });

        await getPageFromManifest(manifest, { locale: LOCALE, contextResolver });
        expect(contextResolver).not.toHaveBeenCalled();
    });

    test('contextResolver is called only once even with multiple context-requiring variations', async () => {
        const contextResolver = vi.fn(
            (): Promise<QualifierContext> =>
                Promise.resolve({
                    customerGroups: {},
                    campaignQualifiers: {},
                })
        );

        const manifest = makeManifest({
            variationOrder: ['var-1', 'var-2'],
            variations: {
                'var-1': makeVariation({
                    ruleRequiresContext: true,
                    visibilityRule: { activeLocales: ['en-US'], customerGroups: ['vip'] },
                }),
                'var-2': makeVariation({
                    ruleRequiresContext: true,
                    visibilityRule: { activeLocales: ['en-US'], customerGroups: ['premium'] },
                }),
                default: makeVariation(),
            },
        });

        await getPageFromManifest(manifest, { locale: LOCALE, contextResolver });
        expect(contextResolver).toHaveBeenCalledTimes(1);
    });

    test('returns resolved context alongside the entry', async () => {
        const context: QualifierContext = {
            customerGroups: { vip: true },
            campaignQualifiers: {},
        };

        const manifest = makeManifest({
            variationOrder: ['vip'],
            variations: {
                vip: makeVariation({
                    ruleRequiresContext: true,
                    visibilityRule: { activeLocales: ['en-US'], customerGroups: ['vip'] },
                }),
            },
        });

        const result = await getPageFromManifest(manifest, {
            locale: LOCALE,
            contextResolver: () => Promise.resolve(context),
        });

        expect(result?.context).toEqual(context);
    });

    test('returns null context when no contextResolver is provided and context is needed', async () => {
        const manifest = makeManifest({
            variationOrder: ['needs-context'],
            variations: {
                'needs-context': makeVariation({
                    ruleRequiresContext: true,
                    visibilityRule: { activeLocales: ['en-US'], customerGroups: ['vip'] },
                }),
                default: makeVariation(),
            },
        });

        const result = await getPageFromManifest(manifest, { locale: LOCALE });
        expect(result?.context).toBeNull();
    });

    test('falls back to default when variationOrder references a missing variation ID', async () => {
        const manifest = makeManifest({
            variationOrder: ['nonexistent-id'],
            variations: {
                default: makeVariation({ page: makePage('default-page') }),
            },
            defaultVariation: 'default',
        });

        const result = await getPageFromManifest(manifest, { locale: LOCALE });
        expect(result?.entry.page.id).toBe('default-page');
    });
});
