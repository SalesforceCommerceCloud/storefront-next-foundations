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
import { actionRegistry, type ActionResponse } from './action-registry';
import { resourceRoutes } from '@/route-paths';

vi.mock('@salesforce/storefront-next-runtime/i18n', () => ({
    getTranslation: () => ({ t: (key: string) => key }),
}));

describe('actionRegistry', () => {
    describe('addToWishlist', () => {
        const handler = actionRegistry.addToWishlist;

        test('has the correct action route', () => {
            expect(handler.actionRoute).toBe(resourceRoutes.wishlistAdd);
        });

        describe('buildFormData', () => {
            test('appends productId to FormData', () => {
                const formData = handler.buildFormData({ productId: 'prod-456' });
                expect(formData.get('productId')).toBe('prod-456');
            });

            test('returns empty FormData when productId is missing', () => {
                const formData = handler.buildFormData({});
                expect(formData.get('productId')).toBeNull();
            });
        });

        describe('handleSuccess', () => {
            test('shows info toast with product name when already in wishlist', () => {
                const addToast = vi.fn();
                const result: ActionResponse = { success: true, alreadyInWishlist: true };
                handler.handleSuccess(result, { productName: 'Blue Shoes' }, addToast);
                expect(addToast).toHaveBeenCalledWith('product:alreadyInWishlist', 'info');
            });

            test('shows generic info toast without product name when already in wishlist', () => {
                const addToast = vi.fn();
                const result: ActionResponse = { success: true, alreadyInWishlist: true };
                handler.handleSuccess(result, {}, addToast);
                expect(addToast).toHaveBeenCalledWith('product:itemAlreadyInWishlist', 'info');
            });

            test('shows success toast with product name when newly added', () => {
                const addToast = vi.fn();
                const result: ActionResponse = { success: true };
                handler.handleSuccess(result, { productName: 'Blue Shoes' }, addToast);
                expect(addToast).toHaveBeenCalledWith('product:addedToWishlist', 'success');
            });

            test('shows generic success toast without product name when newly added', () => {
                const addToast = vi.fn();
                const result: ActionResponse = { success: true };
                handler.handleSuccess(result, {}, addToast);
                expect(addToast).toHaveBeenCalledWith('product:addedToWishlistGeneric', 'success');
            });
        });

        describe('handleError', () => {
            test('shows error toast with the error message', () => {
                const addToast = vi.fn();
                const result: ActionResponse = {
                    success: false,
                    error: { code: 'OPERATION_FAILED', message: 'Network error' },
                };
                handler.handleError(result, {}, addToast);
                expect(addToast).toHaveBeenCalledWith('Network error', 'error');
            });

            test('shows fallback error toast when no error message', () => {
                const addToast = vi.fn();
                const result: ActionResponse = { success: false };
                handler.handleError(result, {}, addToast);
                expect(addToast).toHaveBeenCalledWith('product:failedToAddToWishlist', 'error');
            });
        });
    });
});
