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

import googlePayLogo from '/images/google-pay-logo.svg';
import { useTranslation } from 'react-i18next';

/**
 * @feature-stub Express checkout buttons (Google Pay logo)
 * @status stub — no backend integration
 *
 * Google Pay logo matching SDK button appearance.
 * Part of the express-payments stub. See docs/README-FEATURE-STUBS.md.
 */
export default function GooglePayLogo({
    className,
    decorative = false,
}: {
    className?: string;
    /** When true, image is hidden from the accessibility tree (use inside a button that has aria-label). */
    decorative?: boolean;
}) {
    const { t } = useTranslation('checkout');
    const label = t('expressPayments.googlePayLabel') || 'Google Pay';
    return (
        <img
            src={googlePayLogo}
            alt={decorative ? '' : label}
            width="41"
            height="16"
            {...(decorative ? { 'aria-hidden': true } : {})}
            className={`${className || ''} h-4 w-auto object-contain`}
        />
    );
}
