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
import type { ShopperBasketsV2 } from '@/scapi';
import { assertAllProductItemsPickup } from './product-utils';

type ProductItem = Pick<ShopperBasketsV2.schemas['ProductItem'], 'productId' | 'quantity' | 'inventoryId'> & {
    storeId?: string | null;
};

describe('product-utils', () => {
    describe('assertAllProductItemsPickup', () => {
        test('should not throw when all items have both storeId and inventoryId', () => {
            const productItems: Array<ProductItem> = [
                {
                    productId: 'product-1',
                    quantity: 1,
                    inventoryId: 'inventory-1',
                    storeId: 'store-1',
                },
                {
                    productId: 'product-2',
                    quantity: 2,
                    inventoryId: 'inventory-2',
                    storeId: 'store-1',
                },
            ];

            expect(() => assertAllProductItemsPickup(productItems)).not.toThrow();
        });

        test('should throw when some items are missing storeId', () => {
            const productItems: Array<ProductItem> = [
                {
                    productId: 'product-1',
                    quantity: 1,
                    inventoryId: 'inventory-1',
                    storeId: 'store-1',
                },
                {
                    productId: 'product-2',
                    quantity: 2,
                    inventoryId: 'inventory-2',
                    storeId: undefined,
                },
            ];

            expect(() => assertAllProductItemsPickup(productItems)).toThrow(
                'Cannot mix pickup and delivery items in the same set.'
            );
        });

        test('should throw when some items are missing inventoryId', () => {
            const productItems: Array<ProductItem> = [
                {
                    productId: 'product-1',
                    quantity: 1,
                    inventoryId: 'inventory-1',
                    storeId: 'store-1',
                },
                {
                    productId: 'product-2',
                    quantity: 2,
                    inventoryId: undefined,
                    storeId: 'store-1',
                },
            ];

            expect(() => assertAllProductItemsPickup(productItems)).toThrow(
                'Cannot mix pickup and delivery items in the same set.'
            );
        });

        test('should throw when some items are missing both storeId and inventoryId', () => {
            const productItems: Array<ProductItem> = [
                {
                    productId: 'product-1',
                    quantity: 1,
                    inventoryId: 'inventory-1',
                    storeId: 'store-1',
                },
                {
                    productId: 'product-2',
                    quantity: 2,
                    inventoryId: undefined,
                    storeId: undefined,
                },
            ];

            expect(() => assertAllProductItemsPickup(productItems)).toThrow(
                'Cannot mix pickup and delivery items in the same set.'
            );
        });

        test('should throw when storeId is null', () => {
            const productItems: Array<ProductItem> = [
                {
                    productId: 'product-1',
                    quantity: 1,
                    inventoryId: 'inventory-1',
                    storeId: 'store-1',
                },
                {
                    productId: 'product-2',
                    quantity: 2,
                    inventoryId: 'inventory-2',
                    storeId: null,
                },
            ];

            expect(() => assertAllProductItemsPickup(productItems)).toThrow(
                'Cannot mix pickup and delivery items in the same set.'
            );
        });

        test('should throw when inventoryId is null', () => {
            const productItems: Array<ProductItem> = [
                {
                    productId: 'product-1',
                    quantity: 1,
                    inventoryId: 'inventory-1',
                    storeId: 'store-1',
                },
                {
                    productId: 'product-2',
                    quantity: 2,
                    inventoryId: null as any,
                    storeId: 'store-1',
                },
            ];

            expect(() => assertAllProductItemsPickup(productItems)).toThrow(
                'Cannot mix pickup and delivery items in the same set.'
            );
        });

        test('should throw when all items are missing storeId', () => {
            const productItems: Array<ProductItem> = [
                {
                    productId: 'product-1',
                    quantity: 1,
                    inventoryId: 'inventory-1',
                    storeId: undefined,
                },
                {
                    productId: 'product-2',
                    quantity: 2,
                    inventoryId: 'inventory-2',
                    storeId: undefined,
                },
            ];

            expect(() => assertAllProductItemsPickup(productItems)).toThrow(
                'Cannot mix pickup and delivery items in the same set.'
            );
        });

        test('should throw when all items are missing inventoryId', () => {
            const productItems: Array<ProductItem> = [
                {
                    productId: 'product-1',
                    quantity: 1,
                    inventoryId: undefined,
                    storeId: 'store-1',
                },
                {
                    productId: 'product-2',
                    quantity: 2,
                    inventoryId: undefined,
                    storeId: 'store-1',
                },
            ];

            expect(() => assertAllProductItemsPickup(productItems)).toThrow(
                'Cannot mix pickup and delivery items in the same set.'
            );
        });

        test('should not throw when array is empty', () => {
            const productItems: Array<ProductItem> = [];

            expect(() => assertAllProductItemsPickup(productItems)).not.toThrow();
        });

        test('should not throw when single item has both storeId and inventoryId', () => {
            const productItems: Array<ProductItem> = [
                {
                    productId: 'product-1',
                    quantity: 1,
                    inventoryId: 'inventory-1',
                    storeId: 'store-1',
                },
            ];

            expect(() => assertAllProductItemsPickup(productItems)).not.toThrow();
        });

        test('should throw when single item is missing storeId', () => {
            const productItems: Array<ProductItem> = [
                {
                    productId: 'product-1',
                    quantity: 1,
                    inventoryId: 'inventory-1',
                    storeId: undefined,
                },
            ];

            expect(() => assertAllProductItemsPickup(productItems)).toThrow(
                'Cannot mix pickup and delivery items in the same set.'
            );
        });

        test('should throw when single item is missing inventoryId', () => {
            const productItems: Array<ProductItem> = [
                {
                    productId: 'product-1',
                    quantity: 1,
                    inventoryId: undefined,
                    storeId: 'store-1',
                },
            ];

            expect(() => assertAllProductItemsPickup(productItems)).toThrow(
                'Cannot mix pickup and delivery items in the same set.'
            );
        });

        test('should throw error with message when validation fails', () => {
            const productItems: Array<ProductItem> = [
                {
                    productId: 'product-1',
                    quantity: 1,
                    inventoryId: 'inventory-1',
                    storeId: 'store-1',
                },
                {
                    productId: 'product-2',
                    quantity: 2,
                    inventoryId: undefined,
                    storeId: 'store-1',
                },
            ];

            expect(() => assertAllProductItemsPickup(productItems)).toThrow();
        });

        test('should handle items with empty string storeId as missing', () => {
            const productItems: Array<ProductItem> = [
                {
                    productId: 'product-1',
                    quantity: 1,
                    inventoryId: 'inventory-1',
                    storeId: 'store-1',
                },
                {
                    productId: 'product-2',
                    quantity: 2,
                    inventoryId: 'inventory-2',
                    storeId: '',
                },
            ];

            expect(() => assertAllProductItemsPickup(productItems)).toThrow(
                'Cannot mix pickup and delivery items in the same set.'
            );
        });

        test('should handle items with empty string inventoryId as missing', () => {
            const productItems: Array<ProductItem> = [
                {
                    productId: 'product-1',
                    quantity: 1,
                    inventoryId: 'inventory-1',
                    storeId: 'store-1',
                },
                {
                    productId: 'product-2',
                    quantity: 2,
                    inventoryId: '',
                    storeId: 'store-1',
                },
            ];

            expect(() => assertAllProductItemsPickup(productItems)).toThrow(
                'Cannot mix pickup and delivery items in the same set.'
            );
        });
    });
});
