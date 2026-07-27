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

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import AddressSuggestionDropdown, { type AddressSuggestion } from './index';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

const { t } = getTranslation();

describe('AddressSuggestionDropdown', () => {
    const mockSuggestions: AddressSuggestion[] = [
        {
            description: '123 Main Street, New York, NY 10001, USA',
            place_id: 'place_id_1',
            structured_formatting: {
                main_text: '123 Main Street',
                secondary_text: 'New York, NY 10001, USA',
            },
        },
        {
            description: '456 Oak Avenue, Los Angeles, CA 90001, USA',
            place_id: 'place_id_2',
            structured_formatting: {
                main_text: '456 Oak Avenue',
                secondary_text: 'Los Angeles, CA 90001, USA',
            },
        },
        {
            description: '789 Pine Road, Chicago, IL 60601, USA',
            place_id: 'place_id_3',
            structured_formatting: {
                main_text: '789 Pine Road',
                secondary_text: 'Chicago, IL 60601, USA',
            },
        },
    ];

    const mockOnClose = vi.fn();
    const mockOnSelectSuggestion = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Visibility', () => {
        test('renders nothing when isVisible is false', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={false}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            expect(screen.queryByTestId('address-suggestion-dropdown')).not.toBeInTheDocument();
        });

        test('renders nothing when suggestions array is empty', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={[]}
                    isVisible={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            expect(screen.queryByTestId('address-suggestion-dropdown')).not.toBeInTheDocument();
        });

        test('renders dropdown when isVisible is true and has suggestions', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            expect(screen.getByTestId('address-suggestion-dropdown')).toBeInTheDocument();
        });
    });

    describe('Loading State', () => {
        test('displays loading spinner when isLoading is true', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    isLoading={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            expect(screen.getByText(t('addressSuggestionDropdown:loading'))).toBeInTheDocument();
        });

        test('does not display suggestions when loading', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    isLoading={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            expect(screen.queryByText('123 Main Street, New York, NY 10001, USA')).not.toBeInTheDocument();
        });
    });

    describe('Suggestions Display', () => {
        test('displays all suggestions', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            expect(screen.getByText('123 Main Street, New York, NY 10001, USA')).toBeInTheDocument();
            expect(screen.getByText('456 Oak Avenue, Los Angeles, CA 90001, USA')).toBeInTheDocument();
            expect(screen.getByText('789 Pine Road, Chicago, IL 60601, USA')).toBeInTheDocument();
        });

        test('displays SUGGESTED header', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            expect(screen.getByText(t('addressSuggestionDropdown:suggested'))).toBeInTheDocument();
        });

        test('displays Google Maps logo', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            const googleLogo = screen.getByAltText('Google Maps');
            expect(googleLogo).toBeInTheDocument();
        });

        test('uses structured_formatting when description is not available', () => {
            const suggestionsWithoutDescription: AddressSuggestion[] = [
                {
                    place_id: 'place_id_1',
                    structured_formatting: {
                        main_text: '123 Main Street',
                        secondary_text: 'New York, NY 10001, USA',
                    },
                },
            ];

            render(
                <AddressSuggestionDropdown
                    suggestions={suggestionsWithoutDescription}
                    isVisible={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            expect(screen.getByText('123 Main Street, New York, NY 10001, USA')).toBeInTheDocument();
        });
    });

    describe('User Interactions', () => {
        test('calls onClose when close button is clicked', async () => {
            const user = userEvent.setup();
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            const closeButton = screen.getByRole('button', { name: t('addressSuggestionDropdown:closeSuggestions') });
            await user.click(closeButton);

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        test('calls onSelectSuggestion when a suggestion is clicked', async () => {
            const user = userEvent.setup();
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            const firstSuggestion = screen.getByText('123 Main Street, New York, NY 10001, USA');
            await user.click(firstSuggestion);

            expect(mockOnSelectSuggestion).toHaveBeenCalledTimes(1);
            expect(mockOnSelectSuggestion).toHaveBeenCalledWith(mockSuggestions[0]);
        });

        test('calls onSelectSuggestion when Enter key is pressed on a suggestion', async () => {
            const user = userEvent.setup();
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            // Find the button containing the suggestion text
            const firstSuggestionButton = screen
                .getByText('123 Main Street, New York, NY 10001, USA')
                .closest('button');
            firstSuggestionButton?.focus();
            await user.keyboard('{Enter}');

            expect(mockOnSelectSuggestion).toHaveBeenCalledTimes(1);
            expect(mockOnSelectSuggestion).toHaveBeenCalledWith(mockSuggestions[0]);
        });

        test('calls onSelectSuggestion when Space key is pressed on a suggestion', async () => {
            const user = userEvent.setup();
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            // Find the button containing the suggestion text
            const firstSuggestionButton = screen
                .getByText('123 Main Street, New York, NY 10001, USA')
                .closest('button');
            firstSuggestionButton?.focus();
            await user.keyboard(' ');

            expect(mockOnSelectSuggestion).toHaveBeenCalledTimes(1);
            expect(mockOnSelectSuggestion).toHaveBeenCalledWith(mockSuggestions[0]);
        });

        test('calls onClose when clicking outside the dropdown', () => {
            const { container } = render(
                <div>
                    <div data-testid="outside-element">Outside</div>
                    <AddressSuggestionDropdown
                        suggestions={mockSuggestions}
                        isVisible={true}
                        onClose={mockOnClose}
                        onSelectSuggestion={mockOnSelectSuggestion}
                    />
                </div>
            );

            const outsideElement = container.querySelector('[data-testid="outside-element"]');
            expect(outsideElement).toBeInTheDocument();
            fireEvent.mouseDown(outsideElement as Element);

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        test('does not call onClose when clicking inside the dropdown', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            const dropdown = screen.getByTestId('address-suggestion-dropdown');
            fireEvent.mouseDown(dropdown);

            expect(mockOnClose).not.toHaveBeenCalled();
        });
    });

    describe('Position Prop', () => {
        test('applies absolute position class by default', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            const dropdown = screen.getByTestId('address-suggestion-dropdown');
            expect(dropdown).toHaveClass('absolute');
        });

        test('applies relative position class when specified', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    position="relative"
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            const dropdown = screen.getByTestId('address-suggestion-dropdown');
            expect(dropdown).toHaveClass('relative');
        });

        test('applies fixed position class when specified', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    position="fixed"
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            const dropdown = screen.getByTestId('address-suggestion-dropdown');
            expect(dropdown).toHaveClass('fixed');
        });
    });

    describe('Accessibility', () => {
        test('close button has accessible label', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            const closeButton = screen.getByRole('button', { name: t('addressSuggestionDropdown:closeSuggestions') });
            expect(closeButton).toBeInTheDocument();
        });

        test('suggestions are native button elements', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            const buttons = screen.getAllByRole('button');
            // Should have close button + 3 suggestion buttons
            expect(buttons.length).toBe(4);
        });

        test('suggestion buttons are focusable', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            const suggestionButtons = screen
                .getAllByRole('button')
                .filter(
                    (el) =>
                        el.textContent?.includes('Street') ||
                        el.textContent?.includes('Avenue') ||
                        el.textContent?.includes('Road')
                );

            // Native button elements are focusable by default
            suggestionButtons.forEach((button) => {
                expect(button.tagName).toBe('BUTTON');
            });
        });
    });

    describe('Custom ClassName', () => {
        test('applies custom className to dropdown', () => {
            render(
                <AddressSuggestionDropdown
                    suggestions={mockSuggestions}
                    isVisible={true}
                    className="custom-class"
                    onClose={mockOnClose}
                    onSelectSuggestion={mockOnSelectSuggestion}
                />
            );

            const dropdown = screen.getByTestId('address-suggestion-dropdown');
            expect(dropdown).toHaveClass('custom-class');
        });
    });
});
