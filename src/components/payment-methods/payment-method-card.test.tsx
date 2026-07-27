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
import { describe, test, expect, vi } from 'vitest';
import { PaymentMethodCard, type PaymentMethod } from './payment-method-card';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

const { t } = getTranslation();

describe('PaymentMethodCard', () => {
    const mockPaymentMethod: PaymentMethod = {
        id: '1',
        type: 'visa',
        last4: '4242',
        expiryMonth: '12',
        expiryYear: '2026',
        cardholderName: 'John Doe',
        isDefault: false,
    };

    test('renders payment method card with card details', () => {
        render(<PaymentMethodCard paymentMethod={mockPaymentMethod} />);

        expect(screen.getByText(/4242/)).toBeInTheDocument();
        expect(screen.getByText(/12\/2026/)).toBeInTheDocument();
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    test('displays default badge when isDefault is true', () => {
        const defaultPayment = { ...mockPaymentMethod, isDefault: true };
        render(<PaymentMethodCard paymentMethod={defaultPayment} />);

        expect(screen.getByText(t('account:paymentMethods.default'))).toBeInTheDocument();
    });

    test('calls onRemove when remove button is clicked', async () => {
        const user = userEvent.setup();
        const onRemove = vi.fn();
        render(<PaymentMethodCard paymentMethod={mockPaymentMethod} onRemove={onRemove} />);

        await user.click(screen.getByText(t('account:paymentMethods.remove')));
        expect(onRemove).toHaveBeenCalledTimes(1);
    });

    test('calls onSetDefault when set default button is clicked', async () => {
        const user = userEvent.setup();
        const onSetDefault = vi.fn();
        render(<PaymentMethodCard paymentMethod={mockPaymentMethod} onSetDefault={onSetDefault} />);

        await user.click(screen.getByText(t('account:paymentMethods.setDefault')));
        expect(onSetDefault).toHaveBeenCalledTimes(1);
    });

    test('disables set default button when card is already default', () => {
        const defaultPayment = { ...mockPaymentMethod, isDefault: true };
        render(<PaymentMethodCard paymentMethod={defaultPayment} />);

        const setDefaultButton = screen.getByText(t('account:paymentMethods.setDefault'));
        expect(setDefaultButton.closest('button')).toBeDisabled();
    });
});
