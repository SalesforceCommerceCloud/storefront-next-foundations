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
/** @sfdc-extension-file SFDC_EXT_STORE_LOCATOR */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import ChangeStoreButton from './change-store-button';

// Mock react-router
const mockRevalidate = vi.fn();
vi.mock('react-router', () => ({
    href: (path: string) => path,
    useRevalidator: () => ({
        revalidate: mockRevalidate,
    }),
}));

// Mock the store locator hook
const mockOpen = vi.fn();
const mockState = {
    open: mockOpen,
    selectedStoreInfo: { id: 'store-001' } as { id: string } | null,
    isOpen: false,
};

vi.mock('@/extensions/store-locator/providers/store-locator', () => ({
    useStoreLocator: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

describe('ChangeStoreButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.open = mockOpen;
        mockState.selectedStoreInfo = { id: 'store-001' };
        mockState.isOpen = false;
    });

    test('renders Change store button', () => {
        render(<ChangeStoreButton currentStoreId="store-001" />);
        expect(screen.getByRole('button', { name: 'Change store' })).toBeInTheDocument();
    });

    test('calls openStoreLocator when button is clicked', () => {
        render(<ChangeStoreButton currentStoreId="store-001" />);
        const button = screen.getByRole('button', { name: 'Change store' });
        fireEvent.click(button);
        expect(mockOpen).toHaveBeenCalledTimes(1);
    });

    test('triggers revalidation when locator closes with a different store selected', () => {
        // Start with locator open and a different store selected
        mockState.isOpen = true;
        mockState.selectedStoreInfo = { id: 'store-002' };
        const { rerender } = render(<ChangeStoreButton currentStoreId="store-001" />);

        // No revalidation yet - locator is still open
        expect(mockRevalidate).not.toHaveBeenCalled();

        // Close the locator
        mockState.isOpen = false;
        rerender(<ChangeStoreButton currentStoreId="store-001" />);

        // Revalidation should be triggered now that the locator closed
        expect(mockRevalidate).toHaveBeenCalledTimes(1);
    });

    test('does not trigger revalidation when locator closes with same store', () => {
        // Start with locator open, same store
        mockState.isOpen = true;
        mockState.selectedStoreInfo = { id: 'store-001' };
        const { rerender } = render(<ChangeStoreButton currentStoreId="store-001" />);

        // Close the locator
        mockState.isOpen = false;
        rerender(<ChangeStoreButton currentStoreId="store-001" />);

        expect(mockRevalidate).not.toHaveBeenCalled();
    });

    test('does not trigger revalidation while locator is still open', () => {
        mockState.isOpen = true;
        mockState.selectedStoreInfo = { id: 'store-002' };
        render(<ChangeStoreButton currentStoreId="store-001" />);

        expect(mockRevalidate).not.toHaveBeenCalled();
    });

    test('does not trigger revalidation when store is unchanged', () => {
        render(<ChangeStoreButton currentStoreId="store-001" />);
        expect(mockRevalidate).not.toHaveBeenCalled();
    });

    test('does not trigger revalidation when no store is selected', () => {
        mockState.isOpen = true;
        mockState.selectedStoreInfo = null;
        const { rerender } = render(<ChangeStoreButton currentStoreId="store-001" />);

        mockState.isOpen = false;
        rerender(<ChangeStoreButton currentStoreId="store-001" />);

        expect(mockRevalidate).not.toHaveBeenCalled();
    });
});
