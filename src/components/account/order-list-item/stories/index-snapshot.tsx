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
import * as React from 'react';
import { expect, test, describe, afterEach, vi } from 'vitest';
import { mockSiteObject } from '@/test-utils/config';

vi.mock('@/components/link', () => ({
    Link: (props: React.PropsWithChildren<{ to?: string; [key: string]: unknown }>) => {
        const { to, children, ...rest } = props ?? {};
        return (
            <a href={typeof to === 'string' ? to : undefined} {...rest}>
                {children}
            </a>
        );
    },
    NavLink: (props: React.PropsWithChildren<{ to?: string; [key: string]: unknown }>) => {
        const { to, children, ...rest } = props ?? {};
        return (
            <a href={typeof to === 'string' ? to : undefined} {...rest}>
                {children}
            </a>
        );
    },
}));

vi.mock('@/config', () => ({
    useConfig: () => ({}),
    getConfig: () => ({}),
    ConfigProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    getBadgeVariant: () => 'default',
}));

vi.mock('@/hooks/use-navigate', () => ({
    useNavigate: () => () => {},
}));

vi.mock('@/hooks/use-current-site-and-locale-ref', () => ({
    useCurrentSiteAndLocaleRef: () => ({ siteRef: mockSiteObject.id, localeRef: mockSiteObject.defaultLocale }),
}));

vi.mock('@salesforce/storefront-next-runtime/site-context', async (importOriginal) => {
    const actual = await importOriginal<object>();
    return {
        ...actual,
        useSite: vi.fn(() => ({
            site: {
                id: mockSiteObject.id,
                defaultLocale: mockSiteObject.defaultLocale,
                defaultCurrency: mockSiteObject.defaultCurrency,
                supportedLocales: [
                    { id: mockSiteObject.defaultLocale, preferredCurrency: mockSiteObject.defaultCurrency },
                ],
                supportedCurrencies: mockSiteObject.supportedCurrencies,
            },
            language: mockSiteObject.defaultLocale,
            currency: mockSiteObject.defaultCurrency,
        })),
    };
});

import { composeStories } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';

import * as OrderListItemStories from './index.stories';
import { render, cleanup } from '@testing-library/react';

const composed = composeStories(OrderListItemStories);

afterEach(() => {
    cleanup();
});

describe('OrderListItem stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        if (Story?.parameters?.snapshot === false) continue;
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(
                <MemoryRouter>
                    <Story />
                </MemoryRouter>
            );
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
