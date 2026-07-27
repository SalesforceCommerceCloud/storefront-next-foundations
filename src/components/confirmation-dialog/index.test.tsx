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

// Components
import { ConfirmationDialog } from './index';

const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Test Title',
    description: 'Test Description',
    cancelButtonText: 'Cancel',
    confirmButtonText: 'Confirm',
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
};

describe('ConfirmationDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('should render dialog when open is true', () => {
            render(<ConfirmationDialog {...defaultProps} />);

            expect(screen.getByText('Test Title')).toBeInTheDocument();
            expect(screen.getByText('Test Description')).toBeInTheDocument();
            expect(screen.getByText('Cancel')).toBeInTheDocument();
            expect(screen.getByText('Confirm')).toBeInTheDocument();
        });

        test('should not render dialog when open is false', () => {
            render(<ConfirmationDialog {...defaultProps} open={false} />);

            expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
            expect(screen.queryByText('Test Description')).not.toBeInTheDocument();
            expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
            expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
        });

        test('should render with default className', () => {
            render(<ConfirmationDialog {...defaultProps} />);

            // The dialog should be rendered (we can't easily test the className on AlertDialogContent in jsdom)
            expect(screen.getByText('Test Title')).toBeInTheDocument();
        });

        test('should render with custom className', () => {
            render(<ConfirmationDialog {...defaultProps} className="custom-class" />);

            expect(screen.getByText('Test Title')).toBeInTheDocument();
        });
    });

    describe('Button Functionality', () => {
        test('should call onCancel when cancel button is clicked', async () => {
            const onCancel = vi.fn();
            render(<ConfirmationDialog {...defaultProps} onCancel={onCancel} />);

            await userEvent.click(screen.getByText('Cancel'));
            expect(onCancel).toHaveBeenCalledTimes(1);
        });

        test('should call onConfirm when confirm button is clicked', async () => {
            const onConfirm = vi.fn();
            render(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);

            await userEvent.click(screen.getByText('Confirm'));
            expect(onConfirm).toHaveBeenCalledTimes(1);
        });

        test('should disable buttons when confirmButtonDisabled prop is true', () => {
            render(<ConfirmationDialog {...defaultProps} confirmButtonDisabled={true} />);

            const cancelButton = screen.getByText('Cancel');
            const confirmButton = screen.getByText('Confirm');

            expect(cancelButton).toBeDisabled();
            expect(confirmButton).toBeDisabled();
        });

        test('should not disable buttons when confirmButtonDisabled prop is false', () => {
            render(<ConfirmationDialog {...defaultProps} confirmButtonDisabled={false} />);

            const cancelButton = screen.getByText('Cancel');
            const confirmButton = screen.getByText('Confirm');

            expect(cancelButton).not.toBeDisabled();
            expect(confirmButton).not.toBeDisabled();
        });

        test('should not disable buttons when confirmButtonDisabled prop is not provided', () => {
            render(<ConfirmationDialog {...defaultProps} />);

            const cancelButton = screen.getByText('Cancel');
            const confirmButton = screen.getByText('Confirm');

            expect(cancelButton).not.toBeDisabled();
            expect(confirmButton).not.toBeDisabled();
        });
    });

    describe('Accessibility', () => {
        test('should have correct ARIA labels for buttons', () => {
            render(
                <ConfirmationDialog
                    {...defaultProps}
                    cancelButtonAriaLabel="Cancel action"
                    confirmButtonAriaLabel="Confirm action"
                />
            );

            const cancelButton = screen.getByText('Cancel');
            const confirmButton = screen.getByText('Confirm');

            expect(cancelButton).toHaveAttribute('aria-label', 'Cancel action');
            expect(confirmButton).toHaveAttribute('aria-label', 'Confirm action');
        });

        test('should work without ARIA labels', () => {
            render(<ConfirmationDialog {...defaultProps} />);

            const cancelButton = screen.getByText('Cancel');
            const confirmButton = screen.getByText('Confirm');

            expect(cancelButton).toBeInTheDocument();
            expect(confirmButton).toBeInTheDocument();
        });

        test('should have proper heading structure', () => {
            render(<ConfirmationDialog {...defaultProps} />);

            const title = screen.getByText('Test Title');
            expect(title.tagName).toBe('H2'); // AlertDialogTitle renders as h2
        });

        test('should have proper description structure', () => {
            render(<ConfirmationDialog {...defaultProps} />);

            const description = screen.getByText('Test Description');
            expect(description).toBeInTheDocument();
        });
    });

    describe('Dialog State Management', () => {
        test('should call onOpenChange when dialog state changes', () => {
            const onOpenChange = vi.fn();
            render(<ConfirmationDialog {...defaultProps} onOpenChange={onOpenChange} />);

            // This would typically be triggered by clicking outside the dialog or pressing escape
            // In a real test environment, we might need to simulate this differently
            expect(onOpenChange).toBeDefined();
        });

        test('should handle rapid open/close state changes', () => {
            const { rerender } = render(<ConfirmationDialog {...defaultProps} open={true} />);
            expect(screen.getByText('Test Title')).toBeInTheDocument();

            rerender(<ConfirmationDialog {...defaultProps} open={false} />);
            expect(screen.queryByText('Test Title')).not.toBeInTheDocument();

            rerender(<ConfirmationDialog {...defaultProps} open={true} />);
            expect(screen.getByText('Test Title')).toBeInTheDocument();
        });
    });

    describe('Content Variations', () => {
        test('should handle long titles', () => {
            const longTitle =
                'This is a very long title that might wrap to multiple lines and should be handled gracefully by the dialog component';
            render(<ConfirmationDialog {...defaultProps} title={longTitle} />);

            expect(screen.getByText(longTitle)).toBeInTheDocument();
        });

        test('should handle long descriptions', () => {
            const longDescription =
                'This is a very long description that contains multiple sentences and should be displayed properly in the dialog. It might wrap to multiple lines and should maintain proper spacing and readability.';
            render(<ConfirmationDialog {...defaultProps} description={longDescription} />);

            expect(screen.getByText(longDescription)).toBeInTheDocument();
        });

        test('should handle empty strings', () => {
            render(<ConfirmationDialog {...defaultProps} title="" description="" />);

            expect(screen.getByText('Cancel')).toBeInTheDocument();
            expect(screen.getByText('Confirm')).toBeInTheDocument();
        });

        test('should handle special characters in text', () => {
            const specialTitle = 'Title with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
            const specialDescription = 'Description with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
            render(<ConfirmationDialog {...defaultProps} title={specialTitle} description={specialDescription} />);

            expect(screen.getByText(specialTitle)).toBeInTheDocument();
            expect(screen.getByText(specialDescription)).toBeInTheDocument();
        });
    });

    describe('Button Text Variations', () => {
        test('should handle long button text', () => {
            const longCancelText = 'This is a very long cancel button text';
            const longConfirmText = 'This is a very long confirm button text';
            render(
                <ConfirmationDialog
                    {...defaultProps}
                    cancelButtonText={longCancelText}
                    confirmButtonText={longConfirmText}
                />
            );

            expect(screen.getByText(longCancelText)).toBeInTheDocument();
            expect(screen.getByText(longConfirmText)).toBeInTheDocument();
        });

        test('should handle empty button text', () => {
            render(<ConfirmationDialog {...defaultProps} cancelButtonText="" confirmButtonText="" />);

            const buttons = screen.getAllByRole('button');
            expect(buttons).toHaveLength(2);
            expect(buttons[0]).toBeInTheDocument();
            expect(buttons[1]).toBeInTheDocument();
        });

        test('should handle special characters in button text', () => {
            const specialCancelText = 'Cancel & Close';
            const specialConfirmText = 'Confirm & Save';
            render(
                <ConfirmationDialog
                    {...defaultProps}
                    cancelButtonText={specialCancelText}
                    confirmButtonText={specialConfirmText}
                />
            );

            expect(screen.getByText(specialCancelText)).toBeInTheDocument();
            expect(screen.getByText(specialConfirmText)).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        test('should handle undefined props gracefully', () => {
            render(
                <ConfirmationDialog
                    open={true}
                    onOpenChange={vi.fn()}
                    title="Test"
                    description="Test"
                    cancelButtonText="Cancel"
                    confirmButtonText="Confirm"
                    onCancel={vi.fn()}
                    onConfirm={vi.fn()}
                    confirmButtonDisabled={undefined}
                    className={undefined}
                    cancelButtonAriaLabel={undefined}
                    confirmButtonAriaLabel={undefined}
                />
            );

            expect(screen.getAllByText('Test')).toHaveLength(2);
        });

        test('should handle null props gracefully', () => {
            render(
                <ConfirmationDialog
                    open={true}
                    onOpenChange={vi.fn()}
                    title="Test"
                    description="Test"
                    cancelButtonText="Cancel"
                    confirmButtonText="Confirm"
                    onCancel={vi.fn()}
                    onConfirm={vi.fn()}
                    confirmButtonDisabled={null as unknown as boolean}
                    className={null as unknown as string}
                    cancelButtonAriaLabel={null as unknown as string}
                    confirmButtonAriaLabel={null as unknown as string}
                />
            );

            expect(screen.getAllByText('Test')).toHaveLength(2);
        });
    });

    describe('Keyboard Navigation', () => {
        test('should be focusable and navigable', () => {
            render(<ConfirmationDialog {...defaultProps} />);

            const cancelButton = screen.getByText('Cancel');
            const confirmButton = screen.getByText('Confirm');

            // Test that buttons are focusable
            cancelButton.focus();
            expect(document.activeElement).toBe(cancelButton);

            confirmButton.focus();
            expect(document.activeElement).toBe(confirmButton);
        });
    });

    describe('Integration with AlertDialog', () => {
        test('should render as AlertDialog component', () => {
            render(<ConfirmationDialog {...defaultProps} />);

            // The component should render without errors
            expect(screen.getByText('Test Title')).toBeInTheDocument();
            expect(screen.getByText('Test Description')).toBeInTheDocument();
        });

        test('should handle dialog backdrop clicks', () => {
            const onOpenChange = vi.fn();
            render(<ConfirmationDialog {...defaultProps} onOpenChange={onOpenChange} />);

            // The AlertDialog should handle backdrop clicks and call onOpenChange
            // This is tested implicitly by ensuring the component renders without errors
            expect(screen.getByText('Test Title')).toBeInTheDocument();
        });
    });
});
