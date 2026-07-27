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
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { ShopperSearch } from '@/scapi';
import { useDeferredRender } from '@/hooks/use-deferred-render';
import { ConfigWrapper } from '@/test-utils/config';
import DeferredProductGrid from './deferred';

vi.mock('@/hooks/use-deferred-render', () => ({
    useDeferredRender: vi.fn((enabled: boolean) => !enabled),
}));

vi.mock('@/components/product-tile', () => ({
    ProductTile: ({ product }: { product: ShopperSearch.schemas['ProductSearchHit'] }) => (
        <div data-testid={`product-tile-${product.productId}`}>
            <button>{product.productName}</button>
        </div>
    ),
    ProductTileProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/providers/dynamic-image', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/category-skeleton', () => ({
    ProductTileSkeleton: () => <div data-testid="product-tile-skeleton" />,
}));

type ProductHit = ShopperSearch.schemas['ProductSearchHit'];

const makeProduct = (id: string, name: string): ProductHit => ({
    productId: id,
    productName: name,
    price: 99.99,
});

const p1 = makeProduct('p1', 'Product One');
const p2 = makeProduct('p2', 'Product Two');
const p3 = makeProduct('p3', 'Product Three');

const renderDeferred = ({
    critical,
    nonCritical,
    nonCriticalCount,
    errorElement,
}: {
    critical?: ProductHit[];
    nonCritical: Promise<ProductHit[]>;
    nonCriticalCount?: number;
    errorElement?: React.ReactElement;
}) => {
    const router = createMemoryRouter(
        [
            {
                path: '/test',
                element: (
                    <ConfigWrapper>
                        <DeferredProductGrid
                            critical={critical}
                            nonCritical={nonCritical}
                            nonCriticalCount={nonCriticalCount}
                            errorElement={errorElement}
                        />
                    </ConfigWrapper>
                ),
            },
        ],
        { initialEntries: ['/test'] }
    );
    return render(<RouterProvider router={router} />);
};

describe('DeferredProductGrid — three-phase rendering', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.clearAllMocks());

    test('shows skeleton tiles while in pre-idle state', () => {
        vi.mocked(useDeferredRender).mockReturnValue(false);

        renderDeferred({
            critical: [p1],
            nonCritical: Promise.resolve([p2, p3]),
            nonCriticalCount: 6,
        });

        expect(screen.getAllByTestId('product-tile-skeleton')).toHaveLength(6);
        expect(screen.getByTestId('product-tile-p1')).toBeInTheDocument();
        expect(screen.queryByTestId('product-tile-p2')).not.toBeInTheDocument();
    });

    test('renders non-critical products after idle and promise resolution', async () => {
        vi.mocked(useDeferredRender).mockReturnValue(true);

        await act(() =>
            renderDeferred({
                critical: [p1],
                nonCritical: Promise.resolve([p2, p3]),
                nonCriticalCount: 6,
            })
        );

        expect(screen.getByTestId('product-tile-p1')).toBeInTheDocument();
        expect(screen.getByTestId('product-tile-p2')).toBeInTheDocument();
        expect(screen.getByTestId('product-tile-p3')).toBeInTheDocument();
    });

    test('calls useDeferredRender with enabled=true when nonCriticalCount > 0', async () => {
        vi.mocked(useDeferredRender).mockReturnValue(true);

        await act(() =>
            renderDeferred({
                critical: [p1],
                nonCritical: Promise.resolve([p2]),
                nonCriticalCount: 6,
            })
        );

        expect(useDeferredRender).toHaveBeenCalledWith(true);
    });

    test('calls useDeferredRender with enabled=false when nonCriticalCount is 0', async () => {
        vi.mocked(useDeferredRender).mockReturnValue(true);

        await act(() =>
            renderDeferred({
                critical: [p1],
                nonCritical: Promise.resolve([p2]),
                nonCriticalCount: 0,
            })
        );

        expect(useDeferredRender).toHaveBeenCalledWith(false);
    });

    test('shows Suspense fallback skeletons while promise is pending post-idle', () => {
        vi.mocked(useDeferredRender).mockReturnValue(true);

        renderDeferred({
            critical: [p1],
            nonCritical: new Promise(() => {}),
            nonCriticalCount: 3,
        });

        expect(screen.getAllByTestId('product-tile-skeleton')).toHaveLength(3);
        expect(screen.getByTestId('product-tile-p1')).toBeInTheDocument();
    });
});

describe('DeferredProductGrid — promise pinning across revalidation', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.clearAllMocks());

    test('does not re-suspend when parent re-renders with a fresh pending promise reference', async () => {
        vi.mocked(useDeferredRender).mockReturnValue(true);

        const initial = Promise.resolve([p2, p3]);

        // A wrapper that lets us swap in a new promise without rebuilding the router (which
        // would force a remount of the whole subtree and mask the bug).
        function Harness({ promise }: { promise: Promise<(typeof p2)[]> }) {
            return (
                <ConfigWrapper>
                    <DeferredProductGrid critical={[p1]} nonCritical={promise} nonCriticalCount={4} />
                </ConfigWrapper>
            );
        }

        const router = createMemoryRouter([{ path: '/test', element: <Harness promise={initial} /> }], {
            initialEntries: ['/test'],
        });

        const { rerender } = render(<RouterProvider router={router} />);
        await act(() => initial);

        const initialTile = screen.getByTestId('product-tile-p2');
        expect(initialTile).toBeInTheDocument();

        // Simulate a non-navigating loader revalidation: a brand-new pending promise reference
        // is passed in for the same conceptual data. Without pinning, <Await> would re-suspend
        // and swap to its skeleton fallback — orphaning any in-flight useFetcher inside the
        // grid (e.g. wishlist).
        const fresh = new Promise<(typeof p2)[]>(() => {});
        const router2 = createMemoryRouter([{ path: '/test', element: <Harness promise={fresh} /> }], {
            initialEntries: ['/test'],
        });
        rerender(<RouterProvider router={router2} />);

        // Tiles still rendered; no skeleton fallback was swapped in.
        expect(screen.getByTestId('product-tile-p2')).toBeInTheDocument();
        expect(screen.getByTestId('product-tile-p3')).toBeInTheDocument();
        expect(screen.queryByTestId('product-tile-skeleton')).not.toBeInTheDocument();
    });
});

describe('DeferredProductGrid — error handling', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.clearAllMocks());

    test('renders errorElement when non-critical promise rejects', async () => {
        vi.mocked(useDeferredRender).mockReturnValue(true);
        const rejectedPromise = Promise.reject(new Error('API failed'));
        rejectedPromise.catch(() => {});

        await act(() =>
            renderDeferred({
                critical: [p1],
                nonCritical: rejectedPromise,
                nonCriticalCount: 4,
                errorElement: <div data-testid="grid-error">Products failed to load</div>,
            })
        );

        expect(screen.getByTestId('grid-error')).toBeInTheDocument();
        expect(screen.getByTestId('product-tile-p1')).toBeInTheDocument();
    });

    test('does not render errorElement when non-critical promise resolves', async () => {
        vi.mocked(useDeferredRender).mockReturnValue(true);

        await act(() =>
            renderDeferred({
                critical: [p1],
                nonCritical: Promise.resolve([p2]),
                nonCriticalCount: 4,
                errorElement: <div data-testid="grid-error">Products failed to load</div>,
            })
        );

        expect(screen.queryByTestId('grid-error')).not.toBeInTheDocument();
        expect(screen.getByTestId('product-tile-p1')).toBeInTheDocument();
        expect(screen.getByTestId('product-tile-p2')).toBeInTheDocument();
    });
});
