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
import { afterEach, describe, expect, test, vi } from 'vitest';
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

vi.mock('@salesforce/storefront-next-runtime/site-context', () => ({
    useSite: () => null,
    buildUrl: ({ to }: { to: string }) => to,
    SiteProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { composeStories } from '@storybook/react-vite';
import { cleanup, render } from '@testing-library/react';
import * as ContactStories from './index.stories';

const composed = composeStories(ContactStories);

afterEach(() => {
    cleanup();
});

describe('Contact stories snapshot', () => {
    vi.mock('react-router', async (importOriginal) => {
        const actual = await importOriginal<typeof import('react-router')>();
        return {
            ...actual,
            Link: (props: React.ComponentProps<'a'> & { to?: string }) => (
                <a href={props.to ?? '#'} {...props}>
                    {props.children}
                </a>
            ),
            Form: (props: React.ComponentProps<'form'>) => <form {...props}>{props.children}</form>,
            useNavigate: () => vi.fn(),
            useLocation: () => ({
                pathname: '/',
                search: '',
                hash: '',
                state: null,
                key: 'default',
            }),
            useResolvedPath: () => ({ pathname: '/', search: '', hash: '' }),
            useHref: () => '/',
        };
    });

    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
