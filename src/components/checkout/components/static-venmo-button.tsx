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
import { Button } from '@/components/ui/button';
import VenmoLogo from './venmo-logo';
import { useTranslation } from 'react-i18next';

interface StaticVenmoButtonProps {
    onClick: () => void;
    disabled?: boolean;
}

/**
 * @feature-stub Express checkout buttons (Venmo)
 * @status stub — no backend integration
 *
 * Static Venmo button matching the official SDK appearance.
 * Part of the express-payments stub. See docs/README-FEATURE-STUBS.md.
 */
export default function StaticVenmoButton({ onClick, disabled = false }: StaticVenmoButtonProps) {
    const { t } = useTranslation('checkout');
    return (
        <Button
            onClick={onClick}
            disabled={disabled}
            className="w-full h-9 bg-[var(--venmo-blue)] hover:bg-[#0077D9] text-background border-0 flex items-center justify-center transition-colors"
            aria-label={t('expressPayments.venmoLabel') || 'Venmo'}>
            <VenmoLogo className="flex-shrink-0" decorative />
        </Button>
    );
}
