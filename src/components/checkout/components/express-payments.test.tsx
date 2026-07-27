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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExpressPayments from './express-payments';
import ApplePayLogo from './apple-pay-logo';
import GooglePayLogo from './google-pay-logo';
import PayPalLogo from './paypal-logo';
import VenmoLogo from './venmo-logo';
import StaticPayPalButton from './static-paypal-button';
import StaticVenmoButton from './static-venmo-button';

const createDefaultProps = (overrides = {}) => ({
    disabled: false,
    ...overrides,
});

describe('ExpressPayments Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders payment buttons container', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const gridContainer = container.querySelector('.grid');
            expect(gridContainer).toBeInTheDocument();
        });

        test('renders all express payment buttons', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            expect(screen.getByRole('button', { name: 'Apple Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Google Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Amazon Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'PayPal' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Venmo' })).toBeInTheDocument();
        });

        test('renders divider with separator text', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            expect(screen.getByText('or continue below')).toBeInTheDocument();
        });
    });

    describe('Button Interactions', () => {
        beforeEach(() => {
            // Mock window.alert to avoid showing alerts in tests
            vi.spyOn(window, 'alert').mockImplementation(() => {});
        });

        test('shows alert when Apple Pay button is clicked', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const applePayButton = screen.getByRole('button', { name: 'Apple Pay' });
            await user.click(applePayButton);
            expect(window.alert).toHaveBeenCalledWith(
                'Apple Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
            );
        });

        test('shows alert when Google Pay button is clicked', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const googlePayButton = screen.getByRole('button', { name: 'Google Pay' });
            await user.click(googlePayButton);
            expect(window.alert).toHaveBeenCalledWith(
                'Google Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
            );
        });

        test('shows alert when Amazon Pay button is clicked', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const amazonPayButton = screen.getByRole('button', { name: 'Amazon Pay' });
            await user.click(amazonPayButton);
            expect(window.alert).toHaveBeenCalledWith(
                'Amazon Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
            );
        });

        test('shows alert when PayPal button is clicked', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const paypalButton = screen.getByRole('button', { name: 'PayPal' });
            await user.click(paypalButton);
            expect(window.alert).toHaveBeenCalledWith(
                'PayPal express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
            );
        });

        test('shows alert when Venmo button is clicked', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const venmoButton = screen.getByRole('button', { name: 'Venmo' });
            await user.click(venmoButton);
            expect(window.alert).toHaveBeenCalledWith(
                'Venmo express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
            );
        });

        test('does not show alerts when disabled', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps({ disabled: true })} />);

            const applePayButton = screen.getByRole('button', { name: 'Apple Pay' });
            await user.click(applePayButton);

            // No alert should be shown when buttons are disabled
            expect(window.alert).not.toHaveBeenCalled();
        });
    });

    describe('Disabled State', () => {
        test('passes disabled prop to all payment buttons', () => {
            render(<ExpressPayments {...createDefaultProps({ disabled: true })} />);

            const buttons = screen.getAllByRole('button');
            // All buttons should be disabled
            buttons.forEach((button) => {
                expect(button).toBeDisabled();
            });
        });
    });

    describe('Static Buttons', () => {
        test('renders static PayPal and Venmo buttons immediately', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            expect(screen.getByRole('button', { name: 'PayPal' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Venmo' })).toBeInTheDocument();
        });

        test('static buttons match SDK appearance', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            const paypalButton = screen.getByRole('button', { name: 'PayPal' });
            const venmoButton = screen.getByRole('button', { name: 'Venmo' });

            expect(paypalButton.querySelector('img')).toBeTruthy();
            expect(venmoButton.querySelector('img')).toBeTruthy();
        });
    });

    describe('Layout Options', () => {
        test('renders horizontal layout by default', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const gridContainer = container.querySelector('.grid');
            expect(gridContainer).toHaveClass('grid-cols-2');
            expect(gridContainer).toHaveClass('lg:grid-cols-5');
        });

        test('renders vertical layout when layout prop is "vertical"', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps({ layout: 'vertical' })} />);

            const gridContainer = container.querySelector('.grid');
            expect(gridContainer).toHaveClass('grid-cols-1');
            expect(gridContainer).not.toHaveClass('grid-cols-2');
            expect(gridContainer).not.toHaveClass('lg:grid-cols-5');
        });

        test('vertical layout has tighter spacing', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps({ layout: 'vertical' })} />);

            const gridContainer = container.querySelector('.grid');
            expect(gridContainer).toHaveClass('gap-2');
        });
    });

    describe('Static Payment Buttons', () => {
        test('renders all static payment buttons', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            expect(screen.getByRole('button', { name: 'Apple Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Google Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Amazon Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'PayPal' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Venmo' })).toBeInTheDocument();
        });
    });

    describe('Separator Configuration', () => {
        test('renders separator at bottom by default', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const separators = container.querySelectorAll('.relative');
            expect(separators.length).toBeGreaterThan(0);

            expect(screen.getByText('or continue below')).toBeInTheDocument();
        });

        test('renders separator at top when position is "top"', () => {
            render(<ExpressPayments {...createDefaultProps({ separatorPosition: 'top' })} />);

            expect(screen.getByText('or continue below')).toBeInTheDocument();
        });

        test('renders custom separator text with uppercase styling', () => {
            render(<ExpressPayments {...createDefaultProps({ separatorText: 'Or continue with card' })} />);

            // Text content in DOM, displayed as uppercase via CSS
            expect(screen.getByText('Or continue with card')).toBeInTheDocument();
            expect(screen.queryByText('Or')).not.toBeInTheDocument();
        });

        test('renders custom separator text at top position with uppercase styling', () => {
            render(
                <ExpressPayments
                    {...createDefaultProps({ separatorPosition: 'top', separatorText: 'Express checkout' })}
                />
            );

            // Text content in DOM, displayed as uppercase via CSS
            expect(screen.getByText('Express checkout')).toBeInTheDocument();
        });

        test('separator has both left and right lines', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            // Find separator container
            const separator = container.querySelector('.relative.flex.items-center');
            expect(separator).toBeInTheDocument();

            // Should have two line elements (left and right) - find divs with flex-1 class
            const lines = separator?.querySelectorAll('div.flex-1');
            expect(lines).toHaveLength(2);
        });

        test('separator lines have correct styling (1px height, separator color)', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const separator = container.querySelector('.relative.flex.items-center');
            const lines = separator?.querySelectorAll('div.flex-1');

            lines?.forEach((line) => {
                expect(line).toHaveClass('h-px');
                expect(line).toHaveClass('bg-separator');
            });
        });

        test('separator text has correct styling', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const separator = container.querySelector('.relative.flex.items-center');
            const textElement = separator?.querySelector('span');

            expect(textElement).toHaveClass('text-muted-foreground');
            expect(textElement).toHaveAttribute('data-express-payments-separator-label');
            expect(textElement).toHaveClass('font-normal');
            expect(textElement).toHaveClass('text-sm');
        });

        test('separator text preserves content', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps({ separatorText: 'Or buy with' })} />);

            const separator = container.querySelector('.relative.flex.items-center');
            const textElement = separator?.querySelector('span') as HTMLElement;

            expect(textElement.textContent).toBe('Or buy with');
        });

        test('separator appears after buttons when position is bottom (default)', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const gridContainer = container.querySelector('.grid');
            const separator = container.querySelector('.relative.flex.items-center');

            // Separator should come after the grid in DOM order
            expect(gridContainer && separator).toBeTruthy();
            if (gridContainer && separator) {
                expect(gridContainer.compareDocumentPosition(separator)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
            }
        });

        test('separator appears before buttons when position is top', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps({ separatorPosition: 'top' })} />);

            const gridContainer = container.querySelector('.grid');
            const separator = container.querySelector('.relative.flex.items-center');

            // Separator should come before the grid in DOM order
            expect(gridContainer && separator).toBeTruthy();
            if (gridContainer && separator) {
                expect(gridContainer.compareDocumentPosition(separator)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
            }
        });

        test('separator lines are visible (not hidden)', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const separator = container.querySelector('.relative.flex.items-center');
            const lines = separator?.querySelectorAll('div.flex-1');

            expect(lines).toHaveLength(2);
            lines?.forEach((line) => {
                const htmlElement = line as HTMLElement;
                expect(htmlElement).toHaveClass('flex-1');
                expect(htmlElement).toHaveClass('h-px');
            });
        });
    });

    describe('Accessibility', () => {
        test('all buttons have aria-label attributes', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            expect(screen.getByRole('button', { name: 'Apple Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Google Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Amazon Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'PayPal' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Venmo' })).toBeInTheDocument();
        });

        test('buttons are keyboard accessible', async () => {
            const user = userEvent.setup();
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

            render(<ExpressPayments {...createDefaultProps()} />);

            const applePayButton = screen.getByRole('button', { name: 'Apple Pay' });
            applePayButton.focus();
            expect(applePayButton).toHaveFocus();

            await user.keyboard('{Enter}');
            expect(alertSpy).toHaveBeenCalledWith(
                'Apple Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
            );
        });

        test('disabled buttons do not trigger onClick handlers', async () => {
            const user = userEvent.setup();
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

            render(<ExpressPayments {...createDefaultProps({ disabled: true })} />);

            const applePayButton = screen.getByRole('button', { name: 'Apple Pay' });
            expect(applePayButton).toBeDisabled();

            // Try to click disabled button
            await user.click(applePayButton);
            expect(alertSpy).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        beforeEach(() => {
            // Mock window.alert for all edge case tests
            vi.spyOn(window, 'alert').mockImplementation(() => {});
        });

        test('renders successfully with minimal props', () => {
            render(<ExpressPayments />);

            // Component should render without errors
            expect(screen.getByRole('button', { name: 'Apple Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Google Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Amazon Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'PayPal' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Venmo' })).toBeInTheDocument();
        });

        test('handles rapid button clicks', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const applePayButton = screen.getByRole('button', { name: 'Apple Pay' });
            const googlePayButton = screen.getByRole('button', { name: 'Google Pay' });

            // Rapid clicks
            await user.click(applePayButton);
            await user.click(googlePayButton);
            await user.click(applePayButton);

            expect(window.alert).toHaveBeenCalledTimes(3);
        });

        test('maintains button order in DOM', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const buttons = container.querySelectorAll('button');
            const buttonLabels = Array.from(buttons).map((btn) => btn.getAttribute('aria-label'));

            expect(buttonLabels).toEqual(['Google Pay', 'Apple Pay', 'PayPal', 'Venmo', 'Amazon Pay']);
        });

        test('renders with all optional props undefined', () => {
            render(<ExpressPayments />);

            // Should render all buttons
            expect(screen.getByRole('button', { name: 'Apple Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Google Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Amazon Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'PayPal' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Venmo' })).toBeInTheDocument();
        });

        test('handles onClick errors gracefully', async () => {
            const user = userEvent.setup();
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            render(<ExpressPayments {...createDefaultProps()} />);

            const applePayButton = screen.getByRole('button', { name: 'Apple Pay' });

            // Click should trigger alert (component's internal behavior)
            await user.click(applePayButton);
            expect(window.alert).toHaveBeenCalledWith(
                'Apple Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
            );

            // Cleanup
            consoleErrorSpy.mockRestore();
        });

        test('handles rapid sequential clicks on same button', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const applePayButton = screen.getByRole('button', { name: 'Apple Pay' });

            // Rapid clicks
            await user.click(applePayButton);
            await user.click(applePayButton);
            await user.click(applePayButton);

            expect(window.alert).toHaveBeenCalledTimes(3);
        });

        test('handles rapid clicks on different buttons', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const applePayButton = screen.getByRole('button', { name: 'Apple Pay' });
            const googlePayButton = screen.getByRole('button', { name: 'Google Pay' });
            const payPalButton = screen.getByRole('button', { name: 'PayPal' });

            // Rapid clicks on different buttons
            await user.click(applePayButton);
            await user.click(googlePayButton);
            await user.click(payPalButton);
            await user.click(applePayButton);

            expect(window.alert).toHaveBeenCalledTimes(4);
        });
    });

    describe('Component lifecycle and re-renders', () => {
        test('maintains button state across re-renders', () => {
            const { rerender } = render(<ExpressPayments {...createDefaultProps()} />);

            expect(screen.getByRole('button', { name: 'Apple Pay' })).toBeInTheDocument();

            // Re-render with same props
            rerender(<ExpressPayments {...createDefaultProps()} />);

            expect(screen.getByRole('button', { name: 'Apple Pay' })).toBeInTheDocument();
        });

        test('updates disabled state on prop change', () => {
            const { rerender } = render(<ExpressPayments {...createDefaultProps({ disabled: false })} />);

            let buttons = screen.getAllByRole('button');
            buttons.forEach((button) => {
                expect(button).not.toBeDisabled();
            });

            // Update to disabled
            rerender(<ExpressPayments {...createDefaultProps({ disabled: true })} />);

            buttons = screen.getAllByRole('button');
            buttons.forEach((button) => {
                expect(button).toBeDisabled();
            });
        });

        test('updates layout prop correctly', () => {
            const { container, rerender } = render(
                <ExpressPayments {...createDefaultProps({ layout: 'horizontal' })} />
            );

            let gridContainer = container.querySelector('.grid');
            expect(gridContainer).toHaveClass('grid-cols-2');
            expect(gridContainer).toHaveClass('lg:grid-cols-5');

            // Change to vertical
            rerender(<ExpressPayments {...createDefaultProps({ layout: 'vertical' })} />);

            gridContainer = container.querySelector('.grid');
            expect(gridContainer).toHaveClass('grid-cols-1');
            expect(gridContainer).not.toHaveClass('grid-cols-2');
        });

        test('updates separator position prop correctly', () => {
            const { container, rerender } = render(
                <ExpressPayments {...createDefaultProps({ separatorPosition: 'bottom' })} />
            );

            const gridContainer = container.querySelector('.grid');
            const separator = container.querySelector('.relative.flex.items-center');

            // Separator should come after grid
            expect(gridContainer && separator).toBeTruthy();
            if (gridContainer && separator) {
                expect(gridContainer.compareDocumentPosition(separator)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
            }

            // Change to top
            rerender(<ExpressPayments {...createDefaultProps({ separatorPosition: 'top' })} />);

            const gridContainer2 = container.querySelector('.grid');
            const separator2 = container.querySelector('.relative.flex.items-center');

            // Separator should come before grid
            expect(gridContainer2 && separator2).toBeTruthy();
            if (gridContainer2 && separator2) {
                expect(gridContainer2.compareDocumentPosition(separator2)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
            }
        });

        test('updates separator text prop correctly', () => {
            const { rerender } = render(
                <ExpressPayments {...createDefaultProps({ separatorText: 'or continue below' })} />
            );

            expect(screen.getByText('or continue below')).toBeInTheDocument();

            rerender(<ExpressPayments {...createDefaultProps({ separatorText: 'Or continue with' })} />);

            expect(screen.getByText('Or continue with')).toBeInTheDocument();
            expect(screen.queryByText('or continue below')).not.toBeInTheDocument();
        });
    });

    describe('Accessibility enhancements', () => {
        test('all buttons are focusable when enabled', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            const buttons = screen.getAllByRole('button');
            buttons.forEach((button) => {
                expect(button).not.toHaveAttribute('tabindex', '-1');
            });
        });

        test('disabled buttons are not focusable via keyboard', () => {
            render(<ExpressPayments {...createDefaultProps({ disabled: true })} />);

            const buttons = screen.getAllByRole('button');
            buttons.forEach((button) => {
                expect(button).toBeDisabled();
                // Disabled buttons should not be focusable
                expect(button).toHaveAttribute('disabled');
            });
        });

        test('buttons have proper ARIA labels for screen readers', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            expect(screen.getByRole('button', { name: 'Apple Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Google Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Amazon Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'PayPal' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Venmo' })).toBeInTheDocument();
        });
    });

    describe('Logo Components', () => {
        describe('ApplePayLogo', () => {
            test('renders with correct src and alt text', () => {
                render(<ApplePayLogo />);
                const image = screen.getByAltText('Apple Pay');
                expect(image).toBeInTheDocument();
                expect(image).toHaveAttribute('src');
            });

            test('applies custom className', () => {
                render(<ApplePayLogo className="custom-class" />);
                const image = screen.getByAltText('Apple Pay');
                expect(image).toHaveClass('custom-class');
                expect(image).toHaveClass('h-4');
                expect(image).toHaveClass('w-auto');
            });

            test('has white logo styling (brightness and invert filter)', () => {
                render(<ApplePayLogo />);
                const image = screen.getByAltText('Apple Pay');
                expect(image).toHaveClass('object-contain');
                expect(image.style.filter).toBe('brightness(0) invert(1)');
            });
        });

        describe('GooglePayLogo', () => {
            test('renders with correct src and alt text', () => {
                render(<GooglePayLogo />);
                const image = screen.getByAltText('Google Pay');
                expect(image).toBeInTheDocument();
                expect(image).toHaveAttribute('src');
            });

            test('applies custom className', () => {
                render(<GooglePayLogo className="custom-class" />);
                const image = screen.getByAltText('Google Pay');
                expect(image).toHaveClass('custom-class');
                expect(image).toHaveClass('h-4');
                expect(image).toHaveClass('w-auto');
            });

            test('has correct styling', () => {
                render(<GooglePayLogo />);
                const image = screen.getByAltText('Google Pay');
                expect(image).toHaveClass('object-contain');
            });
        });

        describe('PayPalLogo', () => {
            test('renders with correct src and alt text', () => {
                render(<PayPalLogo />);
                const image = screen.getByAltText('PayPal');
                expect(image).toBeInTheDocument();
                expect(image).toHaveAttribute('src');
            });

            test('applies custom className', () => {
                render(<PayPalLogo className="custom-class" />);
                const image = screen.getByAltText('PayPal');
                expect(image).toHaveClass('custom-class');
                expect(image).toHaveClass('h-4');
                expect(image).toHaveClass('w-auto');
            });

            test('has correct styling', () => {
                render(<PayPalLogo />);
                const image = screen.getByAltText('PayPal');
                expect(image).toHaveClass('object-contain');
            });
        });

        describe('VenmoLogo', () => {
            test('renders with correct src and alt text', () => {
                render(<VenmoLogo />);
                const image = screen.getByAltText('Venmo');
                expect(image).toBeInTheDocument();
                expect(image).toHaveAttribute('src');
            });

            test('applies custom className', () => {
                render(<VenmoLogo className="custom-class" />);
                const image = screen.getByAltText('Venmo');
                expect(image).toHaveClass('custom-class');
                expect(image).toHaveClass('h-3');
                expect(image).toHaveClass('w-auto');
            });

            test('has correct styling', () => {
                render(<VenmoLogo />);
                const image = screen.getByAltText('Venmo');
                expect(image).toHaveClass('object-contain');
            });
        });
    });

    describe('Static Button Components', () => {
        describe('StaticPayPalButton', () => {
            test('renders the PayPal button', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toBeInTheDocument();
            });

            test('calls onClick when clicked', async () => {
                const user = userEvent.setup();
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                await user.click(button);

                expect(onClick).toHaveBeenCalledTimes(1);
            });

            test('renders PayPal logo', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button', { name: 'PayPal' });
                const logo = button.querySelector('img');
                expect(logo).toBeTruthy();
                expect(logo).toHaveAttribute('src');
            });

            test('is disabled when disabled prop is true', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} disabled={true} />);

                const button = screen.getByRole('button');
                expect(button).toBeDisabled();
            });

            test('is not disabled by default', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).not.toBeDisabled();
            });

            test('has PayPal gold background color', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('bg-[var(--paypal-gold)]');
            });

            test('has correct button styling', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('w-full');
                expect(button).toHaveClass('h-9');
            });

            test('has aria-label for accessibility', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button', { name: 'PayPal' });
                expect(button).toBeInTheDocument();
            });

            test('does not call onClick when disabled', async () => {
                const user = userEvent.setup();
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} disabled={true} />);

                const button = screen.getByRole('button');
                await user.click(button);

                expect(onClick).not.toHaveBeenCalled();
            });

            test('has hover state styling', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('hover:bg-[#FFB800]');
            });

            test('has transition classes for smooth interactions', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('transition-colors');
            });

            test('has correct text color', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('text-[#1F2937]');
            });
        });

        describe('StaticVenmoButton', () => {
            test('renders the Venmo button', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toBeInTheDocument();
            });

            test('calls onClick when clicked', async () => {
                const user = userEvent.setup();
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                await user.click(button);

                expect(onClick).toHaveBeenCalledTimes(1);
            });

            test('renders Venmo logo', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button', { name: 'Venmo' });
                const logo = button.querySelector('img');
                expect(logo).toBeTruthy();
                expect(logo).toHaveAttribute('src');
            });

            test('is disabled when disabled prop is true', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} disabled={true} />);

                const button = screen.getByRole('button');
                expect(button).toBeDisabled();
            });

            test('is not disabled by default', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).not.toBeDisabled();
            });

            test('has Venmo blue background color', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('bg-[var(--venmo-blue)]');
            });

            test('has correct button styling', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('w-full');
                expect(button).toHaveClass('h-9');
            });

            test('has aria-label for accessibility', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button', { name: 'Venmo' });
                expect(button).toBeInTheDocument();
            });

            test('does not call onClick when disabled', async () => {
                const user = userEvent.setup();
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} disabled={true} />);

                const button = screen.getByRole('button');
                await user.click(button);

                expect(onClick).not.toHaveBeenCalled();
            });

            test('has hover state styling', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('hover:bg-[#0077D9]');
            });

            test('has transition classes for smooth interactions', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('transition-colors');
            });

            test('has correct text color', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('text-background');
            });
        });
    });
});
