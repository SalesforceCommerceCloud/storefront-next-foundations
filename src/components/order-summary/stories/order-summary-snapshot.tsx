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
import { vi, expect, test, describe, afterEach } from 'vitest';
import type { AnchorHTMLAttributes, FormHTMLAttributes, ReactNode } from 'react';

const fetcherMock = {
    data: null as unknown,
    state: 'idle' as const,
    submit: vi.fn(),
    Form: (props: FormHTMLAttributes<HTMLFormElement> & { children?: ReactNode }) => (
        <form {...props}>{props.children}</form>
    ),
};

vi.mock('react-router', () => ({
    href: (path: string) => path,
    createContext: vi.fn().mockImplementation(() => ({})),
    useFetcher: () => fetcherMock,
    useFetchers: () => [],
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'test' }),
    useNavigation: () => ({
        state: 'idle',
        location: { pathname: '/', search: '', hash: '', state: null, key: 'test' },
    }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Link: (
        props: (AnchorHTMLAttributes<HTMLAnchorElement> & { to?: string; href?: string; children?: ReactNode }) | null
    ) => {
        const { to, href, children, ...rest } = (props ?? {}) as AnchorHTMLAttributes<HTMLAnchorElement> & {
            to?: string;
            href?: string;
            children?: ReactNode;
        };
        return (
            <a href={to ?? href} {...rest}>
                {children}
            </a>
        );
    },
}));
vi.mock('@/hooks/use-promo-code-actions', () => ({
    usePromoCodeActions: () => ({
        removePromoCode: vi.fn(),
        removeFetcher: fetcherMock,
        applyFetcher: fetcherMock,
    }),
}));
vi.mock('@/components/toast', () => ({
    useToast: () => ({ addToast: vi.fn() }),
}));

import { composeStories } from '@storybook/react-vite';

import * as OrderSummaryStories from './index.stories';
import { render, cleanup } from '@testing-library/react';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';

const composed = composeStories(OrderSummaryStories);

const wrapper = ({ children }: { children: ReactNode }) => (
    <ConfigProvider config={mockConfig}>{children}</ConfigProvider>
);

afterEach(() => {
    cleanup();
});

describe('OrderSummary stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        if (Story?.parameters?.snapshot === false || /interactiontests?/i.test(storyName)) continue;
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />, { wrapper });
            // Normalize dynamic Radix IDs so snapshots are stable across runs
            const root = container as unknown as HTMLElement;
            const attrs = ['id', 'aria-controls', 'aria-labelledby'];
            const sel = attrs.map((a) => `[${a}^="radix-"]`).join(',');
            root.querySelectorAll(sel).forEach((el) => {
                attrs.forEach((a) => {
                    const v = el.getAttribute(a);
                    if (v && v.startsWith('radix-')) el.setAttribute(a, 'radix-«x»');
                });
            });
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
