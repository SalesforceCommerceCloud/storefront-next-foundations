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
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { PaymentSubmissionRef } from '@/hooks/use-checkout-actions';
import { PaymentSubmissionRefProvider, usePaymentSubmissionRef } from './payment-submission-context';

const buildRef = (): PaymentSubmissionRef =>
    ({
        current: {
            formDataGetter: null,
            shouldPlaceOrderAfterPayment: false,
            options: null,
            setFormErrors: null,
            onPlaceOrder: null,
        },
    }) as PaymentSubmissionRef;

describe('PaymentSubmissionRefContext', () => {
    it('returns the provided ref to descendants', () => {
        const ref = buildRef();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <PaymentSubmissionRefProvider refValue={ref}>{children}</PaymentSubmissionRefProvider>
        );
        const { result } = renderHook(() => usePaymentSubmissionRef(), { wrapper });
        expect(result.current).toBe(ref);
    });

    it('lets a descendant register onPlaceOrder so the storefront click handler reads it', () => {
        const ref = buildRef();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <PaymentSubmissionRefProvider refValue={ref}>{children}</PaymentSubmissionRefProvider>
        );
        const { result } = renderHook(() => usePaymentSubmissionRef(), { wrapper });
        const onPlaceOrder = vi.fn();
        result.current.current.onPlaceOrder = onPlaceOrder;
        expect(ref.current.onPlaceOrder).toBe(onPlaceOrder);
    });

    it('throws when used outside the provider so misuses fail loudly', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderHook(() => usePaymentSubmissionRef())).toThrow(/PaymentSubmissionRefProvider/);
        consoleError.mockRestore();
    });
});
