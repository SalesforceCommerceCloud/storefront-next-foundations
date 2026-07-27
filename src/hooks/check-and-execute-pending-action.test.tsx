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

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import { useCheckAndExecutePendingAction } from './check-and-execute-pending-action';

const mockNavigate = vi.fn();
vi.mock('@/hooks/use-navigate', () => ({
    useNavigate: () => mockNavigate,
}));

describe('useCheckAndExecutePendingAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Test component that uses the hook
    function TestComponent({
        actionName,
        shouldExecute,
        onMatch,
    }: {
        actionName: string;
        shouldExecute: (params: Record<string, unknown>) => boolean;
        onMatch: (params: Record<string, unknown>) => void | Promise<void>;
    }) {
        useCheckAndExecutePendingAction({
            actionName,
            shouldExecute,
            onMatch,
        });
        return <div>Test</div>;
    }

    const createRouter = (initialPath: string, component: React.ReactElement) => {
        return createMemoryRouter(
            [
                {
                    path: '*',
                    element: <AllProvidersWrapper>{component}</AllProvidersWrapper>,
                },
            ],
            {
                initialEntries: [initialPath],
            }
        );
    };

    test('executes action when URL params match action name and shouldExecute returns true', async () => {
        const mockOnMatch = vi.fn().mockResolvedValue(undefined);
        const mockShouldExecute = vi.fn().mockReturnValue(true);

        const router = createRouter(
            '/product/123?action=addToCart&actionParams={"productId":"123"}',
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(mockShouldExecute).toHaveBeenCalledWith({ productId: '123' });
            expect(mockOnMatch).toHaveBeenCalledWith({ productId: '123' });
        });

        // Should not navigate — URL cleanup is handled by the root-level hook
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('does not execute when action name does not match', async () => {
        const mockOnMatch = vi.fn();
        const mockShouldExecute = vi.fn();

        const router = createRouter(
            '/product/123?action=addToWishlist&actionParams={"productId":"123"}',
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(mockShouldExecute).not.toHaveBeenCalled();
            expect(mockOnMatch).not.toHaveBeenCalled();
        });
    });

    test('does not execute when shouldExecute returns false', async () => {
        const mockOnMatch = vi.fn();
        const mockShouldExecute = vi.fn().mockReturnValue(false);

        const router = createRouter(
            '/product/123?action=addToCart&actionParams={"productId":"456"}',
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(mockShouldExecute).toHaveBeenCalledWith({ productId: '456' });
            expect(mockOnMatch).not.toHaveBeenCalled();
        });
    });

    test('resets execution flag on error so action can retry', async () => {
        const mockOnMatch = vi.fn().mockImplementation(() => {
            return Promise.reject(new Error('Test error'));
        });
        const mockShouldExecute = vi.fn().mockReturnValue(true);

        // Catch unhandled rejections - the hook re-throws after resetting the flag
        const unhandledRejections: unknown[] = [];
        const originalUnhandledRejection = process.listeners('unhandledRejection');
        process.removeAllListeners('unhandledRejection');
        process.on('unhandledRejection', (error) => {
            unhandledRejections.push(error);
        });

        const router = createRouter(
            '/product/123?action=addToCart&actionParams={"productId":"123"}',
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        render(<RouterProvider router={router} />);

        await waitFor(
            () => {
                expect(mockOnMatch).toHaveBeenCalled();
            },
            { timeout: 2000 }
        );

        // Should not navigate — error resets execution flag but doesn't clean URL
        expect(mockNavigate).not.toHaveBeenCalled();

        // Wait a bit for the re-thrown error to propagate
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(unhandledRejections).toHaveLength(1);
        expect(unhandledRejections[0]).toBeInstanceOf(Error);

        // Restore original handlers
        process.removeAllListeners('unhandledRejection');
        originalUnhandledRejection.forEach((listener) => {
            process.on('unhandledRejection', listener as (error: unknown) => void);
        });
    });

    test('clears URL params on invalid JSON', async () => {
        const mockOnMatch = vi.fn();
        const mockShouldExecute = vi.fn();

        const router = createRouter(
            '/product/123?action=addToCart&actionParams=invalid-json',
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/product/123', search: '' }, { replace: true });
            expect(mockOnMatch).not.toHaveBeenCalled();
        });
    });

    test('only executes once per mount', async () => {
        const mockOnMatch = vi.fn().mockResolvedValue(undefined);
        const mockShouldExecute = vi.fn().mockReturnValue(true);

        const router = createRouter(
            '/product/123?action=addToCart&actionParams={"productId":"123"}',
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        const { rerender } = render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(mockOnMatch).toHaveBeenCalledTimes(1);
        });

        // Rerender with same URL params
        rerender(<RouterProvider router={router} />);

        await waitFor(() => {
            // Should still only be called once
            expect(mockOnMatch).toHaveBeenCalledTimes(1);
        });
    });

    test('handles action params with multiple fields', async () => {
        const mockOnMatch = vi.fn().mockResolvedValue(undefined);
        const mockShouldExecute = vi.fn().mockReturnValue(true);

        const actionParams = JSON.stringify({
            productId: '123',
            variantId: '456',
            quantity: 2,
        });

        const router = createRouter(
            `/product/123?action=addToCart&actionParams=${encodeURIComponent(actionParams)}`,
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(mockShouldExecute).toHaveBeenCalledWith({
                productId: '123',
                variantId: '456',
                quantity: 2,
            });
            expect(mockOnMatch).toHaveBeenCalledWith({
                productId: '123',
                variantId: '456',
                quantity: 2,
            });
        });

        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('does not execute when actionParams is missing', async () => {
        const mockOnMatch = vi.fn();
        const mockShouldExecute = vi.fn();

        const router = createRouter(
            '/product/123?action=addToCart',
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(mockShouldExecute).not.toHaveBeenCalled();
            expect(mockOnMatch).not.toHaveBeenCalled();
        });
    });
});
