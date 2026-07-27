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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Payment from './payment';

vi.mock('@/providers/basket', () => ({ useBasket: vi.fn() }));
vi.mock('@/hooks/checkout/use-customer-profile', () => ({
    useCustomerProfile: vi.fn(() => null),
}));

const createMockBasket = (overrides = {}) => ({
    basketId: 'test-basket-123',
    currency: 'USD',
    customerInfo: { email: 'test@example.com', customerId: 'test-customer' },
    shipments: [
        {
            shipmentId: 'shipment-1',
            shippingAddress: {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                countryCode: 'US',
            },
        },
    ],
    paymentInstruments: [],
    ...overrides,
});

const createDefaultProps = (overrides = {}) => ({
    onSubmit: vi.fn(),
    isLoading: false,
    actionData: undefined,
    isCompleted: false,
    isEditing: true,
    onEdit: vi.fn(),
    ...overrides,
});

describe('Payment Integration Tests', () => {
    let useBasket: ReturnType<typeof vi.fn>;
    let useCustomerProfile: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        const basketModule = await import('@/providers/basket');
        const profileModule = await import('@/hooks/checkout/use-customer-profile');
        useBasket = basketModule.useBasket as ReturnType<typeof vi.fn>;
        useCustomerProfile = profileModule.useCustomerProfile as ReturnType<typeof vi.fn>;

        useBasket.mockReturnValue(createMockBasket());
        useCustomerProfile.mockReturnValue(null);
    });

    describe('Basic Rendering', () => {
        test('renders payment form in editing mode', () => {
            render(<Payment {...createDefaultProps()} />);

            expect(screen.getByText('Payment')).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/card number/i)).toBeInTheDocument();
            expect(screen.getByRole('textbox', { name: /cardholder name|name on card/i })).toBeInTheDocument();
        });
    });

    describe('Card Input Smoke Tests', () => {
        test('shows card type icon when card number is entered', async () => {
            const user = userEvent.setup();
            render(<Payment {...createDefaultProps()} />);

            const cardInput = screen.getByPlaceholderText(/card number/i);
            await user.type(cardInput, '4111111111111111');

            await waitFor(() => {
                const container = cardInput.closest('.relative');
                expect(container?.querySelector('[aria-hidden] svg')).toBeInTheDocument();
            });
        });

        test('formats card number with spaces', async () => {
            const user = userEvent.setup();
            render(<Payment {...createDefaultProps()} />);

            const cardInput = screen.getByPlaceholderText(/card number/i);
            await user.type(cardInput, '4111111111111111');

            await waitFor(() => {
                expect(cardInput).toHaveValue('4111 1111 1111 1111');
            });
        });

        test('formats expiry date with slash', async () => {
            const user = userEvent.setup();
            render(<Payment {...createDefaultProps()} />);

            const expiryInput = screen.getByPlaceholderText(/mm\/yy/i);
            await user.type(expiryInput, '1227');

            await waitFor(() => {
                expect(expiryInput).toHaveValue('12/27');
            });
        });
    });

    describe('Billing Address Toggle', () => {
        test('checkbox is unchecked by default (billing matches shipping)', () => {
            render(<Payment {...createDefaultProps()} />);

            const checkbox = screen.getByRole('checkbox', { name: /different billing address/i });
            expect(checkbox).not.toBeChecked();
            expect(screen.queryByRole('textbox', { name: /^first name$/i })).not.toBeInTheDocument();
        });

        test('shows billing address section when checkbox is checked', async () => {
            const user = userEvent.setup();
            render(<Payment {...createDefaultProps()} />);

            const checkbox = screen.getByRole('checkbox', { name: /different billing address/i });
            await user.click(checkbox);

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
            });
        });
    });

    describe('Billing Address Saved Address Dropdown', () => {
        const createProfileWithAddresses = (addressCount: number) => ({
            customer: { email: 'user@example.com' },
            addresses: Array.from({ length: addressCount }, (_, i) => ({
                addressId: `addr-${i + 1}`,
                firstName: `First${i + 1}`,
                lastName: `Last${i + 1}`,
                address1: `${100 + i} Test St`,
                city: `City${i + 1}`,
                stateCode: 'MA',
                postalCode: `0${1000 + i}`,
                countryCode: 'US',
                preferred: i === 0,
            })),
            paymentInstruments: [],
        });

        test('shows saved address dropdown with first address auto-selected when checkbox is checked', async () => {
            const user = userEvent.setup();
            useCustomerProfile.mockReturnValue(createProfileWithAddresses(2));
            render(<Payment {...createDefaultProps()} />);

            const checkbox = screen.getByRole('checkbox', { name: /different billing address/i });
            await user.click(checkbox);

            await waitFor(() => {
                expect(screen.getByText(/First1 Last1, 100 Test St, City1, MA, 01000/)).toBeInTheDocument();
            });
        });

        test('shows address form directly when no saved addresses', async () => {
            const user = userEvent.setup();
            useCustomerProfile.mockReturnValue({
                customer: { email: 'guest@example.com' },
                addresses: [],
                paymentInstruments: [],
            });
            render(<Payment {...createDefaultProps()} />);

            const checkbox = screen.getByRole('checkbox', { name: /different billing address/i });
            await user.click(checkbox);

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
            });
            expect(screen.queryByText(/select an address/i)).not.toBeInTheDocument();
        });

        test('populates billing fields when a different saved address is selected', async () => {
            const user = userEvent.setup();
            useCustomerProfile.mockReturnValue(createProfileWithAddresses(2));
            render(<Payment {...createDefaultProps()} />);

            const checkbox = screen.getByRole('checkbox', { name: /different billing address/i });
            await user.click(checkbox);

            // First address is auto-selected; open dropdown and pick the second one
            const trigger = await screen.findByText(/First1 Last1, 100 Test St, City1, MA, 01000/);
            await user.click(trigger);

            const option = await screen.findByText(/First2 Last2, 101 Test St, City2, MA, 01001/);
            await user.click(option);

            await waitFor(() => {
                expect(screen.getByText(/First2 Last2, 101 Test St, City2, MA, 01001/)).toBeInTheDocument();
            });
        });

        test('shows address form when "Add new address" is selected', async () => {
            const user = userEvent.setup();
            useCustomerProfile.mockReturnValue(createProfileWithAddresses(2));
            render(<Payment {...createDefaultProps()} />);

            const checkbox = screen.getByRole('checkbox', { name: /different billing address/i });
            await user.click(checkbox);

            // First address is auto-selected; open dropdown and pick "Add new address"
            const trigger = await screen.findByText(/First1 Last1, 100 Test St, City1, MA, 01000/);
            await user.click(trigger);

            const addNew = await screen.findByText(/\+ add new address/i);
            await user.click(addNew);

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
            });
        });

        test('clears billing fields when switching to "Add new address"', async () => {
            const user = userEvent.setup();
            useCustomerProfile.mockReturnValue(createProfileWithAddresses(2));
            render(<Payment {...createDefaultProps()} />);

            const checkbox = screen.getByRole('checkbox', { name: /different billing address/i });
            await user.click(checkbox);

            // First address is auto-selected; open dropdown and pick "Add new address"
            const trigger = await screen.findByText(/First1 Last1/);
            await user.click(trigger);
            const addNew = await screen.findByText(/\+ add new address/i);
            await user.click(addNew);

            await waitFor(() => {
                const firstNameInput = screen.getByPlaceholderText(/first name/i);
                expect(firstNameInput).toHaveValue('');
            });
        });

        test('hides billing section when checkbox is unchecked after being checked', async () => {
            const user = userEvent.setup();
            useCustomerProfile.mockReturnValue(createProfileWithAddresses(2));
            render(<Payment {...createDefaultProps()} />);

            const checkbox = screen.getByRole('checkbox', { name: /different billing address/i });
            await user.click(checkbox);
            await waitFor(() => {
                expect(screen.getByText(/First1 Last1, 100 Test St, City1, MA, 01000/)).toBeInTheDocument();
            });

            await user.click(checkbox);
            await waitFor(() => {
                expect(screen.queryByText(/First1 Last1, 100 Test St, City1, MA, 01000/)).not.toBeInTheDocument();
            });
        });

        test('shows check icon next to auto-selected address in dropdown', async () => {
            const user = userEvent.setup();
            useCustomerProfile.mockReturnValue(createProfileWithAddresses(2));
            render(<Payment {...createDefaultProps()} />);

            const checkbox = screen.getByRole('checkbox', { name: /different billing address/i });
            await user.click(checkbox);

            // First address is auto-selected; open dropdown to verify check icon
            const trigger = await screen.findByText(/First1 Last1/);
            await user.click(trigger);

            await waitFor(() => {
                const buttons = screen.getAllByRole('button');
                const selectedButton = buttons.find((b) => b.textContent?.includes('First1 Last1'));
                expect(selectedButton?.querySelector('svg')).toBeInTheDocument();
            });
        });
    });

    describe('Save payment to profile checkbox', () => {
        test('shows save payment checkbox when customer is logged in and entering new card', () => {
            const profileWithCustomerId = {
                customer: { email: 'test@example.com', customerId: 'cust-123' },
                addresses: [],
                paymentInstruments: [],
            };
            useCustomerProfile.mockReturnValue(profileWithCustomerId);

            render(<Payment {...createDefaultProps()} />);

            expect(
                screen.getByRole('checkbox', { name: /save this payment|savePaymentToProfile|future use/i })
            ).toBeInTheDocument();
        });

        test('does not show save payment checkbox when guest has no customer profile', () => {
            useCustomerProfile.mockReturnValue(null);

            render(<Payment {...createDefaultProps()} />);

            expect(
                screen.queryByRole('checkbox', { name: /save this payment|savePaymentToProfile|future use/i })
            ).not.toBeInTheDocument();
        });

        test('does not show save payment checkbox when hidePaymentSaveCheckbox is true', () => {
            const profileWithCustomerId = {
                customer: { email: 'test@example.com', customerId: 'cust-123' },
                addresses: [],
                paymentInstruments: [],
            };
            useCustomerProfile.mockReturnValue(profileWithCustomerId);

            render(<Payment {...createDefaultProps({ hidePaymentSaveCheckbox: true })} />);

            expect(
                screen.queryByRole('checkbox', { name: /save this payment|savePaymentToProfile|future use/i })
            ).not.toBeInTheDocument();
        });

        test('save payment checkbox can be toggled when visible', async () => {
            const user = userEvent.setup();
            const profileWithCustomerId = {
                customer: { email: 'test@example.com', customerId: 'cust-123' },
                addresses: [],
                paymentInstruments: [],
            };
            useCustomerProfile.mockReturnValue(profileWithCustomerId);

            render(<Payment {...createDefaultProps()} />);

            const checkbox = screen.getByRole('checkbox', {
                name: /save this payment|savePaymentToProfile|future use/i,
            });
            expect(checkbox).not.toBeChecked();

            await user.click(checkbox);

            await waitFor(() => {
                expect(checkbox).toBeChecked();
            });

            await user.click(checkbox);

            await waitFor(() => {
                expect(checkbox).not.toBeChecked();
            });
        });
    });

    describe('Saved Payment Methods with Real Hooks', () => {
        test('renders saved payment methods when profile has them', () => {
            const profileWithPayments = {
                customer: { email: 'test@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card-1',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Visa',
                            maskedNumber: '**** **** **** 1234',
                            holder: 'John Doe',
                            expirationMonth: 12,
                            expirationYear: 2027,
                        },
                        preferred: true,
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(profileWithPayments);

            render(<Payment {...createDefaultProps()} />);

            expect(screen.getByRole('radio', { name: /visa/i })).toBeInTheDocument();
            expect(screen.getByText(/ending in.*1234/i)).toBeInTheDocument();
        });

        test('auto-selects preferred payment method', async () => {
            const profileWithPreferred = {
                customer: { email: 'test@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card-1',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Visa',
                            maskedNumber: '**** 1234',
                        },
                        preferred: true,
                    },
                    {
                        paymentInstrumentId: 'card-2',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Mastercard',
                            maskedNumber: '**** 5678',
                        },
                        preferred: false,
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(profileWithPreferred);

            render(<Payment {...createDefaultProps()} />);

            await waitFor(() => {
                const preferredRadio = document.getElementById('card-1') as HTMLInputElement;
                expect(preferredRadio).toBeTruthy();
                expect(preferredRadio?.getAttribute('aria-checked')).toBe('true');
            });
        });
    });

    describe('Form Submission with Real Hooks', () => {
        test('calls onSubmit with new card data including all form fields', async () => {
            const user = userEvent.setup();
            const handleSubmit = vi.fn();
            const { container } = render(<Payment {...createDefaultProps({ onSubmit: handleSubmit })} />);

            await user.type(screen.getByPlaceholderText(/card number/i), '4111111111111111');
            await user.type(screen.getByRole('textbox', { name: /name on card/i }), 'John Doe');
            await user.type(screen.getByPlaceholderText(/mm\/yy/i), '1227');
            await user.type(screen.getByPlaceholderText(/cvv/i), '123');

            const form = container.querySelector('form');
            form?.requestSubmit();

            await waitFor(() => {
                expect(handleSubmit).toHaveBeenCalledTimes(1);
            });

            const submittedData = handleSubmit.mock.calls[0][0];
            expect(submittedData.useSavedPaymentMethod).toBe(false);
            expect(submittedData.selectedSavedPaymentMethod).toBeUndefined();
            expect(submittedData.cardNumber).toBe('4111 1111 1111 1111');
            expect(submittedData.cardholderName).toBe('John Doe');
            expect(submittedData.expiryDate).toBe('12/27');
            expect(submittedData.cvv).toBe('123');
        });
    });

    describe('Default Values with useMemo', () => {
        test('initializes with billing same as shipping by default', () => {
            render(<Payment {...createDefaultProps()} />);

            const checkbox = screen.getByRole('checkbox', { name: /different billing address/i });
            expect(checkbox).not.toBeChecked();
        });
    });

    describe('Edge Cases - Saved Payment Methods', () => {
        test('auto-selects first saved payment method when profile has saved cards', () => {
            const mockProfile = {
                customer: { email: 'alice@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'saved-1',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            holder: 'Alice Johnson',
                            cardType: 'Visa',
                            maskedNumber: '************1234',
                        },
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(mockProfile);

            render(<Payment {...createDefaultProps()} />);

            expect(screen.getByText('Visa')).toBeInTheDocument();
        });

        test('handles saved payment method without holder name and auto-selects it', async () => {
            const mockProfile = {
                customer: { email: 'test@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'saved-no-holder',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Mastercard',
                            maskedNumber: '************5678',
                        },
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(mockProfile);

            render(<Payment {...createDefaultProps()} />);

            expect(screen.getByText('Mastercard')).toBeInTheDocument();
            await waitFor(() => {
                const radio = document.getElementById('saved-no-holder') as HTMLInputElement;
                expect(radio?.getAttribute('aria-checked')).toBe('true');
            });
        });

        test('defaults to new payment method when saved methods are missing ids', async () => {
            const mockProfile = {
                customer: { email: 'ghost@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        // Intentionally omit paymentInstrumentId so helper would normally generate one.
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            holder: 'Ghost User',
                            cardType: 'Visa',
                        },
                        preferred: true,
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(mockProfile);
            const customerProfileUtils = await import('@/lib/customer/profile-utils');
            const spy = vi.spyOn(customerProfileUtils, 'getPaymentMethodsFromCustomer').mockReturnValue([
                {
                    id: '', // Simulate corrupted data with missing id
                    type: 'CREDIT_CARD',
                    cardType: 'Visa',
                    maskedNumber: '**** 9999',
                    preferred: true,
                },
            ]);

            try {
                render(<Payment {...createDefaultProps()} />);

                await waitFor(() => {
                    // "Add new" option is labeled "Credit Card" (payment.creditCardOption)
                    const addNewRadio = screen.getByRole('radio', { name: /credit card/i });
                    expect(addNewRadio).toHaveAttribute('aria-checked', 'true');
                });
            } finally {
                spy.mockRestore();
            }
        });

        test('switches "new" selection to preferred saved method after profile hydration', async () => {
            let profile: any = null;
            useCustomerProfile.mockImplementation(() => profile);

            const { rerender } = render(<Payment {...createDefaultProps()} />);

            // Initial bootstrap state before saved methods arrive.
            const newCardRadio = document.getElementById('credit-card-option');
            expect(newCardRadio).toBeTruthy();
            expect(newCardRadio?.getAttribute('aria-checked')).toBe('true');

            profile = {
                customer: { email: 'hydrated@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'saved-preferred',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Visa',
                            maskedNumber: '************1111',
                        },
                        preferred: true,
                    },
                    {
                        paymentInstrumentId: 'saved-secondary',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Mastercard',
                            maskedNumber: '************2222',
                        },
                        preferred: false,
                    },
                ],
            };

            rerender(<Payment {...createDefaultProps()} />);

            await waitFor(() => {
                // After hydration, the preferred saved card should become selected automatically.
                expect(screen.getByRole('radio', { name: /visa/i })).toHaveAttribute('aria-checked', 'true');
            });
        });

        test('preserves distinct billing address on initial load when billing differs from shipping', async () => {
            const basketWithDistinctBilling = createMockBasket({
                billingAddress: {
                    firstName: 'Jane',
                    lastName: 'Shopper',
                    address1: '456 Billing Ave',
                    city: 'Los Angeles',
                    stateCode: 'CA',
                    postalCode: '90001',
                    countryCode: 'US',
                },
            });

            useBasket.mockReturnValue(basketWithDistinctBilling);

            render(<Payment {...createDefaultProps({ showUseDifferentBilling: true })} />);

            await waitFor(() => {
                // "Use a different billing address" should be selected when basket has distinct billing.
                expect(screen.getByRole('checkbox', { name: /different billing address/i })).toBeChecked();
            });

            // Billing form should show pre-existing billing values (not cleared on mount).
            expect(screen.getByRole('textbox', { name: /first name/i })).toHaveValue('Jane');
            expect(screen.getByRole('textbox', { name: /last name/i })).toHaveValue('Shopper');
            expect(screen.getByRole('textbox', { name: /address line 1/i })).toHaveValue('456 Billing Ave');
        });
    });

    describe('View All (n more) / View less', () => {
        const createProfileWithSavedCards = (count: number) => ({
            customer: { email: 'user@example.com' },
            addresses: [],
            paymentInstruments: Array.from({ length: count }, (_, i) => ({
                paymentInstrumentId: `card-${i + 1}`,
                paymentMethodId: 'CREDIT_CARD',
                paymentCard: {
                    holder: `Cardholder ${i + 1}`,
                    cardType: 'Visa',
                    maskedNumber: `************${String(1000 + i).slice(-4)}`,
                },
            })),
        });

        test('shows "View all (n more)" when more than 3 payment options', async () => {
            useCustomerProfile.mockReturnValue(createProfileWithSavedCards(5));
            render(<Payment {...createDefaultProps()} />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /view all \(\d+ more\)/i })).toBeInTheDocument();
            });
        });

        test('clicking "View all (n more)" expands options and shows "view less"', async () => {
            const user = userEvent.setup();
            useCustomerProfile.mockReturnValue(createProfileWithSavedCards(5));
            render(<Payment {...createDefaultProps()} />);

            const viewAllButton = await screen.findByRole('button', { name: /view all \(\d+ more\)/i });
            await user.click(viewAllButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /view less/i })).toBeInTheDocument();
            });
            expect(screen.queryByRole('button', { name: /view all \(\d+ more\)/i })).not.toBeInTheDocument();
        });

        test('clicking "View less" collapses options and shows "View all (n more)" again', async () => {
            Element.prototype.scrollIntoView = vi.fn();
            const user = userEvent.setup();
            useCustomerProfile.mockReturnValue(createProfileWithSavedCards(5));
            render(<Payment {...createDefaultProps()} />);

            const viewAllButton = await screen.findByRole('button', { name: /view all \(\d+ more\)/i });
            await user.click(viewAllButton);

            const viewLessButton = await screen.findByRole('button', { name: /view less/i });
            await user.click(viewLessButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /view all \(\d+ more\)/i })).toBeInTheDocument();
            });
            expect(screen.queryByRole('button', { name: /view less/i })).not.toBeInTheDocument();
        });

        test('does not show "View all" or "View less" when 3 or fewer payment options (e.g. 2 saved + new)', () => {
            useCustomerProfile.mockReturnValue(createProfileWithSavedCards(2));
            render(<Payment {...createDefaultProps()} />);

            expect(screen.queryByRole('button', { name: /view all \(\d+ more\)/i })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /view less/i })).not.toBeInTheDocument();
        });
    });

    describe('Edge Cases - Field Errors', () => {
        test('displays field-level validation errors from server', () => {
            const actionDataWithErrors = {
                success: false,
                fieldErrors: {
                    cardNumber: 'Invalid card number',
                    expiryDate: 'Card has expired',
                },
            };

            render(<Payment {...createDefaultProps({ actionData: actionDataWithErrors })} />);

            expect(screen.getByText('Invalid card number')).toBeInTheDocument();
            expect(screen.getByText('Card has expired')).toBeInTheDocument();
        });

        test('handles multiple field errors simultaneously', () => {
            const actionDataWithMultipleErrors = {
                success: false,
                fieldErrors: {
                    cardNumber: 'Card number is required',
                    cardholderName: 'Cardholder name is required',
                    expiryDate: 'Expiry date is required',
                    cvv: 'CVV is required',
                },
            };

            render(<Payment {...createDefaultProps({ actionData: actionDataWithMultipleErrors })} />);

            expect(screen.getByText('Card number is required')).toBeInTheDocument();
            expect(screen.getByText('Cardholder name is required')).toBeInTheDocument();
            expect(screen.getByText('Expiry date is required')).toBeInTheDocument();
            expect(screen.getByText('CVV is required')).toBeInTheDocument();
        });
    });

    describe('Edge Cases - Billing Address Comparison', () => {
        test('displays no payment method message in summary when no payment instruments', () => {
            const basketWithDifferentBilling = createMockBasket({
                billingAddress: {
                    firstName: 'Alice',
                    lastName: 'Smith',
                    address1: '456 Oak Ave',
                    city: 'Boston',
                    stateCode: 'MA',
                    postalCode: '02101',
                    countryCode: 'US',
                },
            });

            useBasket.mockReturnValue(basketWithDifferentBilling);

            render(<Payment {...createDefaultProps({ isCompleted: true, isEditing: false })} />);

            expect(screen.getByText(/no payment method saved/i)).toBeInTheDocument();
        });

        test('displays card details and billing same as shipping in summary when payment exists', () => {
            const basketWithPayment = createMockBasket({
                paymentInstruments: [
                    {
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Visa',
                            maskedNumber: '************1234',
                            numberLastDigits: '1234',
                            expirationMonth: 12,
                            expirationYear: 2027,
                        },
                    },
                ],
                billingAddress: {
                    firstName: 'John',
                    lastName: 'Doe',
                    address1: '123 Main St',
                    city: 'New York',
                    stateCode: 'NY',
                    postalCode: '10001',
                    countryCode: 'US',
                },
            });

            useBasket.mockReturnValue(basketWithPayment);

            render(<Payment {...createDefaultProps({ isCompleted: true, isEditing: false })} />);

            expect(screen.getByText(/1234/)).toBeInTheDocument();
            expect(screen.getByText(/12\/27/)).toBeInTheDocument();
            expect(screen.getByText(/billing.*same as shipping/i)).toBeInTheDocument();
        });

        test('handles missing billing address in comparison', () => {
            const basketWithoutBilling = createMockBasket({
                billingAddress: undefined,
            });

            useBasket.mockReturnValue(basketWithoutBilling);

            render(<Payment {...createDefaultProps({ isCompleted: true, isEditing: false })} />);

            expect(screen.getByText(/^Payment$/)).toBeInTheDocument();
        });

        test('handles null shipping address in billing comparison', () => {
            const basketWithNullShipping = createMockBasket({
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: null,
                    },
                ],
                billingAddress: {
                    firstName: 'Alice',
                    lastName: 'Smith',
                    address1: '456 Oak Ave',
                    city: 'Boston',
                    stateCode: 'MA',
                    postalCode: '02101',
                    countryCode: 'US',
                },
            });

            useBasket.mockReturnValue(basketWithNullShipping);

            render(<Payment {...createDefaultProps({ isCompleted: true, isEditing: false })} />);

            expect(screen.getByText(/^Payment$/)).toBeInTheDocument();
        });
    });

    describe('Edge Cases - Saved Payment Rendering', () => {
        test('auto-selects first payment when no preferred method exists', async () => {
            const mockProfile = {
                customer: { email: 'test@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card-1',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Visa',
                            maskedNumber: '************1234',
                        },
                        preferred: false,
                    },
                    {
                        paymentInstrumentId: 'card-2',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Mastercard',
                            maskedNumber: '************5678',
                        },
                        preferred: false,
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(mockProfile);

            render(<Payment {...createDefaultProps()} />);

            await waitFor(() => {
                const firstRadio = document.getElementById('card-1') as HTMLInputElement;
                expect(firstRadio?.getAttribute('aria-checked')).toBe('true');
            });
        });

        test('submits with saved payment method selection', async () => {
            const mockProfile = {
                customer: { email: 'test@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'saved-card',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Visa',
                            maskedNumber: '************1234',
                            holder: 'John Doe',
                        },
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(mockProfile);

            const handleSubmit = vi.fn();
            render(<Payment {...createDefaultProps({ onSubmit: handleSubmit })} />);

            await waitFor(() => {
                const savedRadio = document.getElementById('saved-card') as HTMLInputElement;
                expect(savedRadio?.getAttribute('aria-checked')).toBe('true');
            });

            const form = document.querySelector('form');
            form?.requestSubmit();

            await waitFor(() => {
                expect(handleSubmit).toHaveBeenCalledTimes(1);
            });

            const submittedData = handleSubmit.mock.calls[0][0];
            expect(submittedData.useSavedPaymentMethod).toBe(true);
            expect(submittedData.selectedSavedPaymentMethod).toBe('saved-card');
        });
    });
});
