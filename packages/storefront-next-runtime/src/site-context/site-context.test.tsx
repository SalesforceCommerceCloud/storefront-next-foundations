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
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SiteProvider, useSite } from './site-context';
import type { Site } from '../config/types';

const mockSite: Site = {
    id: 'RefArchGlobal',
    defaultCurrency: 'GBP',
    defaultLocale: 'en-GB',
    supportedCurrencies: ['EUR', 'GBP'],
    supportedLocales: [
        { id: 'en-GB', preferredCurrency: 'GBP' },
        { id: 'de-DE', preferredCurrency: 'EUR' },
    ],
};

const mockLocale =
    mockSite.supportedLocales.find((l) => l.id === mockSite.defaultLocale) ?? mockSite.supportedLocales[0];

function TestConsumer() {
    const value = useSite();
    return <div data-testid="result">{JSON.stringify(value)}</div>;
}

describe('SiteProvider / useSite', () => {
    afterEach(cleanup);

    it('throws when no provider is mounted', () => {
        expect(() => render(<TestConsumer />)).toThrow('useSite must be used within a SiteProvider');
    });

    it('provides site, locale, language, and currency to consumers', () => {
        const { getByTestId } = render(
            <SiteProvider site={mockSite} locale={mockLocale} language="en-GB" currency="GBP">
                <TestConsumer />
            </SiteProvider>
        );

        const result = JSON.parse(getByTestId('result').textContent ?? '');
        expect(result.site).toEqual(mockSite);
        expect(result.locale).toEqual(mockLocale);
        expect(result.language).toBe('en-GB');
        expect(result.currency).toBe('GBP');
    });
});
