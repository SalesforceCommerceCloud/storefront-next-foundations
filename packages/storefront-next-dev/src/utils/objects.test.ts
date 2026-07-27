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
import { describe, it, expect } from 'vitest';
import { flattenObject } from './objects.js';

describe('utils/objects', () => {
    describe('flattenObject', () => {
        it('flattens nested config object into dot-notation key-value pairs', () => {
            const config = {
                app: {
                    commerce: {
                        api: {
                            clientId: 'abc123',
                        },
                    },
                },
            };
            const result = flattenObject(config);
            expect(result).toContainEqual({ key: 'app.commerce.api.clientId', value: 'abc123' });
        });

        it('handles flat top-level keys', () => {
            const config = { foo: 'bar', baz: 42 };
            const result = flattenObject(config);
            expect(result).toContainEqual({ key: 'foo', value: 'bar' });
            expect(result).toContainEqual({ key: 'baz', value: 42 });
        });

        it('handles arrays as leaf values', () => {
            const config = { app: { site: { locales: ['en-US', 'es-MX'] } } };
            const result = flattenObject(config);
            expect(result).toContainEqual({ key: 'app.site.locales', value: ['en-US', 'es-MX'] });
        });

        it('handles boolean leaf values', () => {
            const config = { app: { features: { enabled: true } } };
            const result = flattenObject(config);
            expect(result).toContainEqual({ key: 'app.features.enabled', value: true });
        });

        it('handles number leaf values', () => {
            const config = { app: { pages: { cart: { quantityLimit: 10 } } } };
            const result = flattenObject(config);
            expect(result).toContainEqual({ key: 'app.pages.cart.quantityLimit', value: 10 });
        });

        it('handles empty strings as leaf values', () => {
            const config = { app: { commerce: { api: { shortCode: '' } } } };
            const result = flattenObject(config);
            expect(result).toContainEqual({ key: 'app.commerce.api.shortCode', value: '' });
        });

        it('handles null as leaf value', () => {
            const config = { app: { something: null } };
            const result = flattenObject(config);
            expect(result).toContainEqual({ key: 'app.something', value: null });
        });

        it('returns empty array for empty object', () => {
            expect(flattenObject({})).toEqual([]);
        });
    });
});
