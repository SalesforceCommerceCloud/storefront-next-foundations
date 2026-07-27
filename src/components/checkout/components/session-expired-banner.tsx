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
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from '@/components/link';
import { routes } from '@/route-paths';

interface SessionExpiredBannerProps {
    /** Path to return to after signing in. Defaults to the checkout path. */
    returnUrl?: string;
}

/**
 * Inline persistent banner shown when a mid-checkout action fails with an
 * auth/session-expired error. Prompts the shopper to sign in again with a
 * direct link back to checkout.
 */
export function SessionExpiredBanner({ returnUrl = routes.checkout }: SessionExpiredBannerProps) {
    const { t } = useTranslation('errors');
    const { t: tLogin } = useTranslation('login');

    const loginHref = `${routes.login}?returnUrl=${encodeURIComponent(returnUrl)}&error=session_expired`;

    return (
        <Alert variant="destructive" data-testid="session-expired-banner">
            <AlertCircle />
            <AlertDescription>
                {t('api.unauthorized')}{' '}
                <Link to={loginHref} className="font-medium underline underline-offset-2 hover:no-underline">
                    {tLogin('signIn')}
                </Link>
            </AlertDescription>
        </Alert>
    );
}
