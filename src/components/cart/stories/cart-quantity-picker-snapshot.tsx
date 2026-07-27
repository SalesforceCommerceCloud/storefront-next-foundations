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
import { composeStories } from '@storybook/react-vite';
import { render, cleanup } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';

import * as CartQuantityPickerStories from './cart-quantity-picker.stories';

// Partial mock — keep RouterProvider/createMemoryRouter real, only override
// the hooks the snapshot needs to be deterministic. Full-replacement mocks
// strip RouterProvider's children and produce null snapshots (Pattern 2).
vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>();
    return {
        ...actual,
        useFetcher: () => ({
            data: null,
            state: 'idle' as const,
            submit: () => {},
            Form: actual.Form,
        }),
        useNavigation: () => ({ state: 'idle' as const, location: undefined }),
    };
});

vi.mock('@salesforce/storefront-next-runtime/config', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@salesforce/storefront-next-runtime/config')>();
    return {
        ...actual,
        useConfig: () => ({
            pages: {
                cart: {
                    quantityUpdateDebounce: 750,
                },
            },
        }),
    };
});

const composed = composeStories(CartQuantityPickerStories);

afterEach(() => {
    cleanup();
});

describe('CartQuantityPicker stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const router = createMemoryRouter(
                [
                    {
                        path: '/',
                        element: (
                            <ConfigProvider config={mockConfig}>
                                <Story />
                            </ConfigProvider>
                        ),
                    },
                ],
                { initialEntries: ['/'] }
            );

            const { container } = render(<RouterProvider router={router} />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
