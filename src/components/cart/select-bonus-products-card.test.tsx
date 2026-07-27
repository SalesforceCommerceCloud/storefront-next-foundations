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
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import SelectBonusProductsCard from './select-bonus-products-card';
import type { BonusPromotionInfo } from '@/lib/cart/bonus-product-utils';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';

// Mock promotion data
const mockPromotion: BonusPromotionInfo = {
    promotionId: 'promo-buy-one-get-tie',
    bonusDiscountLineItemIds: ['bonus-1'],
    maxBonusItems: 2,
    selectedItems: 0,
    remainingCapacity: 2,
    calloutText: 'Buy one Classic Fit Shirt, get 2 free ties!',
};

const mockPromotionNoCallout: BonusPromotionInfo = {
    ...mockPromotion,
    calloutText: null,
};

// Helper function to render component with router context
const renderWithRouter = (component: React.ReactElement) => {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: <ConfigProvider config={mockConfig}>{component}</ConfigProvider>,
            },
        ],
        { initialEntries: ['/'] }
    );
    return render(<RouterProvider router={router} />);
};

describe('SelectBonusProductsCard', () => {
    it('renders all elements correctly', () => {
        const onSelectClick = vi.fn();
        renderWithRouter(<SelectBonusProductsCard promotion={mockPromotion} onSelectClick={onSelectClick} />);

        // Check button text
        const button = screen.getByRole('button', { name: /Select bonus products in Cart/i });
        expect(button).toBeInTheDocument();

        // Check data-testid uses promotionId
        expect(screen.getByTestId('select-bonus-products-card-promo-buy-one-get-tie')).toBeInTheDocument();
        expect(screen.getByTestId('select-bonus-products-button-promo-buy-one-get-tie')).toBeInTheDocument();
    });

    it('handles button click', async () => {
        const user = userEvent.setup();
        const onSelectClick = vi.fn();

        renderWithRouter(<SelectBonusProductsCard promotion={mockPromotion} onSelectClick={onSelectClick} />);

        const button = screen.getByRole('button', { name: /Select bonus products in Cart/i });
        await user.click(button);

        // Should call onSelectClick once
        expect(onSelectClick).toHaveBeenCalledTimes(1);
    });

    it('renders without callout text when calloutText is null', () => {
        renderWithRouter(<SelectBonusProductsCard promotion={mockPromotionNoCallout} onSelectClick={vi.fn()} />);

        // Callout text is never displayed (shown elsewhere in UI)
        expect(screen.queryByText('Buy one Classic Fit Shirt, get 2 free ties!')).not.toBeInTheDocument();

        // Button should still be visible
        expect(screen.getByRole('button', { name: /Select bonus products in Cart/i })).toBeInTheDocument();
    });

    it('applies correct styling classes to card container', () => {
        renderWithRouter(<SelectBonusProductsCard promotion={mockPromotion} onSelectClick={vi.fn()} />);

        const card = screen.getByTestId('select-bonus-products-card-promo-buy-one-get-tie');

        // Check for expected classes
        expect(card).toHaveClass('flex', 'flex-col', 'gap-2');
    });

    it('does not render callout badge', () => {
        renderWithRouter(<SelectBonusProductsCard promotion={mockPromotion} onSelectClick={vi.fn()} />);

        // Callout text is not displayed in this component (shown elsewhere in UI)
        expect(screen.queryByText('Buy one Classic Fit Shirt, get 2 free ties!')).not.toBeInTheDocument();
    });

    it('renders button with secondary variant and full width', () => {
        renderWithRouter(<SelectBonusProductsCard promotion={mockPromotion} onSelectClick={vi.fn()} />);

        const button = screen.getByRole('button', { name: /Select bonus products in Cart/i });

        // Check button has full width class
        expect(button).toHaveClass('w-full');
    });

    it('includes correct data-testid attributes with different promotionId', () => {
        const differentPromotion: BonusPromotionInfo = {
            ...mockPromotion,
            promotionId: 'test-promotion-123',
        };

        renderWithRouter(<SelectBonusProductsCard promotion={differentPromotion} onSelectClick={vi.fn()} />);

        expect(screen.getByTestId('select-bonus-products-card-test-promotion-123')).toBeInTheDocument();
        expect(screen.getByTestId('select-bonus-products-button-test-promotion-123')).toBeInTheDocument();
    });

    it('works without onSelectClick callback', () => {
        // Should not crash if onSelectClick is undefined
        expect(() => {
            renderWithRouter(<SelectBonusProductsCard promotion={mockPromotion} />);
        }).not.toThrow();

        const button = screen.getByRole('button', { name: /Select bonus products in Cart/i });
        expect(button).toBeInTheDocument();
    });

    it('only renders button without promotional text', () => {
        renderWithRouter(<SelectBonusProductsCard promotion={mockPromotion} onSelectClick={vi.fn()} />);

        // Callout text is not displayed in this component (shown elsewhere in UI)
        expect(screen.queryByText('Buy one Classic Fit Shirt, get 2 free ties!')).not.toBeInTheDocument();

        // Button should be rendered
        const button = screen.getByRole('button', { name: /Select bonus products in Cart/i });
        expect(button).toBeInTheDocument();
    });

    it('button can be clicked multiple times', async () => {
        const user = userEvent.setup();
        const onSelectClick = vi.fn();

        renderWithRouter(<SelectBonusProductsCard promotion={mockPromotion} onSelectClick={onSelectClick} />);

        const button = screen.getByRole('button', { name: /Select bonus products in Cart/i });
        await user.click(button);
        await user.click(button);
        await user.click(button);

        expect(onSelectClick).toHaveBeenCalledTimes(3);
    });

    it('handles promotion ids with various characters', () => {
        // Test that promotionId is safely rendered in data-testid
        // without causing rendering errors or DOM issues
        const testCases = ['promo-buy-1-get-2-free!', 'promo_with_underscores', 'promo.with.dots', 'promo-123-abc'];

        testCases.forEach((promotionId) => {
            const { unmount } = renderWithRouter(
                <SelectBonusProductsCard promotion={{ ...mockPromotion, promotionId }} onSelectClick={vi.fn()} />
            );

            expect(screen.getByTestId(`select-bonus-products-card-${promotionId}`)).toBeInTheDocument();
            expect(screen.getByTestId(`select-bonus-products-button-${promotionId}`)).toBeInTheDocument();

            unmount();
        });
    });

    describe('Accessibility', () => {
        it('button is keyboard accessible with Enter key', async () => {
            const user = userEvent.setup();
            const onSelectClick = vi.fn();

            renderWithRouter(<SelectBonusProductsCard promotion={mockPromotion} onSelectClick={onSelectClick} />);

            const button = screen.getByRole('button');
            button.focus();

            expect(button).toHaveFocus();

            await user.keyboard('{Enter}');
            expect(onSelectClick).toHaveBeenCalledTimes(1);
        });

        it('button is keyboard accessible with Space key', async () => {
            const user = userEvent.setup();
            const onSelectClick = vi.fn();

            renderWithRouter(<SelectBonusProductsCard promotion={mockPromotion} onSelectClick={onSelectClick} />);

            const button = screen.getByRole('button');
            button.focus();

            expect(button).toHaveFocus();

            await user.keyboard(' ');
            expect(onSelectClick).toHaveBeenCalledTimes(1);
        });

        it('button has appropriate role', () => {
            renderWithRouter(<SelectBonusProductsCard promotion={mockPromotion} onSelectClick={vi.fn()} />);

            expect(screen.getByRole('button')).toBeInTheDocument();
        });
    });

    describe('Promotion state variations', () => {
        it('renders correctly when all slots are filled (does not hide)', () => {
            const fullPromotion: BonusPromotionInfo = {
                ...mockPromotion,
                selectedItems: 2,
                remainingCapacity: 0,
            };

            const { container } = renderWithRouter(
                <SelectBonusProductsCard promotion={fullPromotion} onSelectClick={vi.fn()} />
            );

            // Component still renders the button even when remainingCapacity is 0
            // This verifies there's no early-return logic based on remainingCapacity
            const button = screen.getByRole('button', { name: /Select bonus products in Cart/i });
            expect(button).toBeInTheDocument();
            expect(container.firstChild).not.toBeEmptyDOMElement();
        });

        it('renders correctly when partially selected', () => {
            const partialPromotion: BonusPromotionInfo = {
                ...mockPromotion,
                selectedItems: 1,
                remainingCapacity: 1,
            };

            renderWithRouter(<SelectBonusProductsCard promotion={partialPromotion} onSelectClick={vi.fn()} />);

            const button = screen.getByRole('button', { name: /Select bonus products in Cart/i });
            expect(button).toBeInTheDocument();
        });
    });

    describe('Rerender behavior', () => {
        it('updates testids when promotion changes', () => {
            const { rerender } = renderWithRouter(
                <SelectBonusProductsCard promotion={mockPromotion} onSelectClick={vi.fn()} />
            );

            expect(screen.getByTestId('select-bonus-products-card-promo-buy-one-get-tie')).toBeInTheDocument();

            const newPromotion: BonusPromotionInfo = {
                ...mockPromotion,
                promotionId: 'promo-different',
            };

            rerender(
                <ConfigProvider config={mockConfig}>
                    <SelectBonusProductsCard promotion={newPromotion} onSelectClick={vi.fn()} />
                </ConfigProvider>
            );

            expect(screen.getByTestId('select-bonus-products-card-promo-different')).toBeInTheDocument();
            expect(screen.queryByTestId('select-bonus-products-card-promo-buy-one-get-tie')).not.toBeInTheDocument();
        });
    });
});
