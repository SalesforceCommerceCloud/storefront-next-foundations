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

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ActionFunctionArgs } from 'react-router';
import { action } from './action.wishlist-remove';
import { createTestContext, expectStatus } from '@/lib/test-utils';
import { createFormDataRequest } from '@/test-utils/request-helpers';
import { resourceRoutes } from '@/route-paths';

// Mock dependencies
const mockGetAuth = vi.fn();
const mockCreateApiClients = vi.fn();
const mockExtractResponseError = vi.fn();

vi.mock('@/middlewares/auth.server', () => ({
    getAuth: () => mockGetAuth(),
}));

vi.mock('@/lib/api-clients.server', () => ({
    createApiClients: () => mockCreateApiClients(),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        child: vi.fn().mockReturnThis(),
    })),
}));

vi.mock('@salesforce/storefront-next-runtime/config', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
        getConfig: vi.fn(() => ({
            commerce: {
                api: {
                    organizationId: 'test-org-id',
                    siteId: 'test-site-id',
                },
            },
        })),
    };
});

vi.mock('@/lib/utils', async () => {
    const actual = await vi.importActual('@/lib/utils');
    return {
        ...actual,
        extractResponseError: (...args: unknown[]) => mockExtractResponseError(...args),
    };
});

/** Extract the payload from a `data()`-wrapped response (or a plain Response). */
async function extractResponseData(response: any): Promise<any> {
    if (!response) return response;
    if (response instanceof Response) return await response.json();
    // `data()` returns DataWithResponseInit: { type: 'DataWithResponseInit', data: T, init?: ResponseInit }
    if (typeof response === 'object' && 'data' in response) return response.data;
    return response;
}

describe('action.wishlist-remove', () => {
    const mockContext = createTestContext();
    let mockShopperCustomers: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        mockGetAuth.mockReturnValue({
            customerId: 'customer-123',
            userType: 'registered',
            access_token: 'token-123',
        } as any);

        mockExtractResponseError.mockResolvedValue({
            responseMessage: 'Default error message',
            status_code: '500',
        });

        mockShopperCustomers = {
            getCustomerProductLists: vi.fn(),
            getCustomerProductList: vi.fn(),
            deleteCustomerProductListItem: vi.fn(),
        };

        mockCreateApiClients.mockReturnValue({
            shopperCustomers: mockShopperCustomers,
        } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('action', () => {
        /** Helper to create a POST request for testing. Uses the shared helper for Node 24 compatibility. */
        const createRequest = (productId?: string, itemId?: string): Request => {
            const data: Record<string, string> = {};
            if (productId) {
                data.productId = productId;
            }
            if (itemId) {
                data.itemId = itemId;
            }
            return createFormDataRequest(`http://localhost${resourceRoutes.wishlistRemove}`, 'POST', data);
        };

        test('should return error for non-POST requests', async () => {
            const request = new Request(`http://localhost${resourceRoutes.wishlistRemove}`, {
                method: 'GET',
            });
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-remove',
            };

            const result = await action(args);
            expect(result.data.success).toBe(false);
            expect(result.data.error).toBeDefined();
            expect(result.data.error?.code).toBe('METHOD_NOT_ALLOWED');
            expectStatus(result, 405);
        });

        test('should return error when both itemId and productId are missing', async () => {
            const request = createRequest();
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-remove',
            };

            // When both itemId and productId are missing, Error is thrown and caught
            // extractResponseError might fail, so the catch block falls back to error.message
            mockExtractResponseError.mockRejectedValueOnce(new Error('Response body already read'));

            const response = await action(args);
            expect(response).toBeDefined();

            // data() returns DataWithResponseInit which has structure: { type: 'DataWithResponseInit', data: {...}, init: {...} }
            // Extract the data from the response
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else if (response && typeof response === 'object' && 'data' in response) {
                json = (response as any).data;
            } else {
                json = await extractResponseData(response);
            }

            expect(json).toBeDefined();
            expect(typeof json).toBe('object');
            expect(json).toHaveProperty('success');
            expect(json.success).toBe(false);
            expect(json).toHaveProperty('error');
        });

        test('should return error when session has no customerId', async () => {
            // The auth-gate-by-userType was removed when guest support was added.
            // The remaining session check rejects requests with no customerId at all.
            mockGetAuth.mockReturnValue({
                customerId: null,
                userType: 'guest',
            } as any);
            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-remove',
            };

            const response = await action(args);
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else if (response && typeof response === 'object' && 'data' in response) {
                json = (response as any).data;
            } else {
                json = await extractResponseData(response);
            }
            expect(json.success).toBe(false);
            expect(json.error).toBeDefined();
        });

        test('should remove from wishlist as a guest user (gcid customerId)', async () => {
            mockGetAuth.mockReturnValue({
                customerId: 'guest-gcid-456',
                userType: 'guest',
            } as any);

            const guestWishlist = {
                id: 'guest-wl-1',
                listId: 'guest-wl-1',
                type: 'wish_list',
                items: [{ id: 'item-1', productId: 'product-123' }],
                customerProductListItems: [{ id: 'item-1', productId: 'product-123' }],
            };

            mockShopperCustomers.getCustomerProductLists.mockResolvedValue({
                data: { data: [guestWishlist] },
            });
            mockShopperCustomers.getCustomerProductList.mockResolvedValue({
                data: { ...guestWishlist, items: [], customerProductListItems: [] },
            });
            mockShopperCustomers.deleteCustomerProductListItem.mockResolvedValue({});

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-remove',
            };

            const response = await action(args);
            const json = response instanceof Response ? await response.json() : (response as any).data;
            expect(json.success).toBe(true);
            expect(mockShopperCustomers.deleteCustomerProductListItem).toHaveBeenCalledWith(
                expect.objectContaining({
                    params: { path: { customerId: 'guest-gcid-456', listId: 'guest-wl-1', itemId: 'item-1' } },
                })
            );
        });

        test('should successfully remove product from wishlist using productId', async () => {
            const wishlist = {
                id: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
                customerProductListItems: [{ id: 'item-123', productId: 'product-123' }],
            };

            const wishlistAfterRemoval = {
                ...wishlist,
                customerProductListItems: [],
            };

            mockShopperCustomers.getCustomerProductLists.mockResolvedValue({
                data: {
                    data: [
                        {
                            id: 'wishlist-123',
                            type: 'wish_list',
                            customerProductListItems: [{ id: 'item-123', productId: 'product-123' }],
                        },
                    ],
                },
            });

            // Mock getCustomerProductList to return updated list after removal
            mockShopperCustomers.getCustomerProductList.mockResolvedValue({ data: wishlistAfterRemoval } as any);

            mockShopperCustomers.deleteCustomerProductListItem.mockResolvedValue({
                data: {},
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-remove',
            };

            const response = await action(args);
            // Response.json() returns a Response, so we extract JSON from it
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else {
                json = await extractResponseData(response);
            }
            expect(json.success).toBe(true);
            expect(mockShopperCustomers.deleteCustomerProductListItem).toHaveBeenCalledWith({
                params: {
                    path: expect.objectContaining({
                        customerId: 'customer-123',
                        listId: 'wishlist-123',
                        itemId: 'item-123',
                    }),
                },
            });
        });

        test('should successfully remove product from wishlist using itemId (optimized path)', async () => {
            const wishlistAfterRemoval = {
                id: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
                customerProductListItems: [],
            };

            mockShopperCustomers.getCustomerProductLists.mockResolvedValue({
                data: {
                    data: [
                        {
                            id: 'wishlist-123',
                            type: 'wish_list',
                            customerProductListItems: [{ id: 'item-123', productId: 'product-123' }],
                        },
                    ],
                },
            });

            // Mock getCustomerProductList to return updated list after removal
            mockShopperCustomers.getCustomerProductList.mockResolvedValue({ data: wishlistAfterRemoval } as any);

            mockShopperCustomers.deleteCustomerProductListItem.mockResolvedValue({
                data: {},
            });

            // Pass both itemId and productId (itemId is preferred)
            const request = createRequest('product-123', 'item-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-remove',
            };

            const response = await action(args);
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else {
                json = await extractResponseData(response);
            }
            expect(json.success).toBe(true);

            // Verify deleteCustomerProductListItem was called with the itemId
            expect(mockShopperCustomers.deleteCustomerProductListItem).toHaveBeenCalledWith({
                params: {
                    path: expect.objectContaining({
                        customerId: 'customer-123',
                        listId: 'wishlist-123',
                        itemId: 'item-123',
                    }),
                },
            });

            // Verify getCustomerProductList was called ONCE (after removal to get updated list)
            // getWishlist() no longer calls it - it uses items from getCustomerProductLists
            expect(mockShopperCustomers.getCustomerProductList).toHaveBeenCalledTimes(1);
        });

        test('should use itemId when both itemId and productId are provided', async () => {
            const wishlistAfterRemoval = {
                id: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
                customerProductListItems: [],
            };

            mockShopperCustomers.getCustomerProductLists.mockResolvedValue({
                data: {
                    data: [
                        {
                            id: 'wishlist-123',
                            type: 'wish_list',
                            customerProductListItems: [{ id: 'item-123', productId: 'product-456' }],
                        },
                    ],
                },
            });

            // Mock getCustomerProductList to return updated list after removal
            mockShopperCustomers.getCustomerProductList.mockResolvedValue({ data: wishlistAfterRemoval } as any);

            mockShopperCustomers.deleteCustomerProductListItem.mockResolvedValue({
                data: {},
            });

            // Pass both itemId and productId - itemId should be preferred
            const request = createRequest('product-456', 'item-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-remove',
            };

            const response = await action(args);
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else {
                json = await extractResponseData(response);
            }
            expect(json.success).toBe(true);

            // Verify the correct itemId was used (not looked up from productId)
            expect(mockShopperCustomers.deleteCustomerProductListItem).toHaveBeenCalledWith({
                params: {
                    path: expect.objectContaining({
                        itemId: 'item-123',
                    }),
                },
            });

            // Verify getCustomerProductList was called ONCE (after removal to get updated list)
            // getWishlist() no longer calls it - it uses items from getCustomerProductLists
            expect(mockShopperCustomers.getCustomerProductList).toHaveBeenCalledTimes(1);
        });

        test('should return error when wishlist is not found', async () => {
            mockShopperCustomers.getCustomerProductLists.mockResolvedValue({
                data: { data: [] },
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-remove',
            };

            const response = await action(args);
            const result = await extractResponseData(response);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('should return error when item is not found in wishlist', async () => {
            const wishlist = {
                id: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
                customerProductListItems: [{ id: 'item-456', productId: 'product-456' }],
            };

            mockShopperCustomers.getCustomerProductLists.mockResolvedValue({
                data: { data: [{ id: 'wishlist-123', type: 'wish_list' }] },
            });

            // Note: Commerce SDK getCustomerProductList returns the data directly (unwrapped)
            mockShopperCustomers.getCustomerProductList.mockResolvedValue({ data: wishlist } as any);

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-remove',
            };

            const response = await action(args);
            const result = await extractResponseData(response);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('should handle API errors gracefully', async () => {
            mockShopperCustomers.getCustomerProductLists.mockRejectedValue(new Error('API Error'));

            mockExtractResponseError.mockResolvedValue({
                responseMessage: 'Failed to remove from wishlist',
                status_code: '500',
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-remove',
            };

            const response = await action(args);
            // data() returns DataWithResponseInit with data property
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else if (response && typeof response === 'object' && 'data' in response) {
                json = (response as any).data;
            } else {
                json = await extractResponseData(response);
            }
            expect(json).toBeDefined();
            expect(json.success).toBe(false);
            expect(json.error).toBeDefined();
        });

        test('should handle 403 authentication errors in catch block', async () => {
            mockShopperCustomers.getCustomerProductLists.mockRejectedValue(new Error('Forbidden'));

            mockExtractResponseError.mockResolvedValue({
                responseMessage: 'Forbidden',
                status_code: '403',
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-remove',
            };

            const response = await action(args);
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else if (response && typeof response === 'object' && 'data' in response) {
                json = (response as any).data;
            } else {
                json = await extractResponseData(response);
            }
            expect(json.success).toBe(false);
            // Error is now a structured ActionError object
            expect(json.error).toBeDefined();
            expect(json.error.code).toBeDefined();
            expect(json.error.message).toBeDefined();
        });
    });
});
