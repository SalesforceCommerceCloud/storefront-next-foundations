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
import i18next, { type i18n } from 'i18next';
import { createContext, type RouterContextProvider } from 'react-router';

type I18nContextValue = {
    getLocale: () => string;
    getI18nextInstance: () => i18n;
};

// Internal context key — not exported. Use getTranslation() / getLocale() to read,
// and mockI18nContext() in tests to write.
export const i18nextContext = createContext<I18nContextValue | null>(null);

/**
 * Gets the i18next instance and translation function for non-component code.
 * Use `useTranslation` hook for React components. Mirrors the `getConfig`/`useConfig` pattern.
 */
export function getTranslation(context?: Readonly<RouterContextProvider>) {
    if (context && typeof window === 'undefined') {
        const i18nextData = context.get(i18nextContext);
        if (!i18nextData) {
            throw new Error('i18next data not found in context. Ensure i18next middleware runs before loaders.');
        }

        const i18nextInstance = i18nextData.getI18nextInstance();
        return {
            i18next: i18nextInstance,
            t: i18nextInstance.t,
        };
    }

    return {
        i18next,
        t: i18next.t,
    };
}

/**
 * Gets the active locale string from server context.
 * Returns undefined on the client (locale is on the document element or URL).
 */
export function getLocale(context: Readonly<RouterContextProvider>): string | undefined {
    return context.get(i18nextContext)?.getLocale();
}

/**
 * Sets up a mock i18n context on a RouterContextProvider for use in tests.
 * Replaces the need to import the internal i18nextContext key directly.
 */
export function mockI18nContext(
    contextProvider: RouterContextProvider,
    options: { locale?: string; instance?: i18n } = {}
): void {
    const { locale = 'en-GB', instance = i18next } = options;
    contextProvider.set(i18nextContext, {
        getLocale: () => locale,
        getI18nextInstance: () => instance,
    });
}
