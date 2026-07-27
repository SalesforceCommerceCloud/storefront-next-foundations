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

import type { ReactElement } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import type { CartInventoryIssue } from '@/lib/cart/inventory-validation';

interface CartInventoryErrorBannerProps {
    issues: CartInventoryIssue[];
    className?: string;
    id?: string;
}

/**
 * Displays a global error banner when cart items exceed available inventory.
 * Shows a friendly message prompting users to adjust quantities or remove items.
 *
 * @param issues - Array of cart items exceeding inventory
 * @param className - Optional CSS classes
 * @param id - ID for ARIA linking. Use distinct IDs when rendering multiple banners
 *             (e.g., 'cart-inventory-error-mobile' and 'cart-inventory-error-desktop')
 * @returns Alert component or null if no issues
 */
export function CartInventoryErrorBanner({
    issues,
    className,
    id = 'cart-inventory-error',
}: CartInventoryErrorBannerProps): ReactElement | null {
    const { t } = useTranslation('cart');

    if (issues.length === 0) return null;

    return (
        <Alert variant="destructive" className={className} id={id} role="alert" aria-live="polite">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t('inventory.blockMessage')}</AlertDescription>
        </Alert>
    );
}
