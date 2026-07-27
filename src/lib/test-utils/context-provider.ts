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
import { RouterContextProvider, type Cookie } from 'react-router';
import { authContext } from '@/middlewares/auth.utils';
import { type PerformanceTimer, performanceTimerContext } from '@/middlewares/performance-metrics';
import type { SessionData } from '@/lib/api/types';
import { appConfigContext } from '@salesforce/storefront-next-runtime/config';
import type { Config } from '@/types/config';
import config from '@/config/server';
import { mockI18nContext } from '@salesforce/storefront-next-runtime/i18n';
import { createMaintenance, maintenanceContext } from '@/lib/maintenance';
import { siteContext } from '@salesforce/storefront-next-runtime/site-context';
import i18next from 'i18next';

/**
 * Configuration options for creating a test context provider
 */
export interface TestContextConfig {
    /** Override the auth session data */
    authSession?: Partial<SessionData> | null;
    /** Override the performance timer context */
    performanceTimer?: unknown;
    /** Override the client class cache context */
    clientClassCache?: unknown;
    /** Override the app config context */
    appConfig?: Partial<Config['app']>;
    /** Whether to reject the auth promise (for testing auth failures) */
    rejectAuth?: boolean;
    /** Error to reject auth promise with */
    authError?: Error;
    /** Override the locale (defaults to 'en-GB') */
    locale?: string;
    /** Whether to skip setting up i18next context (for testing missing middleware scenarios) */
    skipI18next?: boolean;
    /** Override the currency (defaults to 'GBP') */
    currency?: string;
}

const ACCESS_TOKEN_VALIDITY_MS = 1800000; // 30 minutes

/**
 * Default session data for tests
 */
const DEFAULT_SESSION_DATA: SessionData = {
    accessToken: 'test-access-token',
    accessTokenExpiry: Date.now() + ACCESS_TOKEN_VALIDITY_MS,
    customerId: 'test-customer-id',
    userType: 'registered',
} as const;

/**
 * Creates a RouterContextProvider with all necessary contexts set up for testing.
 *
 * This helper eliminates the need to manually set up contexts in every test file.
 * All contexts are set with sensible defaults, and you can override specific values as needed.
 *
 * @param testConfig - Optional configuration to override default values
 * @returns A configured RouterContextProvider ready for testing
 *
 * @example
 * ```typescript
 * // Basic usage with defaults
 * const context = createTestContext();
 *
 * // Override auth session
 * const context = createTestContext({
 *   authSession: { userType: 'guest' }
 * });
 *
 * // Test auth failure
 * const context = createTestContext({
 *   rejectAuth: true,
 *   authError: new Error('Auth failed')
 * });
 *
 * // Disable auth (null session)
 * const context = createTestContext({
 *   authSession: null
 * });
 *
 * // Override locale
 * const context = createTestContext({
 *   locale: 'es-MX'
 * });
 *
 * // Skip i18next context (for testing missing middleware)
 * const context = createTestContext({
 *   skipI18next: true
 * });
 * ```
 */
export function createTestContext(testConfig: TestContextConfig = {}): Readonly<RouterContextProvider> {
    const {
        authSession = DEFAULT_SESSION_DATA,
        performanceTimer = undefined,
        appConfig,
        rejectAuth = false,
        authError = new Error('Auth failed'),
        locale = 'en-GB',
        skipI18next = false,
        currency = 'GBP',
    } = testConfig;

    const contextProvider = new RouterContextProvider();

    // Set up auth context
    if (rejectAuth) {
        contextProvider.set(authContext, {
            ref: Promise.reject(authError),
        });
    } else if (authSession === null) {
        contextProvider.set(authContext, {
            ref: Promise.resolve(undefined),
        });
    } else {
        const sessionData = { ...DEFAULT_SESSION_DATA, ...authSession };
        contextProvider.set(authContext, {
            ref: Promise.resolve(sessionData),
        });
    }

    // Set up performance timer context
    contextProvider.set(performanceTimerContext, performanceTimer as PerformanceTimer | undefined);

    // Set up app config context - merge with default config if overrides provided
    const mergedAppConfig = appConfig ? { ...config.app, ...appConfig } : config.app;
    contextProvider.set(appConfigContext, mergedAppConfig);

    if (!skipI18next) {
        mockI18nContext(contextProvider, { locale, instance: i18next });
    }

    // Set up site context (includes currency)
    const site = config.app.commerce.sites[0];
    const localeObj = site.supportedLocales.find((l: { id: string }) => l.id === locale) ?? {
        id: locale,
        preferredCurrency: currency,
    };
    contextProvider.set(siteContext, {
        site: { ...site, alias: 'global', name: site.id, supportedLocales: site.supportedLocales },
        locale: { ...localeObj },
        currency,
        siteCookie: { name: 'site_id' } as unknown as Cookie,
        localeCookie: { name: 'locale_id' } as unknown as Cookie,
        currencyCookie: { name: 'currency' } as unknown as Cookie,
    });

    // Set up maintenance context
    const maintenance = createMaintenance();
    contextProvider.set(maintenanceContext, maintenance);

    return contextProvider;
}
