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
import { describe, test, expect } from 'vitest';
import {
    parseExpression,
    parseFieldValue,
    resolveExpression,
    resolveComponentDataBindings,
} from './resolve-data-bindings';
import type { ShopperExperience } from '@/scapi-client/types';
import type { ComponentDataBinding, DataBindingRequirement, QualifierContext } from '../types';

type Component = ShopperExperience.schemas['Component'];

const makeComponent = (overrides: Partial<Component> = {}): Component => ({
    id: 'comp-1',
    typeId: 'commerce_assets.banner',
    regions: [],
    ...overrides,
});

describe('parseExpression', () => {
    test('parses bare expression type.field', () => {
        expect(parseExpression('content_asset.body')).toEqual({
            type: 'content_asset',
            field: 'body',
        });
    });

    test('parses expression with leading/trailing whitespace', () => {
        expect(parseExpression('  content_asset.body  ')).toEqual({
            type: 'content_asset',
            field: 'body',
        });
    });

    test('returns null for plain text without a dot', () => {
        expect(parseExpression('just-a-value')).toBeNull();
    });

    test('returns null for empty string', () => {
        expect(parseExpression('')).toBeNull();
    });

    test('returns null for expression with too many segments', () => {
        expect(parseExpression('a.b.c')).toBeNull();
    });
});

describe('parseFieldValue', () => {
    test('coerces "true" and "false" to booleans', () => {
        expect(parseFieldValue('true')).toBe(true);
        expect(parseFieldValue('false')).toBe(false);
    });

    test('coerces numeric strings to numbers', () => {
        expect(parseFieldValue('2026')).toBe(2026);
        expect(parseFieldValue('0')).toBe(0);
        expect(parseFieldValue('-12.5')).toBe(-12.5);
    });

    test('returns non-numeric, non-boolean strings as-is', () => {
        expect(parseFieldValue('Winter Sale')).toBe('Winter Sale');
        expect(parseFieldValue('<div>Hi</div>')).toBe('<div>Hi</div>');
    });

    test('preserves empty and whitespace-only strings as strings', () => {
        expect(parseFieldValue('')).toBe('');
        expect(parseFieldValue('   ')).toBe('   ');
    });

    test('passes non-string values through unchanged', () => {
        expect(parseFieldValue(42)).toBe(42);
        expect(parseFieldValue(true)).toBe(true);
        expect(parseFieldValue(null)).toBe(null);
        expect(parseFieldValue(undefined)).toBe(undefined);
    });
});

describe('resolveExpression', () => {
    const contexts: DataBindingRequirement[] = [{ type: 'content_asset', id: 'asset-uuid-1' }];

    const dataBindings: NonNullable<QualifierContext['dataBindings']> = {
        content_asset: {
            'asset-uuid-1': {
                title: 'Winter Sale',
                body: '<div>Free Shipping</div>',
            },
        },
    };

    test('resolves a bare expression to the correct field value', () => {
        expect(resolveExpression('content_asset.title', contexts, dataBindings)).toBe('Winter Sale');
    });

    test('resolves a bare expression to the correct field value (body)', () => {
        expect(resolveExpression('content_asset.body', contexts, dataBindings)).toBe('<div>Free Shipping</div>');
    });

    test('returns empty string for an invalid expression', () => {
        expect(resolveExpression('not-valid', contexts, dataBindings)).toBe('');
    });

    test('returns empty string when no matching context exists', () => {
        expect(resolveExpression('product.name', contexts, dataBindings)).toBe('');
    });

    test('returns empty string when the record is not in dataBindings', () => {
        const missingBindings: NonNullable<QualifierContext['dataBindings']> = {
            content_asset: {},
        };
        expect(resolveExpression('content_asset.title', contexts, missingBindings)).toBe('');
    });

    test('returns empty string when the field does not exist on the record', () => {
        expect(resolveExpression('content_asset.nonexistent', contexts, dataBindings)).toBe('');
    });

    test('resolves to the value even when it is falsy (e.g. 0, false)', () => {
        const bindingsWithFalsy: NonNullable<QualifierContext['dataBindings']> = {
            content_asset: {
                'asset-uuid-1': { count: 0, active: false },
            },
        };
        expect(resolveExpression('content_asset.count', contexts, bindingsWithFalsy)).toBe(0);
        expect(resolveExpression('content_asset.active', contexts, bindingsWithFalsy)).toBe(false);
    });

    test('parses string values returned by the API into typed values', () => {
        const stringBindings: NonNullable<QualifierContext['dataBindings']> = {
            content_asset: {
                'asset-uuid-1': {
                    year: '2026',
                    active: 'true',
                    disabled: 'false',
                    title: 'Winter Sale',
                },
            },
        };
        expect(resolveExpression('content_asset.year', contexts, stringBindings)).toBe(2026);
        expect(resolveExpression('content_asset.active', contexts, stringBindings)).toBe(true);
        expect(resolveExpression('content_asset.disabled', contexts, stringBindings)).toBe(false);
        expect(resolveExpression('content_asset.title', contexts, stringBindings)).toBe('Winter Sale');
    });

    test('resolves with multiple contexts selecting the correct one', () => {
        const multiContexts: DataBindingRequirement[] = [
            { type: 'content_asset', id: 'asset-uuid-1' },
            { type: 'product', id: 'prod-123' },
        ];
        const multiBindings: NonNullable<QualifierContext['dataBindings']> = {
            ...dataBindings,
            product: {
                'prod-123': { name: 'Nike Air Max', salesPrice: 129.99 },
            },
        };
        expect(resolveExpression('product.name', multiContexts, multiBindings)).toBe('Nike Air Max');
        expect(resolveExpression('content_asset.title', multiContexts, multiBindings)).toBe('Winter Sale');
    });
});

describe('resolveComponentDataBindings', () => {
    const dataBindings: QualifierContext['dataBindings'] = {
        content_asset: {
            'asset-uuid-1': {
                title: 'Winter Sale',
                body: '<div>Free Shipping on all orders!</div>',
                image: 'https://example.com/banner.jpg',
            },
        },
    };

    test('resolves expressions in component data attributes', () => {
        const component = makeComponent({
            id: 'banner',
            data: { heading: 'Fallback Title', body: 'Fallback Body' } as unknown as Component['data'],
        });

        const binding: ComponentDataBinding = {
            expressions: {
                heading: 'content_asset.title',
                body: 'content_asset.body',
            },
            contexts: [{ type: 'content_asset', id: 'asset-uuid-1' }],
        };

        const result = resolveComponentDataBindings(component, binding, dataBindings);
        const data = result.data as Record<string, unknown>;

        expect(data.heading).toBe('Winter Sale');
        expect(data.body).toBe('<div>Free Shipping on all orders!</div>');
    });

    test('preserves attributes that are not in expressions', () => {
        const component = makeComponent({
            id: 'banner',
            data: {
                heading: 'Static Heading',
                subheading: 'Keep This',
            } as unknown as Component['data'],
        });

        const binding: ComponentDataBinding = {
            expressions: { heading: 'content_asset.title' },
            contexts: [{ type: 'content_asset', id: 'asset-uuid-1' }],
        };

        const result = resolveComponentDataBindings(component, binding, dataBindings);
        const data = result.data as Record<string, unknown>;

        expect(data.heading).toBe('Winter Sale');
        expect(data.subheading).toBe('Keep This');
    });

    test('returns component unchanged when dataBindings is undefined', () => {
        const component = makeComponent();

        const binding: ComponentDataBinding = {
            expressions: { heading: 'content_asset.title' },
            contexts: [{ type: 'content_asset', id: 'asset-uuid-1' }],
        };

        const result = resolveComponentDataBindings(component, binding, undefined);
        expect(result).toBe(component);
    });

    test('returns component unchanged when binding is null', () => {
        const component = makeComponent({
            id: 'plain',
            data: { heading: 'No Binding' } as unknown as Component['data'],
        });

        const result = resolveComponentDataBindings(component, null, dataBindings);
        expect(result).toBe(component);
        expect((result.data as Record<string, unknown>).heading).toBe('No Binding');
    });

    test('returns component unchanged when binding is undefined', () => {
        const component = makeComponent({
            id: 'plain',
            data: { heading: 'No Binding' } as unknown as Component['data'],
        });

        const result = resolveComponentDataBindings(component, undefined, dataBindings);
        expect(result).toBe(component);
        expect((result.data as Record<string, unknown>).heading).toBe('No Binding');
    });

    test('sets unresolvable expressions to empty string', () => {
        const component = makeComponent({
            id: 'banner',
            data: { heading: 'Fallback' } as unknown as Component['data'],
        });

        const binding: ComponentDataBinding = {
            expressions: { heading: 'content_asset.nonexistent' },
            contexts: [{ type: 'content_asset', id: 'asset-uuid-1' }],
        };

        const result = resolveComponentDataBindings(component, binding, dataBindings);
        expect((result.data as Record<string, unknown>).heading).toBe('');
    });

    test('returns component unchanged with empty expressions object', () => {
        const component = makeComponent({
            id: 'banner',
            data: { heading: 'Static' } as unknown as Component['data'],
        });

        const binding: ComponentDataBinding = {
            expressions: {},
            contexts: [{ type: 'content_asset', id: 'asset-uuid-1' }],
        };

        const result = resolveComponentDataBindings(component, binding, dataBindings);
        expect(result).toBe(component);
    });

    test('returns component unchanged with empty context array', () => {
        const component = makeComponent({
            id: 'banner',
            data: { heading: 'Static' } as unknown as Component['data'],
        });

        const binding: ComponentDataBinding = {
            expressions: { heading: 'content_asset.title' },
            contexts: [],
        };

        const result = resolveComponentDataBindings(component, binding, dataBindings);
        expect(result).toBe(component);
    });

    test('resolves bindings from multiple data providers on one component', () => {
        const multiBindings: QualifierContext['dataBindings'] = {
            content_asset: {
                'asset-uuid-1': { title: 'Winter Sale' },
            },
            product: {
                'prod-123': { salesPrice: 129.99 },
            },
        };

        const component = makeComponent({
            id: 'promo',
            data: { heading: 'Default', price: 0 } as unknown as Component['data'],
        });

        const binding: ComponentDataBinding = {
            expressions: {
                heading: 'content_asset.title',
                price: 'product.salesPrice',
            },
            contexts: [
                { type: 'content_asset', id: 'asset-uuid-1' },
                { type: 'product', id: 'prod-123' },
            ],
        };

        const result = resolveComponentDataBindings(component, binding, multiBindings);
        const data = result.data as Record<string, unknown>;

        expect(data.heading).toBe('Winter Sale');
        expect(data.price).toBe(129.99);
    });
});
