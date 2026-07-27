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
import type { PaymentSchedule, PaymentScheduleModalData, StepInfo } from '@/components/info-modal/types';

// Shape mirrors the runtime payload built by
// `extensions/bnpl/components/buy-now-pay-later/index.tsx` — the only
// production caller that feeds `<PaymentScheduleModalContent>`. Each fixture
// matches the resolved `InfoModalData` shape (Pattern 16), not the wider type.

const installmentSchedule: PaymentSchedule = {
    totalAmount: 59.0,
    numberOfPayments: 4,
    payments: [
        { amount: 14.75, dueDate: 'Today' },
        { amount: 14.75, dueDate: '2 weeks' },
        { amount: 14.75, dueDate: '4 weeks' },
        { amount: 14.75, dueDate: '6 weeks' },
    ],
};

const installmentSteps: StepInfo[] = [
    { number: 1, text: 'Select payment method at checkout' },
    { number: 2, text: 'Choose Pay in 4' },
    { number: 3, text: 'Complete your purchase' },
    { number: 4, text: 'Pay over time, interest-free' },
];

const installmentDisclaimer = 'Subject to credit approval. Terms apply.';

/** Standard "Pay in 4" installment plan with full schedule + steps + disclaimer. */
export const basketWithInstallmentSchedule: PaymentScheduleModalData = {
    type: 'payment-schedule',
    title: 'Pay in 4',
    description: 'Split £59.00 into 4 interest-free payments.',
    paymentSchedule: installmentSchedule,
    steps: installmentSteps,
    disclaimer: installmentDisclaimer,
};

/** Single up-front payment — degenerate schedule, used to verify the timeline collapses to one dot. */
export const basketWithSinglePayment: PaymentScheduleModalData = {
    type: 'payment-schedule',
    title: 'Pay in full',
    description: 'Pay £100.00 today.',
    paymentSchedule: {
        totalAmount: 100.0,
        numberOfPayments: 1,
        payments: [{ amount: 100.0, dueDate: 'Today' }],
    },
    steps: installmentSteps,
    disclaimer: installmentDisclaimer,
};

/** Plan unavailable for this basket — only steps + disclaimer render, no schedule. */
export const basketWithUnavailableSchedule: PaymentScheduleModalData = {
    type: 'payment-schedule',
    title: 'Pay in 4 unavailable',
    description: 'Installments are not available for this basket.',
    steps: installmentSteps,
    disclaimer: installmentDisclaimer,
};
