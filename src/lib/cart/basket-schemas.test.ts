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
import { cartItemUpdateSchema, pickupStoreUpdateSchema, parsePickupStoreUpdateFromFormData } from './basket-schemas';

describe('cartItemUpdateSchema', () => {
    describe('valid data', () => {
        it('should validate when all required fields are provided', () => {
            const validData = {
                itemId: 'item-123',
                quantity: '2',
            };

            const result = cartItemUpdateSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.itemId).toBe('item-123');
                expect(result.data.quantity).toBe(2);
                expect(result.data.productId).toBeUndefined();
            }
        });

        it('should validate with optional productId', () => {
            const validData = {
                itemId: 'item-123',
                productId: 'product-456',
                quantity: '3',
            };

            const result = cartItemUpdateSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.itemId).toBe('item-123');
                expect(result.data.productId).toBe('product-456');
                expect(result.data.quantity).toBe(3);
            }
        });

        it('should trim whitespace from itemId and productId', () => {
            const validData = {
                itemId: '  item-123  ',
                productId: '  product-456  ',
                quantity: '1',
            };

            const result = cartItemUpdateSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.itemId).toBe('item-123');
                expect(result.data.productId).toBe('product-456');
            }
        });

        it('should convert string quantity to number', () => {
            const validData = {
                itemId: 'item-123',
                quantity: '5',
            };

            const result = cartItemUpdateSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.quantity).toBe(5);
                expect(typeof result.data.quantity).toBe('number');
            }
        });
    });

    describe('itemId validation', () => {
        it('should reject when itemId is missing', () => {
            const invalidData = {
                quantity: '2',
            };

            const result = cartItemUpdateSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('itemId'))).toBe(true);
            }
        });

        it('should reject when itemId is empty string', () => {
            const invalidData = {
                itemId: '',
                quantity: '2',
            };

            const result = cartItemUpdateSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('itemId'))).toBe(true);
            }
        });

        it('should accept whitespace-only itemId (min(1) checks before trim)', () => {
            const validData = {
                itemId: '   ',
                quantity: '2',
            };

            const result = cartItemUpdateSchema.safeParse(validData);
            // Note: z.string().min(1).trim() validates min(1) before trimming
            // So whitespace-only strings pass validation, then get trimmed to empty
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.itemId).toBe('');
            }
        });
    });

    describe('quantity validation', () => {
        it('should reject when quantity is missing', () => {
            const invalidData = {
                itemId: 'item-123',
            };

            const result = cartItemUpdateSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('quantity'))).toBe(true);
            }
        });

        it('should reject when quantity is empty string', () => {
            const invalidData = {
                itemId: 'item-123',
                quantity: '',
            };

            const result = cartItemUpdateSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('quantity'))).toBe(true);
            }
        });

        it('should reject when quantity is not a number', () => {
            const invalidData = {
                itemId: 'item-123',
                quantity: 'not-a-number',
            };

            // safeParse should catch transform errors and return a failed result
            let result;
            try {
                result = cartItemUpdateSchema.safeParse(invalidData);
            } catch (error) {
                // If an error is thrown, that's also acceptable - it means validation failed
                expect(error).toBeDefined();
                return;
            }

            // If safeParse succeeded in catching the error, verify it failed
            expect(result.success).toBe(false);
            if (!result.success) {
                // The error is thrown in the transform, so safeParse catches it
                // The error will be in the issues array or as a general parse error
                expect(result.error.issues.length).toBeGreaterThan(0);
            }
        });

        it('should reject when quantity is zero', () => {
            const invalidData = {
                itemId: 'item-123',
                quantity: '0',
            };

            const result = cartItemUpdateSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('quantity'))).toBe(true);
            }
        });

        it('should reject when quantity is negative', () => {
            const invalidData = {
                itemId: 'item-123',
                quantity: '-1',
            };

            const result = cartItemUpdateSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('quantity'))).toBe(true);
            }
        });

        it('should accept valid positive integer quantity', () => {
            const validData = {
                itemId: 'item-123',
                quantity: '1',
            };

            const result = cartItemUpdateSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.quantity).toBe(1);
            }
        });

        it('should accept large quantity values', () => {
            const validData = {
                itemId: 'item-123',
                quantity: '999',
            };

            const result = cartItemUpdateSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.quantity).toBe(999);
            }
        });
    });

    describe('productId validation', () => {
        it('should accept undefined productId', () => {
            const validData = {
                itemId: 'item-123',
                quantity: '2',
            };

            const result = cartItemUpdateSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.productId).toBeUndefined();
            }
        });

        it('should accept empty string productId (trimmed to empty)', () => {
            const validData = {
                itemId: 'item-123',
                productId: '',
                quantity: '2',
            };

            const result = cartItemUpdateSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                // Empty string is valid for optional productId
                expect(result.data.productId).toBe('');
            }
        });

        it('should trim whitespace from productId', () => {
            const validData = {
                itemId: 'item-123',
                productId: '  product-456  ',
                quantity: '2',
            };

            const result = cartItemUpdateSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.productId).toBe('product-456');
            }
        });
    });
});

describe('pickupStoreUpdateSchema', () => {
    describe('valid data', () => {
        it('should validate when all required fields are provided', () => {
            const validData = {
                storeId: 'store-123',
                inventoryId: 'inventory-456',
            };

            const result = pickupStoreUpdateSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.storeId).toBe('store-123');
                expect(result.data.inventoryId).toBe('inventory-456');
                expect(result.data.storeName).toBeUndefined();
            }
        });

        it('should validate with optional storeName', () => {
            const validData = {
                storeId: 'store-123',
                inventoryId: 'inventory-456',
                storeName: 'My Store',
            };

            const result = pickupStoreUpdateSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.storeId).toBe('store-123');
                expect(result.data.inventoryId).toBe('inventory-456');
                expect(result.data.storeName).toBe('My Store');
            }
        });

        it('should trim whitespace from all fields', () => {
            const validData = {
                storeId: '  store-123  ',
                inventoryId: '  inventory-456  ',
                storeName: '  My Store  ',
            };

            const result = pickupStoreUpdateSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.storeId).toBe('store-123');
                expect(result.data.inventoryId).toBe('inventory-456');
                expect(result.data.storeName).toBe('My Store');
            }
        });
    });

    describe('storeId validation', () => {
        it('should reject when storeId is missing', () => {
            const invalidData = {
                inventoryId: 'inventory-456',
            };

            const result = pickupStoreUpdateSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('storeId'))).toBe(true);
            }
        });

        it('should reject when storeId is empty string', () => {
            const invalidData = {
                storeId: '',
                inventoryId: 'inventory-456',
            };

            const result = pickupStoreUpdateSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('storeId'))).toBe(true);
            }
        });

        it('should accept whitespace-only storeId (min(1) checks before trim)', () => {
            const validData = {
                storeId: '   ',
                inventoryId: 'inventory-456',
            };

            const result = pickupStoreUpdateSchema.safeParse(validData);
            // Note: z.string().min(1).trim() validates min(1) before trimming
            // So whitespace-only strings pass validation, then get trimmed to empty
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.storeId).toBe('');
            }
        });
    });

    describe('inventoryId validation', () => {
        it('should reject when inventoryId is missing', () => {
            const invalidData = {
                storeId: 'store-123',
            };

            const result = pickupStoreUpdateSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('inventoryId'))).toBe(true);
            }
        });

        it('should reject when inventoryId is empty string', () => {
            const invalidData = {
                storeId: 'store-123',
                inventoryId: '',
            };

            const result = pickupStoreUpdateSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('inventoryId'))).toBe(true);
            }
        });

        it('should accept whitespace-only inventoryId (min(1) checks before trim)', () => {
            const validData = {
                storeId: 'store-123',
                inventoryId: '   ',
            };

            const result = pickupStoreUpdateSchema.safeParse(validData);
            // Note: z.string().min(1).trim() validates min(1) before trimming
            // So whitespace-only strings pass validation, then get trimmed to empty
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.inventoryId).toBe('');
            }
        });
    });

    describe('storeName validation', () => {
        it('should accept undefined storeName', () => {
            const validData = {
                storeId: 'store-123',
                inventoryId: 'inventory-456',
            };

            const result = pickupStoreUpdateSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.storeName).toBeUndefined();
            }
        });

        it('should accept empty string storeName (trimmed to empty)', () => {
            const validData = {
                storeId: 'store-123',
                inventoryId: 'inventory-456',
                storeName: '',
            };

            const result = pickupStoreUpdateSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                // Empty string is valid for optional storeName
                expect(result.data.storeName).toBe('');
            }
        });

        it('should trim whitespace from storeName', () => {
            const validData = {
                storeId: 'store-123',
                inventoryId: 'inventory-456',
                storeName: '  My Store  ',
            };

            const result = pickupStoreUpdateSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.storeName).toBe('My Store');
            }
        });
    });
});

describe('parsePickupStoreUpdateFromFormData', () => {
    it('should parse FormData with all fields', () => {
        const formData = new FormData();
        formData.set('storeId', 'store-123');
        formData.set('inventoryId', 'inventory-456');
        formData.set('storeName', 'My Store');

        const result = parsePickupStoreUpdateFromFormData(formData);
        expect(result.storeId).toBe('store-123');
        expect(result.inventoryId).toBe('inventory-456');
        expect(result.storeName).toBe('My Store');
    });

    it('should parse FormData without optional storeName', () => {
        const formData = new FormData();
        formData.set('storeId', 'store-123');
        formData.set('inventoryId', 'inventory-456');

        const result = parsePickupStoreUpdateFromFormData(formData);
        expect(result.storeId).toBe('store-123');
        expect(result.inventoryId).toBe('inventory-456');
        expect(result.storeName).toBeUndefined();
    });

    it('should handle missing fields with empty strings', () => {
        const formData = new FormData();

        const result = parsePickupStoreUpdateFromFormData(formData);
        expect(result.storeId).toBe('');
        expect(result.inventoryId).toBe('');
        expect(result.storeName).toBeUndefined();
    });

    it('should handle empty string values', () => {
        const formData = new FormData();
        formData.set('storeId', '');
        formData.set('inventoryId', '');
        formData.set('storeName', '');

        const result = parsePickupStoreUpdateFromFormData(formData);
        expect(result.storeId).toBe('');
        expect(result.inventoryId).toBe('');
        // Empty string storeName becomes undefined due to || undefined (empty strings are falsy)
        expect(result.storeName).toBeUndefined();
    });

    it('should handle whitespace in values', () => {
        const formData = new FormData();
        formData.set('storeId', '  store-123  ');
        formData.set('inventoryId', '  inventory-456  ');
        formData.set('storeName', '  My Store  ');

        const result = parsePickupStoreUpdateFromFormData(formData);
        expect(result.storeId).toBe('  store-123  ');
        expect(result.inventoryId).toBe('  inventory-456  ');
        expect(result.storeName).toBe('  My Store  ');
    });
});
