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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { masterProduct } from '@/components/__mocks__/master-variant-product';
import DeliveryOptions from './delivery-options';

// Mock the hooks
vi.mock('@/extensions/bopis/hooks/use-delivery-options', () => ({
    useDeliveryOptions: vi.fn(),
}));

vi.mock('@/extensions/store-locator/providers/store-locator', () => ({
    useStoreLocator: vi.fn(),
}));

// Use the mock product from __mocks__ directory
const mockProduct = masterProduct;

const mockStore = {
    id: 'store-123',
    name: 'Test Store',
    inventoryId: 'inventory-123',
};

describe('DeliveryOptions', () => {
    let mockSetSelectedDeliveryOption: ReturnType<typeof vi.fn>;
    let mockOpenStoreLocator: ReturnType<typeof vi.fn>;
    let mockUseDeliveryOptions: ReturnType<typeof vi.fn>;
    let mockUseStoreLocator: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Get the mocked functions
        const { useDeliveryOptions } = await import('@/extensions/bopis/hooks/use-delivery-options');
        const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');

        mockUseDeliveryOptions = useDeliveryOptions as any;
        mockUseStoreLocator = useStoreLocator as any;

        // Setup mock functions
        mockSetSelectedDeliveryOption = vi.fn();
        mockOpenStoreLocator = vi.fn();

        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'delivery',
            isStoreOutOfStock: false,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: vi.fn(),
        });

        // Mock useStoreLocator to return a selector function
        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: null, open: mockOpenStoreLocator, isOpen: false };
            return selector(mockStoreState);
        });
    });

    it('renders with default props (no basketPickupStore)', () => {
        render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={1} />
            </BrowserRouter>
        );

        expect(screen.getByTestId('delivery-option-select')).toBeInTheDocument();
        expect(screen.getByText('Free pickup in')).toBeInTheDocument();
        expect(screen.getByText('Select Store')).toBeInTheDocument();
    });

    it('renders with product and quantity', () => {
        render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={2} />
            </BrowserRouter>
        );

        expect(screen.getByTestId('delivery-option-select')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
        const { container } = render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={1} className="custom-class" />
            </BrowserRouter>
        );

        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('displays store selection message when no store is selected', () => {
        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'delivery',
            isStoreOutOfStock: false,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockSetSelectedDeliveryOption,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: null, open: mockOpenStoreLocator };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={1} />
            </BrowserRouter>
        );

        expect(screen.getByText('Free pickup in')).toBeInTheDocument();
        expect(screen.getByText('Select Store')).toBeInTheDocument();
    });

    it('displays in stock message when store is selected and in stock', () => {
        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'delivery',
            isStoreOutOfStock: false,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockSetSelectedDeliveryOption,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: mockStore, open: mockOpenStoreLocator, isOpen: false };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={1} />
            </BrowserRouter>
        );

        expect(screen.getByText('Now available for pickup today.')).toBeInTheDocument();
        expect(screen.getByText('Test Store')).toBeInTheDocument();
    });

    it('displays out of stock message when store is out of stock', () => {
        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'delivery',
            isStoreOutOfStock: true,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockSetSelectedDeliveryOption,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: mockStore, open: mockOpenStoreLocator, isOpen: false };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={1} />
            </BrowserRouter>
        );
        expect(screen.getByText('Pickup unavailable at')).toBeInTheDocument();
        expect(screen.getByText('Test Store')).toBeInTheDocument();
    });

    it('handles delivery option change to pickup', () => {
        const mockHandleDeliveryOptionChange = vi.fn();

        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'delivery',
            isStoreOutOfStock: false,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockHandleDeliveryOptionChange,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: mockStore, open: mockOpenStoreLocator, isOpen: false };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={1} />
            </BrowserRouter>
        );

        const pickupCard = screen.getByText('Free pickup in').closest('label');
        expect(pickupCard).not.toBeNull();
        fireEvent.click(pickupCard as HTMLElement);

        expect(mockHandleDeliveryOptionChange).toHaveBeenCalledWith('pickup');
    });

    it('handles delivery option change to delivery', () => {
        const mockHandleDeliveryOptionChange = vi.fn();

        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'pickup',
            isStoreOutOfStock: false,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockHandleDeliveryOptionChange,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: mockStore, open: mockOpenStoreLocator, isOpen: false };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={1} />
            </BrowserRouter>
        );

        const deliveryCard = screen.getByText('Deliver to').closest('label');
        expect(deliveryCard).not.toBeNull();
        fireEvent.click(deliveryCard as HTMLElement);

        expect(mockHandleDeliveryOptionChange).toHaveBeenCalledWith('delivery');
    });

    it('handles delivery option change without product', () => {
        const mockHandleDeliveryOptionChange = vi.fn();

        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'delivery',
            isStoreOutOfStock: false,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockHandleDeliveryOptionChange,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: mockStore, open: mockOpenStoreLocator, isOpen: false };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={1} />
            </BrowserRouter>
        );

        const pickupCard = screen.getByText('Free pickup in').closest('label');
        expect(pickupCard).not.toBeNull();
        fireEvent.click(pickupCard as HTMLElement);

        expect(mockHandleDeliveryOptionChange).toHaveBeenCalledWith('pickup');
    });

    it('handles delivery option change without store inventory ID', () => {
        const storeWithoutInventory = { ...mockStore, inventoryId: undefined };
        const mockHandleDeliveryOptionChange = vi.fn();

        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'delivery',
            isStoreOutOfStock: false,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockHandleDeliveryOptionChange,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: storeWithoutInventory, open: mockOpenStoreLocator };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={1} />
            </BrowserRouter>
        );

        const pickupCard = screen.getByText('Free pickup in').closest('label');
        expect(pickupCard).not.toBeNull();
        fireEvent.click(pickupCard as HTMLElement);

        expect(mockHandleDeliveryOptionChange).toHaveBeenCalledWith('pickup');
    });

    it('opens store locator when store selection button is clicked', () => {
        render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={1} />
            </BrowserRouter>
        );

        const storeButton = screen.getByText('Select Store');
        fireEvent.click(storeButton);

        expect(mockOpenStoreLocator).toHaveBeenCalled();
    });

    it('passes correct props to PickupOrDelivery component', () => {
        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'pickup',
            isStoreOutOfStock: true,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockSetSelectedDeliveryOption,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: mockStore, open: mockOpenStoreLocator, isOpen: false };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={1} />
            </BrowserRouter>
        );

        const pickupRadio = screen.getByRole('radio', { name: /pickup unavailable at/i });
        expect(pickupRadio).toHaveAttribute('disabled');
    });
});
