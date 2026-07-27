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
import type React from 'react';

vi.mock('react-router', () => ({
    href: (path: string) => path,
    createContext: vi.fn().mockImplementation(() => ({})),
    useFetcher: () => ({
        data: null,
        state: 'idle',

        submit: () => {},
        Form: (props: React.PropsWithChildren<Record<string, unknown>>) => <form {...props}>{props.children}</form>,
    }),
    useFetchers: () => [],

    useNavigate: () => () => {},
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'test' }),
    useNavigation: () => ({
        state: 'idle',
        location: { pathname: '/', search: '', hash: '', state: null, key: 'test' },
    }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Link: (props: React.PropsWithChildren<{ to?: string; href?: string; [key: string]: unknown }>) => {
        const { to, href, children, ...rest } = props ?? {};
        return (
            <a href={to ?? href} {...rest}>
                {children}
            </a>
        );
    },
    createMemoryRouter: vi.fn(),
    RouterProvider: ({ router }: { router: { routes: unknown[] } }) => <div>{router.routes[0]?.element || null}</div>,
}));

import { composeStories } from '@storybook/react-vite';

import * as MyCartStories from './index.stories';
import { render, cleanup } from '@testing-library/react';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';
import type { ReactNode } from 'react';

const composed = composeStories(MyCartStories);

const wrapper = ({ children }: { children: ReactNode }) => (
    <ConfigProvider config={mockConfig}>{children}</ConfigProvider>
);

afterEach(() => {
    cleanup();
});

describe('MyCart stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
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
