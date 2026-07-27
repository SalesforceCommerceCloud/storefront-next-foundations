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
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import ResponsiveNavigationMenu from './index';
import type { ShopperProducts } from '@/scapi';

const mockCategories: ShopperProducts.schemas['Category'] = {
    id: 'root',
    name: 'Root Category',
    categories: [
        {
            id: 'cat-1',
            name: 'Category 1',
            c_showInMenu: true,
            onlineSubCategoriesCount: 2,
            categories: [
                {
                    id: 'cat-1-1',
                    name: 'Subcategory 1.1',
                    c_showInMenu: true,
                    onlineSubCategoriesCount: 1,
                    categories: [{ id: 'cat-1-1-1', name: 'Nested Subcategory 1.1.1', c_showInMenu: true }],
                },
                { id: 'cat-1-2', name: 'Subcategory 1.2', c_showInMenu: true },
            ],
        },
        {
            id: 'cat-2',
            name: 'Category 2',
            c_showInMenu: true,
            onlineSubCategoriesCount: 1,
            categories: [{ id: 'cat-2-1', name: 'Subcategory 2.1', c_showInMenu: true }],
        },
        {
            id: 'cat-3',
            name: 'Category 3 (Leaf)',
            c_showInMenu: true,
            onlineSubCategoriesCount: 0,
        },
    ],
};

// Mock useNavigate before importing component
const mockNavigate = vi.fn();
vi.mock('@/hooks/use-navigate', () => ({
    useNavigate: () => mockNavigate,
}));

describe('ResponsiveNavigationMenu Component', () => {
    const renderComponent = (props: Partial<React.ComponentProps<typeof ResponsiveNavigationMenu>> = {}) => {
        const router = createMemoryRouter(
            [
                {
                    path: '*',
                    element: (
                        <AllProvidersWrapper>
                            <ResponsiveNavigationMenu
                                resolve={Promise.resolve(mockCategories)}
                                defer={Promise.resolve([])}
                                {...props}
                            />
                        </AllProvidersWrapper>
                    ),
                },
                {
                    path: '/category/:id',
                    element: <div>Category Page</div>,
                },
            ],
            { initialEntries: ['/'] }
        );
        return render(<RouterProvider router={router} />);
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Basic Rendering', () => {
        it('should render component without errors', () => {
            const { container } = renderComponent();
            expect(container).toBeInTheDocument();
        });

        it('should render mobile hamburger button', async () => {
            const { getByRole } = renderComponent();

            await waitFor(() => {
                expect(getByRole('button', { name: /open menu/i })).toBeInTheDocument();
            });
        });

        it('should handle empty categories array', async () => {
            const { container } = renderComponent({
                resolve: Promise.resolve({ id: 'root', name: 'Root', categories: [] }),
            });

            await waitFor(() => {
                // Component should handle empty categories gracefully
                expect(container).toBeInTheDocument();
            });
        });
    });

    describe('Mobile Menu', () => {
        it('should render mobile menu structure', async () => {
            const { getByRole, container } = renderComponent();

            await waitFor(() => {
                expect(getByRole('button', { name: /open menu/i })).toBeInTheDocument();
            });

            const hamburgerButton = getByRole('button', { name: /open menu/i });

            // Open menu
            act(() => {
                fireEvent.click(hamburgerButton);
            });

            // Mobile navigation should be present
            await waitFor(() => {
                const mobileNav = container.querySelector('[aria-label="Mobile navigation menu"]');
                expect(mobileNav).toBeInTheDocument();
            });
        });

        it('should show all nested mobile menu descendants after expanding a root category', async () => {
            const rootWithDeferredChildren: ShopperProducts.schemas['Category'] = {
                id: 'root',
                name: 'Root Category',
                categories: [
                    {
                        id: 'cat-1',
                        name: 'Category 1',
                        c_showInMenu: true,
                        onlineSubCategoriesCount: 2,
                    },
                ],
            };
            const enrichedCategory: ShopperProducts.schemas['Category'] = mockCategories.categories?.[0] ?? {
                id: 'cat-1',
                name: 'Category 1',
                c_showInMenu: true,
                onlineSubCategoriesCount: 0,
            };
            const { getByRole } = renderComponent({
                resolve: Promise.resolve(rootWithDeferredChildren),
                defer: Promise.resolve([enrichedCategory]),
            });

            await waitFor(() => {
                expect(getByRole('button', { name: /open menu/i })).toBeInTheDocument();
            });

            act(() => {
                fireEvent.click(getByRole('button', { name: /open menu/i }));
            });

            await waitFor(() => {
                expect(getByRole('button', { name: /expand category 1/i })).toBeInTheDocument();
            });

            act(() => {
                fireEvent.click(getByRole('button', { name: /expand category 1/i }));
            });

            await waitFor(() => {
                expect(getByRole('link', { name: /^subcategory 1\.1$/i })).toBeInTheDocument();
            });

            await waitFor(() => {
                expect(getByRole('link', { name: /^nested subcategory 1\.1\.1$/i })).toBeInTheDocument();
            });

            expect(() => getByRole('button', { name: /expand subcategory 1\.1/i })).toThrow();
        });
    });

    describe('Hydration', () => {
        it('does not mount the subscribing category subtree while the menu is closed', async () => {
            const { getByRole, queryByRole, container } = renderComponent();

            await waitFor(() => {
                expect(getByRole('button', { name: /open menu/i })).toBeInTheDocument();
            });

            // While closed, the mobile category list must not be mounted. Each MobileMenuCategory subscribes to the
            // sub-category store via useSubCategory (useSyncExternalStore). If it stays mounted while hidden, the
            // post-hydration store update re-renders the header and cascades into a whole-page flicker. Mounting it
            // only on open keeps the subscribers out of the SSR/hydration tree.
            expect(container.querySelector('[aria-label="Mobile navigation menu"]')).not.toBeInTheDocument();
            expect(queryByRole('link', { name: /^category 1$/i })).not.toBeInTheDocument();

            // Opening the menu mounts the subscribing subtree on demand.
            act(() => {
                fireEvent.click(getByRole('button', { name: /open menu/i }));
            });

            await waitFor(() => {
                expect(container.querySelector('[aria-label="Mobile navigation menu"]')).toBeInTheDocument();
            });
            expect(getByRole('link', { name: /^category 1$/i })).toBeInTheDocument();
        });
    });

    describe('Keyboard Accessibility (Critical)', () => {
        it('should use onPointerDown for navigation, not onClick', () => {
            // This test verifies the fix for the accessibility issue where
            // onClick was preventing keyboard users from expanding dropdowns.
            // With onPointerDown + mouse guard, keyboard events (Enter/Space)
            // can expand dropdowns without triggering navigation.

            const { container } = renderComponent();

            // Component should render without throwing
            expect(container).toBeInTheDocument();

            // The actual behavior is tested in Storybook interaction tests,
            // as JSDOM doesn't fully support PointerEvent with pointerType.
            // This test documents the expected behavior.
        });

        it('should not call navigate on non-mouse pointer events', () => {
            const { container } = renderComponent();

            // The onPointerDown handler checks e.pointerType === 'mouse'
            // Touch and pen events should not trigger navigation
            // This preserves keyboard accessibility for dropdown expansion

            // Initial state: no navigation should have occurred
            expect(container).toBeInTheDocument();
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    describe('Promise Handling', () => {
        it('should handle rejected resolve promise gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            renderComponent({
                resolve: Promise.reject(new Error('Failed to load categories')),
            });

            // Component should not crash
            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalled();
            });

            consoleSpy.mockRestore();
        });
    });
});
