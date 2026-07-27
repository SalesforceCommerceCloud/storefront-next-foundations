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
import { render, screen } from '@testing-library/react';
import StoreLocatorProvider, { useStoreLocator } from './store-locator';

// Mock the store creation function
vi.mock('@/extensions/store-locator/stores/store-locator-store', () => ({
    createStoreLocatorStore: vi.fn(),
}));

// Test component that uses the hook
const TestComponent = () => {
    const selectedStoreInfo = useStoreLocator((s) => s.selectedStoreInfo);
    const setSelectedStoreInfo = useStoreLocator((s) => s.setSelectedStoreInfo);

    return (
        <div>
            <div data-testid="store-info">
                {selectedStoreInfo ? `${selectedStoreInfo.name} (${selectedStoreInfo.id})` : 'No store selected'}
            </div>
            <button
                data-testid="set-store"
                onClick={() =>
                    setSelectedStoreInfo({ id: 'test-store', name: 'Test Store', inventoryId: 'test-inventory' })
                }>
                Set Store
            </button>
        </div>
    );
};

// Test component that uses the hook outside provider
const TestComponentOutsideProvider = () => {
    try {
        const selectedStoreInfo = useStoreLocator((s) => s.selectedStoreInfo);
        return <div data-testid="store-info">{selectedStoreInfo?.name || 'No store'}</div>;
    } catch (error) {
        return <div data-testid="error">{(error as Error).message}</div>;
    }
};

describe('StoreLocatorProvider', () => {
    const mockCreateStoreLocatorStore = vi.fn();
    const mockStore = {
        getState: vi.fn(),
        setState: vi.fn(),
        subscribe: vi.fn(),
        destroy: vi.fn(),
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        const { createStoreLocatorStore } = await import('@/extensions/store-locator/stores/store-locator-store');
        vi.mocked(createStoreLocatorStore).mockImplementation(mockCreateStoreLocatorStore);

        mockCreateStoreLocatorStore.mockReturnValue(mockStore);
    });

    it('renders children', () => {
        render(
            <StoreLocatorProvider>
                <div data-testid="child">Test Child</div>
            </StoreLocatorProvider>
        );

        expect(screen.getByTestId('child')).toBeInTheDocument();
        expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('creates store with initial selected store info from prop', async () => {
        const { createStoreLocatorStore } = await import('@/extensions/store-locator/stores/store-locator-store');

        const initialStoreInfo = {
            id: 'test-store',
            name: 'Test Store',
            inventoryId: 'test-inventory',
        };

        render(
            <StoreLocatorProvider selectedStoreInfo={initialStoreInfo}>
                <div>Test</div>
            </StoreLocatorProvider>
        );

        expect(vi.mocked(createStoreLocatorStore)).toHaveBeenCalledWith({
            selectedStoreInfo: initialStoreInfo,
        });
    });

    it('creates store with null when no selectedStoreInfo prop is provided', async () => {
        const { createStoreLocatorStore } = await import('@/extensions/store-locator/stores/store-locator-store');

        render(
            <StoreLocatorProvider>
                <div>Test</div>
            </StoreLocatorProvider>
        );

        expect(vi.mocked(createStoreLocatorStore)).toHaveBeenCalledWith({
            selectedStoreInfo: null,
        });
    });

    it('creates store with null when selectedStoreInfo prop is null', async () => {
        const { createStoreLocatorStore } = await import('@/extensions/store-locator/stores/store-locator-store');

        render(
            <StoreLocatorProvider selectedStoreInfo={null}>
                <div>Test</div>
            </StoreLocatorProvider>
        );

        expect(vi.mocked(createStoreLocatorStore)).toHaveBeenCalledWith({
            selectedStoreInfo: null,
        });
    });

    it('provides store context to children', () => {
        mockStore.getState.mockReturnValue({
            selectedStoreInfo: { id: 'test-store', name: 'Test Store', inventoryId: 'test-inventory' },
            setSelectedStoreInfo: vi.fn(),
        });

        render(
            <StoreLocatorProvider>
                <TestComponent />
            </StoreLocatorProvider>
        );

        expect(screen.getByTestId('store-info')).toHaveTextContent('Test Store (test-store)');
    });

    it('useStoreLocator throws error when used outside provider', () => {
        render(<TestComponentOutsideProvider />);

        expect(screen.getByTestId('error')).toHaveTextContent(
            'useStoreLocator must be used within StoreLocatorProvider'
        );
    });

    it('useStoreLocator works with different selectors', () => {
        const TestSelectorComponent = () => {
            const selectedStoreInfo = useStoreLocator((s) => s.selectedStoreInfo);
            const hasSelectedStore = useStoreLocator((s) => !!s.selectedStoreInfo);

            return (
                <div>
                    <div data-testid="store-info">{selectedStoreInfo?.name || 'No store'}</div>
                    <div data-testid="has-store">{hasSelectedStore ? 'Yes' : 'No'}</div>
                </div>
            );
        };

        mockStore.getState.mockReturnValue({
            selectedStoreInfo: { id: 'test-store', name: 'Test Store', inventoryId: 'test-inventory' },
        });

        render(
            <StoreLocatorProvider>
                <TestSelectorComponent />
            </StoreLocatorProvider>
        );

        expect(screen.getByTestId('store-info')).toHaveTextContent('Test Store');
        expect(screen.getByTestId('has-store')).toHaveTextContent('Yes');
    });

    it('useStoreLocator works with null selected store info', () => {
        mockStore.getState.mockReturnValue({
            selectedStoreInfo: null,
        });

        render(
            <StoreLocatorProvider>
                <TestComponent />
            </StoreLocatorProvider>
        );

        expect(screen.getByTestId('store-info')).toHaveTextContent('No store selected');
    });
});
