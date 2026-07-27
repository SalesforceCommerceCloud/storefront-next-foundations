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
import { vi, expect, test, describe, afterEach } from 'vitest';

type MockFormProps = React.PropsWithChildren<Record<string, unknown>>;
type MockLinkProps = React.PropsWithChildren<{ to?: string; href?: string; [key: string]: unknown }>;

const fetcherMock = {
    data: null,
    state: 'idle',

    submit: () => {},
    Form: (props: MockFormProps) => <form {...props}>{props.children}</form>,
};

vi.mock('react-router', () => ({
    href: (path: string) => path,
    createContext: vi.fn().mockImplementation(() => ({})),
    useFetcher: () => fetcherMock,
    useFetchers: () => [],
    useNavigate: () => () => {},
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'test' }),
    useNavigation: () => ({
        state: 'idle',
        location: { pathname: '/', search: '', hash: '', state: null, key: 'test' },
    }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Link: (props: MockLinkProps) => {
        const { to, href, children, ...rest } = props ?? {};
        return (
            <a href={to ?? href} {...rest}>
                {children}
            </a>
        );
    },
}));
vi.mock('@/components/toast', () => ({
    useToast: () => ({ addToast: () => {} }),
}));

// Mock config for useConfig hook
const mockConfig = {
    pages: {
        home: { featuredProductsCount: 12 },
        cart: {
            quantityUpdateDebounce: 750,
            enableRemoveConfirmation: true,
            maxQuantityPerItem: 999,
            enableSaveForLater: false,
            removeAction: '/action/cart-item-remove',
        },
        search: {
            placeholder: 'Search',
            enableSearchSuggestions: true,
            maxSuggestions: 8,
            enableRecentSearches: true,
            suggestionsDebounce: 100,
        },
    },
    commerce: {
        api: {
            clientId: 'test-client',
            organizationId: 'test-org',
            siteId: 'test-site',
            shortCode: 'test123',
        },
    },
    site: {
        locale: 'en-GB',
        currency: 'USD',
        features: {
            socialLogin: { enabled: true, providers: ['Apple', 'Google'] },
            guestCheckout: true,
        },
    },
    global: {
        branding: { name: 'Test Store', logoAlt: 'Home' },
        productListing: {
            defaultProductTileImgAspectRatio: 1,
        },
        carousel: { defaultItemCount: 4 },
        badges: [
            { propertyName: 'c_isSale', label: 'Sale', color: 'orange', priority: 1 },
            { propertyName: 'c_isNew', label: 'New', color: 'green', priority: 2 },
        ],
    },
    images: { quality: 70, formats: ['webp'], fallbackFormat: 'jpg' },
    search: {
        products: {
            refine: {
                orderableOnly: true,
            },
            hits: {
                limit: 24,
                critical: 2,
            },
        },
    },
    performance: {
        caching: { apiCacheTtl: 300, staticAssetCacheTtl: 31536000 },
    },
    development: {
        enableDevtools: true,
        hotReload: true,
        strictMode: true,
    },
};

vi.mock('@salesforce/storefront-next-runtime/config', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@salesforce/storefront-next-runtime/config')>();
    return {
        ...actual,
        useConfig: () => mockConfig,
    };
});

import { composeStories } from '@storybook/react-vite';

import * as ProductGridStories from './grid.stories';
import { render, cleanup, waitFor, act } from '@testing-library/react';

const composed = composeStories(ProductGridStories);

afterEach(() => {
    cleanup();
});

describe('ProductGrid stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, async () => {
            let result: ReturnType<typeof render>;
            await act(async () => {
                result = render(<Story />);
            });
            const { container } = result!;
            // Wait for lazy-loaded swatches to resolve through <Suspense/>
            await waitFor(() => {
                expect(container.querySelector('.product-tile-skeleton')).toBeNull();
            });
            await waitFor(() => {
                expect(container.querySelector('.product-tile-swatches-skeleton')).toBeNull();
            });
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
