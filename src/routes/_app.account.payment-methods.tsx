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
import { type ReactElement, Suspense } from 'react';
import { useOutletContext, Await } from 'react-router';
import type { ShopperCustomers } from '@/scapi';
import { AccountPaymentMethodsSkeleton, PaymentMethods } from '@/components/payment-methods';
import { SeoMeta } from '@/components/seo-meta';
import { useTranslation } from 'react-i18next';

type AccountLayoutContext = {
    customer: Promise<ShopperCustomers.schemas['Customer'] | null>;
};

/**
 * Payment methods page route
 */
export default function PaymentMethodsRoute(): ReactElement {
    const { t } = useTranslation('account');
    const { customer: customerPromise } = useOutletContext<AccountLayoutContext>();

    return (
        <>
            <SeoMeta title={t('meta.paymentMethodsTitle', { defaultValue: 'Payment Methods' })} noIndex />
            <Suspense fallback={<AccountPaymentMethodsSkeleton />}>
                <Await resolve={customerPromise}>
                    {(customer: ShopperCustomers.schemas['Customer'] | null) => <PaymentMethods customer={customer} />}
                </Await>
            </Suspense>
        </>
    );
}
