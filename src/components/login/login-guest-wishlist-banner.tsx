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
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface LoginGuestWishlistBannerProps {
    /** Number of items in the guest wishlist. Banner only renders when count > 0. */
    count: number;
}

/**
 * Sign-in nudge shown above the login form when a guest has saved items waiting to merge.
 * The login loader populates `count` from `captureGuestWishlistSnapshot`; failure falls
 * through as 0 so a SCAPI outage cannot block sign-in.
 *
 * Reuses the same i18n string as the empty wishlist guest CTA (`account:wishlist.guestEmptySignInPrompt`).
 */
export const LoginGuestWishlistBanner = ({ count }: LoginGuestWishlistBannerProps) => {
    const { t } = useTranslation('account');
    if (count <= 0) {
        return null;
    }
    return (
        <Alert>
            <AlertDescription>{t('wishlist.guestEmptySignInPrompt')}</AlertDescription>
        </Alert>
    );
};

export default LoginGuestWishlistBanner;
