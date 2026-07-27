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
import { type ReactElement, useState, lazy, Suspense, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useSite } from '@salesforce/storefront-next-runtime/site-context';
import type { InfoModalData } from '@/components/info-modal/types';
import { formatCurrency } from '@/lib/currency';
import type { BuyNowPayLaterMessageData, BuyNowPayLaterLearnMoreData } from '@/extensions/bnpl/lib/api/bnpl.server';

const InfoModal = lazy(() => import('@/components/info-modal'));

export interface BuyNowPayLaterProps {
    messageData: BuyNowPayLaterMessageData;
    learnMoreData: BuyNowPayLaterLearnMoreData;
}

/**
 * @feature-stub Buy Now Pay Later
 * @status stub — no backend integration
 *
 * Inline installment message + learn-more modal rendered on the PDP. Data is
 * supplied by `lib/api/bnpl.server.ts` (mock fixtures by default). To go live,
 * swap the bodies of the two API functions to call your real BNPL provider —
 * this component does not need to change.
 */
export default function BuyNowPayLater({ messageData, learnMoreData }: BuyNowPayLaterProps): ReactElement {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { currency } = useSite();
    const { t, i18n } = useTranslation('extBnpl');

    const formattedInstallment = formatCurrency(messageData.amountPerPayment, i18n.language, currency);
    const formattedTotal = formatCurrency(learnMoreData.paymentSchedule.totalAmount, i18n.language, currency);

    const modalData = useMemo<InfoModalData>(
        () => ({
            type: 'payment-schedule',
            title: t('learnMore.title', { paymentCount: messageData.paymentCount }),
            description: t('learnMore.summary', {
                totalAmount: formattedTotal,
                paymentCount: messageData.paymentCount,
            }),
            paymentSchedule: {
                totalAmount: learnMoreData.paymentSchedule.totalAmount,
                numberOfPayments: learnMoreData.paymentSchedule.schedule.length,
                payments: learnMoreData.paymentSchedule.schedule.map((dueDate) => ({
                    amount: learnMoreData.paymentSchedule.amountPerPayment,
                    dueDate,
                })),
            },
            steps: learnMoreData.howItWorks.map((text, i) => ({ number: i + 1, text })),
            disclaimer: learnMoreData.disclosures,
        }),
        [t, messageData.paymentCount, formattedTotal, learnMoreData]
    );

    return (
        <>
            <div className="text-sm text-muted-foreground">
                <Trans
                    t={t}
                    i18nKey="inlineMessage"
                    values={{ paymentCount: messageData.paymentCount, installment: formattedInstallment }}
                    components={{ bold: <span className="font-bold text-foreground" /> }}
                />{' '}
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        setIsModalOpen(true);
                    }}
                    className="cursor-pointer font-normal text-primary hover:underline">
                    {t('learnMoreLabel')}
                </button>
            </div>
            {isModalOpen && (
                <Suspense fallback={null}>
                    <InfoModal open={isModalOpen} onOpenChange={setIsModalOpen} data={modalData} />
                </Suspense>
            )}
        </>
    );
}
