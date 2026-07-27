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
import type { RouteObject } from 'react-router';
import { basketWithOneItem, inBasketProductDetails } from '@/components/__mocks__/basket-with-dress';
import { masterProduct } from '@/components/__mocks__/master-variant-product';

/**
 * Default mock routes used by the global Storybook router decorator. Stories
 * can extend this list via `parameters.mockRoutes` (RouteObject[]) without
 * forking the decorator; `scapiMock` overrides the resource loader's default
 * product fixture, and `miniCartData` overrides the basket-products payload.
 */
export const buildDefaultMockRoutes = (
    scapiMock: { data?: unknown } | undefined,
    miniCartData: { basket: unknown; productsById: Record<string, unknown> } | undefined
): RouteObject[] => [
    {
        // Resource route for basket + product enrichment. Returns the basket
        // alongside products keyed by id. Stories can override the default
        // fixture via `parameters.miniCartData` — required for empty-cart
        // stories where the populated default would contradict the story's
        // intent. Bonus-product code paths are no-ops on products without
        // `productPromotions`, so the default fixture leaves it unset.
        path: '/resource/basket-products',
        loader: () => {
            if (miniCartData) {
                return miniCartData;
            }
            const productsById: Record<string, unknown> = {};
            inBasketProductDetails.data?.forEach((product) => {
                if (product.id) {
                    productsById[product.id] = product;
                }
            });
            return { basket: basketWithOneItem, productsById };
        },
    },
    {
        // Action route for OTP verification
        // Used by OTP Modal component's useFetcher hook
        path: '/action/verify-passwordless-otp',
        action: async () => ({ success: false, error: 'Mock OTP verification action' }),
    },
    {
        // Mock action route for cart item quantity updates
        // Used by useCartQuantityUpdate hook via fetcher.submit()
        path: '/action/cart-item-update',
        action: () => ({ success: true }),
    },
    {
        // Mock action route for cart item removal
        // Used by useCartQuantityUpdate hook for remove operations
        path: '/action/cart-item-remove',
        action: () => ({ success: true }),
    },
    {
        // Mock action route for bonus product addition
        // Used by useBonusProductAdd hook via fetcher.submit()
        path: '/action/bonus-product-add',
        action: () => ({ success: true }),
    },
    {
        // Mock action route for checkout registration
        // Used by RegisterCustomerSelection component via fetcher.submit()
        path: '/action/initiate-checkout-registration',
        action: () => ({ success: true, email: 'test@example.com' }),
    },
    {
        // Mock action route for passwordless email OTP trigger
        // Used by ContactInfo component via fetcher.submit() on email blur
        path: '/action/authorize-passwordless-email',
        action: () => ({ success: false }),
    },
    {
        // Mock action route for adding items to cart
        // Used by useProductActions hook via fetcher.submit()
        path: '/action/cart-item-add',
        action: () => ({ success: true }),
    },
    {
        // Mock action route for adding product sets to cart
        // Used by useProductActions hook via fetcher.submit()
        path: '/action/cart-set-add',
        action: () => ({ success: true }),
    },
    {
        // Mock action route for adding product bundles to cart
        // Used by useProductActions hook via fetcher.submit()
        path: '/action/cart-bundle-add',
        action: () => ({ success: true }),
    },
    {
        // Mock action route for adding items to wishlist
        // Used by useWishlist hook via fetcher.submit()
        path: '/action/wishlist-add',
        action: () => ({ success: true }),
    },
    {
        // Mock action route for removing items from wishlist
        // Used by useWishlist hook via fetcher.submit()
        path: '/action/wishlist-remove',
        action: () => ({ success: true }),
    },
    {
        // Mock action route for site-context updates (currency / locale).
        // Used by CurrencySwitcher and LocaleSwitcher via fetcher.submit().
        //
        // Two consumers, two paths:
        //   - `type=locale` — LocaleSwitcher follows the await with
        //     `window.location.href = pathname`. `window.location` is
        //     `[Unforgeable]` so we can't intercept the redirect; instead we
        //     hang the fetcher so the iframe stays alive for play assertions.
        //   - `type=currency` — CurrencySwitcher uses a fire-and-forget
        //     `void fetcher.submit(...)` and stays on the page. Returning
        //     success immediately keeps the fetcher's state idle so it doesn't
        //     leak `submitting` into other stories rendered in the same iframe.
        path: '/action/set-site-context',
        action: async ({ request }) => {
            const formData = await request.formData();
            if (formData.get('type') === 'locale') {
                return new Promise(() => {});
            }
            return { success: true };
        },
    },
    {
        // Mock action route for tracking consent updates
        // Used by useTrackingConsent (TrackingConsentBanner) via fetcher.submit()
        path: '/action/update-tracking-consent',
        action: () => ({ success: true }),
    },
    {
        // Mock action route for the checkout place-order step
        // Used by useCheckoutActions.submitPlaceOrder via fetcher.submit()
        path: '/action/place-order',
        action: () => ({ success: true }),
    },
    {
        // Mock loader for SCAPI resource calls (e.g. product fetches inside CartItemModal).
        // useScapiFetcher calls fetcher.load('/resource/api/client/:resource') — without a
        // loader here React Router throws a 404 when Quick Add opens the modal.
        //
        // Stories can override the returned fixture by setting
        //   parameters: { scapiMock: { data: myFixture } }
        // This is required when a play function asserts against story-specific product data
        // (e.g. BonusProductModal's tie fixture) instead of the default masterProduct.
        path: '/resource/api/client/:resource',
        loader: () => ({ success: true, data: scapiMock?.data ?? masterProduct }),
    },
    {
        // Mock loader for the ratings-reviews summary fetcher used by surfaces
        // that mount outside the route loader chain (e.g. CartItemModal). The
        // ProductReviewsProvider invokes useFetcher.load('/resource/reviews-summary')
        // when no `summary` prop is supplied — without this route the storybook
        // router 404s and the modal's ErrorBoundary swallows the dialog.
        path: '/resource/reviews-summary',
        loader: () => ({ success: true, summary: null }),
    },
];
