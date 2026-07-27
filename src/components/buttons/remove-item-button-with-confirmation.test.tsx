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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { PropsWithChildren } from 'react';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

const { t } = getTranslation();
import { RemoveItemButtonWithConfirmation } from './remove-item-button-with-confirmation';
import type { ActionResponse } from '@/routes/types/action-responses';
import { useItemFetcher } from '@/hooks/use-item-fetcher';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';
import { resourceRoutes } from '@/route-paths';

// Mock the toast hook
const mockAddToast = vi.fn();
vi.mock('@/components/toast', () => ({
    useToast: () => ({
        addToast: mockAddToast,
    }),
}));

// Mock only useBasketUpdater so the publish-back can be asserted; the rest of the provider is unused by this subtree.
const mockUpdateBasket = vi.fn();
vi.mock('@/providers/basket', () => ({
    useBasketUpdater: () => mockUpdateBasket,
}));

// Mock the useItemFetcher hook
const mockFetcher = {
    submit: vi.fn(),
    state: 'idle' as const,
    data: null as ActionResponse<unknown> | null,
    Form: ({ children, ...props }: PropsWithChildren) => <form {...props}>{children}</form>,
} as unknown as ReturnType<typeof useItemFetcher>;

vi.mock('@/hooks/use-item-fetcher', () => ({
    useItemFetcher: vi.fn(() => mockFetcher),
}));

const mockUseItemFetcher = vi.mocked(useItemFetcher);

describe('RemoveItemButtonWithConfirmation', () => {
    // Create a function to get defaultConfig with i18next called at test runtime
    const getDefaultConfig = () => ({
        action: resourceRoutes.cartItemRemove,
        confirmDescription: t('cart:removeItemConfirmDescription'),
    });

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset to default mock state
        mockFetcher.state = 'idle';
        mockFetcher.data = undefined;
        mockUseItemFetcher.mockReturnValue(mockFetcher);
        mockUpdateBasket.mockClear();
    });

    test('renders remove button with correct text and attributes', () => {
        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={getDefaultConfig()} />
            </ConfigProvider>
        );

        const button = screen.getByTestId('remove-item-item-123');
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent(t('removeItem:button'));
        expect(button).toHaveAttribute('title', t('removeItem:title'));
    });

    test('renders confirmation dialog content when opened', async () => {
        const user = userEvent.setup();

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={getDefaultConfig()} />
            </ConfigProvider>
        );

        // Click the trigger to open the dialog
        const triggerButton = screen.getByTestId('remove-item-item-123');
        await user.click(triggerButton);

        // Now the dialog content should be rendered
        expect(screen.getByText(t('removeItem:confirmTitle'))).toBeInTheDocument();
        expect(screen.getByText(t('cart:removeItemConfirmDescription'))).toBeInTheDocument();
        expect(screen.getByRole('button', { name: t('removeItem:cancelButton') })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: t('removeItem:confirmAction') })).toBeInTheDocument();
    });

    test('shows removing text when status is loading', () => {
        // Mock loading state
        mockFetcher.state = 'submitting';
        mockUseItemFetcher.mockReturnValue(mockFetcher);

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={getDefaultConfig()} />
            </ConfigProvider>
        );

        const button = screen.getByTestId('remove-item-item-123');
        expect(button).toHaveTextContent(t('removeItem:removing'));
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('aria-busy', 'true');
    });

    test('calls removeItem when confirmed', async () => {
        const user = userEvent.setup();

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={getDefaultConfig()} />
            </ConfigProvider>
        );

        // Click the remove button to open dialog
        const removeButton = screen.getByTestId('remove-item-item-123');
        await user.click(removeButton);

        // Click the confirm button in the dialog
        const confirmButton = screen.getByRole('button', { name: t('removeItem:confirmAction') });
        await user.click(confirmButton);

        // Verify that fetcher.submit was called with correct parameters
        expect(mockFetcher.submit).toHaveBeenCalledWith(
            expect.any(FormData),
            expect.objectContaining({
                method: 'POST',
                action: getDefaultConfig().action,
            })
        );
    });

    test('shows success toast when fetcher returns success data', () => {
        // Mock success state
        mockFetcher.state = 'idle';
        mockFetcher.data = { success: true };
        mockUseItemFetcher.mockReturnValue(mockFetcher);

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={getDefaultConfig()} />
            </ConfigProvider>
        );

        expect(mockAddToast).toHaveBeenCalledWith(t('removeItem:success'), 'success');
    });

    test('publishes the action-response basket into BasketProvider on successful remove', () => {
        const responseBasket = { basketId: 'test-basket-id', lastModified: '2026-06-24T10:00:00.000Z' };
        mockFetcher.state = 'idle';
        mockFetcher.data = { success: true, basket: responseBasket };
        mockUseItemFetcher.mockReturnValue(mockFetcher);

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={getDefaultConfig()} />
            </ConfigProvider>
        );

        expect(mockUpdateBasket).toHaveBeenCalledWith(responseBasket);
    });

    test('does not publish a basket when the remove response carries none', () => {
        mockFetcher.state = 'idle';
        mockFetcher.data = { success: true };
        mockUseItemFetcher.mockReturnValue(mockFetcher);

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={getDefaultConfig()} />
            </ConfigProvider>
        );

        expect(mockUpdateBasket).not.toHaveBeenCalled();
    });

    test('does not publish a basket on a failed remove', () => {
        mockFetcher.state = 'idle';
        mockFetcher.data = { success: false, basket: { basketId: 'test-basket-id' } };
        mockUseItemFetcher.mockReturnValue(mockFetcher);

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={getDefaultConfig()} />
            </ConfigProvider>
        );

        expect(mockUpdateBasket).not.toHaveBeenCalled();
    });

    test('shows error toast when fetcher returns error data', () => {
        // Mock error state
        mockFetcher.state = 'idle';
        mockFetcher.data = { success: false };
        mockUseItemFetcher.mockReturnValue(mockFetcher);

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={getDefaultConfig()} />
            </ConfigProvider>
        );

        expect(mockAddToast).toHaveBeenCalledWith(t('removeItem:failed'), 'error');
    });

    test('disables trigger button when status is loading', () => {
        // Mock loading state
        mockFetcher.state = 'submitting';
        mockUseItemFetcher.mockReturnValue(mockFetcher);

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={getDefaultConfig()} />
            </ConfigProvider>
        );

        const removeButton = screen.getByTestId('remove-item-item-123');
        expect(removeButton).toBeDisabled();
        expect(removeButton).toHaveTextContent(t('removeItem:removing'));
        expect(removeButton).toHaveAttribute('aria-busy', 'true');
    });

    test('closes dialog when cancel button is clicked', async () => {
        const user = userEvent.setup();

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={getDefaultConfig()} />
            </ConfigProvider>
        );

        // Click the trigger to open the dialog
        const triggerButton = screen.getByTestId('remove-item-item-123');
        await user.click(triggerButton);

        // Verify dialog is open
        expect(screen.getByText(t('removeItem:confirmTitle'))).toBeInTheDocument();

        // Click cancel button
        const cancelButton = screen.getByRole('button', { name: t('removeItem:cancelButton') });
        await user.click(cancelButton);

        // Verify dialog is closed
        expect(screen.queryByText(t('removeItem:confirmTitle'))).not.toBeInTheDocument();
    });

    test('applies custom className', () => {
        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation
                    itemId="item-123"
                    config={getDefaultConfig()}
                    className="custom-class"
                />
            </ConfigProvider>
        );

        const button = screen.getByTestId('remove-item-item-123');
        expect(button).toHaveClass('custom-class');
    });
});
