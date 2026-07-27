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
import { action } from './action.wishlist-add';
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

describe('action.wishlist-add', () => {
    const mockContext = createTestContext();
    let mockShopperCustomers: any;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();

        // Setup default mocks
        mockGetAuth.mockReturnValue({
            customerId: 'customer-123',
            userType: 'registered',
            access_token: 'token-123',
        } as any);

        // Default: extractResponseError succeeds
        // Individual tests can override this
        mockExtractResponseError.mockResolvedValue({
            responseMessage: 'Default error message',
            status_code: '500',
        });

        mockShopperCustomers = {
            getCustomerProductLists: vi.fn(),
            createCustomerProductList: vi.fn(),
            getCustomerProductList: vi.fn(),
            createCustomerProductListItem: vi.fn(),
        };

        // Ensure createApiClients returns the mocked client
        mockCreateApiClients.mockReturnValue({
            shopperCustomers: mockShopperCustomers,
        } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    describe('action', () => {
        /** Helper to create a POST request for testing. Uses the shared helper for Node 24 compatibility. */
        const createRequest = (productId?: string): Request => {
            const data: Record<string, string> = {};
            if (productId) {
                data.productId = productId;
            }
            return createFormDataRequest(`http://localhost${resourceRoutes.wishlistAdd}`, 'POST', data);
        };

        test('should return error for non-POST requests', async () => {
            const request = new Request(`http://localhost${resourceRoutes.wishlistAdd}`, {
                method: 'GET',
            });
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-add',
            };

            const result = await action(args);
            expect(result.data.success).toBe(false);
            expect(result.data.error).toBeDefined();
            expect(result.data.error?.code).toBe('METHOD_NOT_ALLOWED');
            expectStatus(result, 405);
        });

        test('should return error when productId is missing', async () => {
            const request = createRequest();
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-add',
            };

            // When productId is missing, Error is thrown and caught
            // extractResponseError might throw, so catch block uses error.message
            mockExtractResponseError.mockRejectedValueOnce(new Error('Response body already read'));

            const response = await action(args);
            expect(response).toBeDefined();

            // data() returns a DataWithResponseInit which has structure: { type: 'DataWithResponseInit', data: {...}, init: {...} }
            // Extract the data from the response
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else if (response && typeof response === 'object' && 'data' in response) {
                // DataWithResponseInit has data property
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
            // The remaining session check rejects requests with no customerId at all
            // (e.g. a torn-down session) — both guest (gcid) and registered (rcid)
            // tokens supply customerId on a valid session.
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
                pattern: 'action/wishlist-add',
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

        test('should add to wishlist as a guest user (gcid customerId)', async () => {
            // Guest sessions have userType='guest' and customerId=gcid.
            // The action route accepts these the same as registered sessions —
            // SCAPI's product-list endpoints accept guest tokens.
            mockGetAuth.mockReturnValue({
                customerId: 'guest-gcid-456',
                userType: 'guest',
            } as any);

            const guestWishlist = {
                id: 'guest-wl-1',
                listId: 'guest-wl-1',
                type: 'wish_list',
                items: [],
            };

            mockShopperCustomers.getCustomerProductLists.mockResolvedValue({
                data: { data: [guestWishlist] },
            });
            mockShopperCustomers.getCustomerProductList.mockResolvedValue({
                data: { ...guestWishlist, items: [{ id: 'item-1', productId: 'product-123' }] },
            });
            mockShopperCustomers.createCustomerProductListItem.mockResolvedValue({});

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-add',
            };

            const response = await action(args);
            const json = response instanceof Response ? await response.json() : (response as any).data;
            expect(json.success).toBe(true);
            expect(mockShopperCustomers.createCustomerProductListItem).toHaveBeenCalledWith(
                expect.objectContaining({
                    params: { path: { customerId: 'guest-gcid-456', listId: 'guest-wl-1' } },
                })
            );
        });

        test('should successfully add product to existing wishlist', async () => {
            const existingWishlist = {
                id: 'wishlist-123',
                listId: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
                items: [],
            };

            const wishlistWithItem = {
                ...existingWishlist,
                items: [{ id: 'item-123', productId: 'product-123' }],
            };

            mockShopperCustomers.getCustomerProductLists.mockResolvedValue({
                data: { data: [existingWishlist] },
            });

            // Mock getCustomerProductList calls:
            // 1. First call: get existing wishlist (before adding item) - line 269
            // 2. Second call: get updated wishlist (after adding item, to check for duplicates) - line 307
            mockShopperCustomers.getCustomerProductList
                .mockResolvedValueOnce({
                    data: existingWishlist,
                })
                .mockResolvedValueOnce({
                    data: wishlistWithItem,
                });

            mockShopperCustomers.createCustomerProductListItem.mockResolvedValue({
                data: { id: 'item-123', productId: 'product-123' },
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-add',
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
            expect(json.success).toBe(true);
            expect(mockShopperCustomers.createCustomerProductListItem).toHaveBeenCalledWith({
                params: {
                    path: expect.objectContaining({
                        customerId: 'customer-123',
                        listId: 'wishlist-123',
                    }),
                },
                body: expect.objectContaining({
                    productId: 'product-123',
                    public: false,
                    priority: 1,
                }),
            });
        });

        test('should handle fallback to first list when wishlist creation fails', async () => {
            const firstList = {
                id: 'list-456',
                listId: 'list-456',
                type: 'custom_list',
                name: 'Other List',
                customerProductListItems: [], // Include items field for getWishlist
            };

            // First call: try to get wishlist (finds none)
            // createCustomerProductList throws error
            // Second call in catch: get all lists and use first one (using getWishlist)
            mockShopperCustomers.getCustomerProductLists.mockResolvedValueOnce({
                data: { data: [] }, // No wishlist found
            });

            mockShopperCustomers.createCustomerProductList.mockRejectedValue(new Error('Failed to create wishlist'));

            mockShopperCustomers.getCustomerProductLists.mockResolvedValueOnce({
                data: { data: [firstList] }, // Fallback: return first available list
            });

            // Mock getCustomerProductList for the post-add fetch
            mockShopperCustomers.getCustomerProductList.mockResolvedValue({
                data: firstList, // firstList already has customerProductListItems
            });

            mockShopperCustomers.createCustomerProductListItem.mockResolvedValue({
                data: { id: 'item-123', productId: 'product-123' },
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-add',
            };

            // No timer advancement needed for fallback path - creation fails immediately
            const response = await action(args);
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else if (response && typeof response === 'object' && 'data' in response) {
                json = (response as any).data;
            } else {
                json = await extractResponseData(response);
            }
            expect(json.success).toBe(true);
        });

        test('should create wishlist if it does not exist', async () => {
            const newWishlist = {
                id: 'wishlist-123',
                listId: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
            };

            const wishlistWithItem = {
                ...newWishlist,
                items: [{ id: 'item-123', productId: 'product-123' }],
            };

            // First call: getCustomerProductLists - no wishlist exists
            // Second call: after createCustomerProductList, getCustomerProductLists to find created wishlist
            // Third call: getCustomerProductList - get wishlist before adding item
            // Fourth call: getCustomerProductList - get updated wishlist after adding item
            mockShopperCustomers.getCustomerProductLists
                .mockResolvedValueOnce({
                    data: { data: [] },
                })
                .mockResolvedValueOnce({
                    data: { data: [newWishlist] },
                });

            mockShopperCustomers.createCustomerProductList.mockResolvedValue({
                data: newWishlist,
            });

            mockShopperCustomers.getCustomerProductList
                .mockResolvedValueOnce({
                    data: newWishlist,
                })
                .mockResolvedValueOnce({
                    data: wishlistWithItem,
                });

            mockShopperCustomers.createCustomerProductListItem.mockResolvedValue({
                data: { id: 'item-123', productId: 'product-123' },
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-add',
            };

            // Start the async operation
            const responsePromise = action(args);

            // Fast-forward the 1.5 second delay
            await vi.advanceTimersByTimeAsync(1500);

            // Wait for the response
            const response = await responsePromise;
            const json = await extractResponseData(response);
            expect(json.success).toBe(true);
            expect(mockShopperCustomers.createCustomerProductList).toHaveBeenCalled();
            expect(mockShopperCustomers.createCustomerProductListItem).toHaveBeenCalled();
        });

        test('should successfully add product when item does not already exist', async () => {
            // This test verifies that when adding a new item that doesn't exist yet,
            // we return alreadyInWishlist: false
            const wishlist = {
                id: 'wishlist-123',
                listId: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
                customerProductListItems: [], // Initially empty
            };

            // After adding, we have 1 item
            const wishlistWithItem = {
                ...wishlist,
                customerProductListItems: [{ id: 'item-1', productId: 'product-123' }],
            };

            mockShopperCustomers.getCustomerProductLists.mockResolvedValue({
                data: { data: [{ id: 'wishlist-123', listId: 'wishlist-123', type: 'wish_list' }] },
            });

            // First call: get wishlist before adding (empty list, so item doesn't exist)
            // Second call: get wishlist after adding item
            mockShopperCustomers.getCustomerProductList
                .mockResolvedValueOnce(
                    { data: wishlist } as any // Empty, so item doesn't exist yet
                )
                .mockResolvedValueOnce(
                    { data: wishlistWithItem } as any // After adding, we have 1 item
                );

            mockShopperCustomers.createCustomerProductListItem.mockResolvedValue({
                data: { id: 'item-1', productId: 'product-123' },
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-add',
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
            expect(json.success).toBe(true);
            expect(json.alreadyInWishlist).toBe(false);
        });

        test('should detect duplicate items and return alreadyInWishlist flag', async () => {
            // This test verifies that if an item already exists in the wishlist,
            // it detects this BEFORE attempting to add it and returns alreadyInWishlist: true
            const wishlistWithExistingItem = {
                id: 'wishlist-123',
                listId: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
                customerProductListItems: [
                    { id: 'item-1', productId: 'product-123' }, // Item already exists
                ],
            };

            // getCustomerProductLists returns the wishlist data including items
            mockShopperCustomers.getCustomerProductLists.mockResolvedValue({
                data: { data: [wishlistWithExistingItem] },
            });

            // This mock is no longer called for duplicate check, but keep it for reference
            mockShopperCustomers.getCustomerProductList.mockResolvedValue({
                data: wishlistWithExistingItem,
            } as any);

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-add',
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
            expect(json.success).toBe(true);
            expect(json.alreadyInWishlist).toBe(true);
            // createCustomerProductListItem should NOT be called since item already exists
            expect(mockShopperCustomers.createCustomerProductListItem).not.toHaveBeenCalled();
        });

        test('should handle API errors gracefully', async () => {
            // getWishlist catches errors and returns empty data, so getOrCreateWishlist tries to create
            mockShopperCustomers.getCustomerProductLists.mockRejectedValue(new Error('API Error'));

            // Mock createCustomerProductList to also fail, triggering the final error path
            mockShopperCustomers.createCustomerProductList.mockRejectedValue(new Error('API Error'));

            mockExtractResponseError.mockResolvedValue({
                responseMessage: 'Failed to add to wishlist',
                status_code: '500',
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-add',
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
            expect(json.success).toBe(false);
            expect(json.error).toBeDefined();
        });

        test('should handle case where updatedList needs to be fetched after successful creation', async () => {
            const existingWishlist = {
                id: 'wishlist-123',
                listId: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
                items: [],
            };

            const wishlistWithItem = {
                ...existingWishlist,
                items: [{ id: 'item-123', productId: 'product-123' }],
            };

            mockShopperCustomers.getCustomerProductLists.mockResolvedValue({
                data: { data: [existingWishlist] },
            });

            // First call: get existing wishlist (before adding item) - line 269
            // Second call: get updated wishlist after adding (if updatedList is not set) - line 316
            mockShopperCustomers.getCustomerProductList
                .mockResolvedValueOnce({ data: existingWishlist } as any) // Empty, so item doesn't exist yet
                .mockResolvedValueOnce({ data: wishlistWithItem } as any); // After adding item

            // Mock createCustomerProductListItem to succeed but not set updatedList
            mockShopperCustomers.createCustomerProductListItem.mockResolvedValue({
                data: { id: 'item-123', productId: 'product-123' },
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-add',
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
            expect(json.success).toBe(true);
            expect(json.alreadyInWishlist).toBe(false);
        });

        test('should handle 401/403 authentication errors in catch block', async () => {
            // getWishlist catches errors and returns empty data, so getOrCreateWishlist tries to create
            mockShopperCustomers.getCustomerProductLists.mockRejectedValue(new Error('Unauthorized'));

            // Mock createCustomerProductList to also fail with 401, triggering the auth error path
            mockShopperCustomers.createCustomerProductList.mockRejectedValue(new Error('Unauthorized'));

            mockExtractResponseError.mockResolvedValue({
                responseMessage: 'Unauthorized',
                status_code: '401',
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-add',
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

        test('should handle error when extractResponseError fails and status_code is undefined', async () => {
            // getWishlist catches errors and returns empty data, so getOrCreateWishlist tries to create
            mockShopperCustomers.getCustomerProductLists.mockRejectedValue(new Error('API Error'));

            // Mock createCustomerProductList to also fail, triggering the error path
            mockShopperCustomers.createCustomerProductList.mockRejectedValue(new Error('API Error'));

            // extractResponseError fails, so we fall back to extractStatusCode which returns undefined
            mockExtractResponseError.mockRejectedValue(new Error('Response body already read'));

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-add',
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

        test('should handle retry path when wishlist listId is missing initially', async () => {
            // First call returns wishlist without listId
            const wishlistWithoutId = {
                id: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
            };

            // Retry call returns wishlist with listId
            const wishlistWithId = {
                id: 'wishlist-123',
                listId: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
                items: [],
            };

            const wishlistWithItem = {
                ...wishlistWithId,
                items: [{ id: 'item-123', productId: 'product-123' }],
            };

            // First call: get wishlist (no listId)
            // Second call: retry getCustomerProductLists (after delay)
            // Third call: getCustomerProductList with retry listId
            // Fourth call: getCustomerProductList after adding item
            mockShopperCustomers.getCustomerProductLists
                .mockResolvedValueOnce({
                    data: { data: [wishlistWithoutId] },
                })
                .mockResolvedValueOnce({
                    data: { data: [wishlistWithId] },
                });

            mockShopperCustomers.getCustomerProductList
                .mockResolvedValueOnce({ data: wishlistWithId } as any) // Retry path - line 160
                .mockResolvedValueOnce({ data: wishlistWithItem } as any); // After adding item

            mockShopperCustomers.createCustomerProductListItem.mockResolvedValue({
                data: { id: 'item-123', productId: 'product-123' },
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-add',
            };

            // Start the async operation
            const responsePromise = action(args);

            // Fast-forward the 2 second delay in retry path
            await vi.advanceTimersByTimeAsync(2000);

            // Wait for the response
            const response = await responsePromise;
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else if (response && typeof response === 'object' && 'data' in response) {
                json = (response as any).data;
            } else {
                json = await extractResponseData(response);
            }
            expect(json.success).toBe(true);
        });

        test('should handle retry path when existing item is found during retry', async () => {
            const wishlistWithoutId = {
                id: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
                customerProductListItems: [{ id: 'item-123', productId: 'product-123' }], // Item already exists
            };

            const wishlistWithId = {
                id: 'wishlist-123',
                listId: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
                customerProductListItems: [{ id: 'item-123', productId: 'product-123' }], // Item already exists
            };

            mockShopperCustomers.getCustomerProductLists
                .mockResolvedValueOnce({
                    data: { data: [wishlistWithoutId] },
                })
                .mockResolvedValueOnce({
                    data: { data: [wishlistWithId] },
                });

            // getCustomerProductList is no longer called for duplicate checking after refactor
            mockShopperCustomers.getCustomerProductList.mockResolvedValueOnce({ data: wishlistWithId } as any);

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
                url: new URL(request.url),
                pattern: 'action/wishlist-add',
            };

            // Start the async operation
            const responsePromise = action(args);

            // Fast-forward the 2 second delay in retry path
            await vi.advanceTimersByTimeAsync(2000);

            // Wait for the response
            const response = await responsePromise;
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else if (response && typeof response === 'object' && 'data' in response) {
                json = (response as any).data;
            } else {
                json = await extractResponseData(response);
            }
            expect(json.success).toBe(true);
            expect(json.alreadyInWishlist).toBe(true);
        });
    });
});
