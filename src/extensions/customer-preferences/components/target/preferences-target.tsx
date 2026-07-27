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
/** @sfdc-extension-file SFDC_EXT_CUSTOMER_PREFERENCES */
import { Suspense, lazy, type ReactElement } from 'react';
import { Await } from 'react-router';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InterestsPreferencesSectionSkeleton } from '@/extensions/customer-preferences/components/interests-preferences-section/skeleton';
import { useCustomerPreferences } from '@/extensions/customer-preferences/context/customer-preferences-context';
import type { CustomerPreferencesData } from '@/extensions/customer-preferences/lib/api/customer-preferences.server';

const InterestsPreferencesSection = lazy(() =>
    import('@/extensions/customer-preferences/components/interests-preferences-section').then((m) => ({
        default: m.InterestsPreferencesSection,
    }))
);

/**
 * UITarget wrapper for the interests & preferences section on the account
 * details page.
 *
 * Reads the deferred Promise from the `CustomerPreferencesProvider` context
 * and streams the section into a `<Suspense>` boundary with a matching
 * skeleton fallback. Renders nothing when the provider is not mounted
 * (e.g., when the extension is uninstalled and the route markers were stripped).
 */
export default function PreferencesTarget(): ReactElement | null {
    const customerPreferencesPromise = useCustomerPreferences();

    if (!customerPreferencesPromise) {
        return null;
    }

    return (
        <Suspense fallback={<InterestsPreferencesSectionSkeleton />}>
            <Await resolve={customerPreferencesPromise} errorElement={<InterestsPreferencesSectionError />}>
                {(initialData: CustomerPreferencesData) => <InterestsPreferencesSection initialData={initialData} />}
            </Await>
        </Suspense>
    );
}

/**
 * Section-scoped error UI rendered when the deferred preferences Promise
 * rejects. Keeps the failure isolated to this section instead of bubbling
 * up to the route's ErrorBoundary and crashing the rest of the account page.
 */
function InterestsPreferencesSectionError(): ReactElement {
    const { t } = useTranslation('extCustomerPreferences');
    return (
        <Card data-testid="interests-preferences-section-error" className="bg-card border-border">
            <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold">{t('interestsPreferences.title')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{t('interestsPreferences.loadError')}</p>
            </CardContent>
        </Card>
    );
}
