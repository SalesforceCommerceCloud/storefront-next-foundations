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
import { z } from 'zod';

/**
 * Schema for cart item update (variant and/or quantity) form data
 * Used when updating an existing cart item - supports both quantity changes and variant changes
 */
export const cartItemUpdateSchema = z.object({
    itemId: z.string().min(1, 'Item ID is required').trim(),
    productId: z.string().trim().optional(), // Optional - only needed when changing variant
    quantity: z
        .string()
        .min(1, 'Quantity is required')
        .transform((val) => {
            const parsed = Number(val);
            if (isNaN(parsed)) {
                throw new Error('Quantity must be a valid number');
            }
            return parsed;
        })
        .pipe(z.number().min(1, 'Quantity must be at least 1')),
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    deliveryOption: z.enum(['delivery', 'pickup']).optional(),
    storeId: z.string().optional(),
    inventoryId: z.string().optional(),
    // @sfdc-extension-block-end SFDC_EXT_BOPIS
});

/**
 * Schema for bonus product add form data
 * Used when adding bonus products to cart - supports multiple slots and items
 */
export const bonusProductAddSchema = z.object({
    bonusItems: z
        .string()
        .min(1, 'bonusItems is required')
        .transform((val) => {
            try {
                return JSON.parse(val);
            } catch {
                throw new Error('Invalid bonusItems JSON');
            }
        })
        .pipe(
            z
                .array(
                    z.object({
                        productId: z.string().min(1, 'Each bonus item must have a productId'),
                        quantity: z.number().min(1, 'Each bonus item must have a valid quantity'),
                        bonusDiscountLineItemId: z
                            .string()
                            .min(1, 'Each bonus item must have a bonusDiscountLineItemId'),
                        promotionId: z.string().min(1, 'Each bonus item must have a promotionId'),
                    })
                )
                .min(1, 'bonusItems must be a non-empty array')
        ),
});

/**
 * Schema for pickup store update form data
 * Used when changing the pickup store for all pickup items in the basket
 */
export const pickupStoreUpdateSchema = z.object({
    storeId: z.string().min(1, 'Store ID is required').trim(),
    inventoryId: z.string().min(1, 'Inventory ID is required').trim(),
    storeName: z.string().trim().optional(),
});

/**
 * Parses FormData into pickup store update data object
 * @param formData - FormData from pickup store update form submission
 * @returns Parsed pickup store update data
 */
export const parsePickupStoreUpdateFromFormData = (formData: FormData) => {
    return {
        storeId: formData.get('storeId')?.toString() || '',
        inventoryId: formData.get('inventoryId')?.toString() || '',
        storeName: formData.get('storeName')?.toString() || undefined,
    };
};

// Type exports
export type CartItemUpdateData = z.infer<typeof cartItemUpdateSchema>;
