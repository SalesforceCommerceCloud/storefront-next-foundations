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
import { useDeferredRender } from '@/hooks/use-deferred-render';
import type { Recommendation } from '@/hooks/recommenders/use-recommenders';
import DeferredProductRecommendations from './deferred';

vi.mock('@/hooks/use-deferred-render', () => ({
    useDeferredRender: vi.fn(() => false),
}));

// Stub the underlying ProductRecommendations so we can verify mount/unmount behavior
// independently of the carousel + Suspense/Await internals (those are covered by the
// component's own tests).
vi.mock('./index', () => ({
    __esModule: true,
    default: ({ recommenderName, data }: { recommenderName?: string; data?: Promise<Recommendation> }) => {
        // Touch `data` so the mock has a stable identity check we can assert on.
        return (
            <div data-testid={`recs-${recommenderName}`} data-has-data={data ? 'true' : 'false'}>
                ProductRecommendations
            </div>
        );
    },
}));

const renderDeferred = (props: Partial<React.ComponentProps<typeof DeferredProductRecommendations>> = {}) => {
    const data: Promise<Recommendation> = props.data ?? Promise.resolve({});
    const fallback = props.fallback ?? <div data-testid="recs-skeleton">Skeleton</div>;
    const router = createMemoryRouter(
        [
            {
                path: '/test',
                element: (
                    <DeferredProductRecommendations
                        recommenderName="cart-may-also-like"
                        recommenderTitle="You might also like"
                        data={data}
                        fallback={fallback}
                        {...props}
                    />
                ),
            },
        ],
        { initialEntries: ['/test'] }
    );
    return render(<RouterProvider router={router} />);
};

describe('DeferredProductRecommendations — three-phase rendering', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.clearAllMocks());

    test('shows the fallback skeleton while in pre-idle phase', () => {
        vi.mocked(useDeferredRender).mockReturnValue(false);

        renderDeferred();

        expect(screen.getByTestId('recs-skeleton')).toBeInTheDocument();
        expect(screen.queryByTestId('recs-cart-may-also-like')).not.toBeInTheDocument();
    });

    test('mounts ProductRecommendations once useDeferredRender flips to true', async () => {
        vi.mocked(useDeferredRender).mockReturnValue(true);

        await act(() => renderDeferred());

        expect(screen.getByTestId('recs-cart-may-also-like')).toBeInTheDocument();
        expect(screen.queryByTestId('recs-skeleton')).not.toBeInTheDocument();
    });

    test('forwards the loader Promise to ProductRecommendations after the gate opens', async () => {
        vi.mocked(useDeferredRender).mockReturnValue(true);

        await act(() => renderDeferred({ data: Promise.resolve({ recs: [] }) }));

        expect(screen.getByTestId('recs-cart-may-also-like').dataset.hasData).toBe('true');
    });

    test('always passes `true` to useDeferredRender (the wrapper is itself the opt-in)', () => {
        vi.mocked(useDeferredRender).mockReturnValue(false);

        renderDeferred();

        expect(useDeferredRender).toHaveBeenCalledWith(true);
    });
});
