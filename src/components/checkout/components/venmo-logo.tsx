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

import venmoLogo from '/images/venmo.svg';
import { useTranslation } from 'react-i18next';

/**
 * @feature-stub Express checkout buttons (Venmo logo)
 * @status stub — no backend integration
 *
 * Venmo wordmark logo matching SDK button appearance.
 * Part of the express-payments stub. See docs/README-FEATURE-STUBS.md.
 */
export default function VenmoLogo({
    className,
    decorative = false,
}: {
    className?: string;
    /** When true, image is hidden from the accessibility tree (use inside a button that has aria-label). */
    decorative?: boolean;
}) {
    const { t } = useTranslation('checkout');
    const label = t('expressPayments.venmoLabel') || 'Venmo';
    return (
        <img
            src={venmoLogo}
            alt={decorative ? '' : label}
            width="54"
            height="11"
            {...(decorative ? { 'aria-hidden': true } : {})}
            className={`${className || ''} h-3 w-auto object-contain`}
        />
    );
}
