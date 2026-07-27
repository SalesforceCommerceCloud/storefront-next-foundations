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

// Mock react-router hooks
vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>();
    return {
        ...actual,
        useRevalidator: () => ({
            revalidate: vi.fn(),
        }),
        useFetcher: () => ({
            data: null,
            state: 'idle',
            submit: vi.fn(),
            Form: (props: React.PropsWithChildren<Record<string, unknown>>) => <form {...props}>{props.children}</form>,
        }),
        useFetchers: () => [],
        useNavigate: () => vi.fn(),
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
    };
});

// Mock hooks
vi.mock('@/hooks/use-scapi-fetcher', () => ({
    useScapiFetcher: vi.fn(() => ({
        state: 'idle',
        submit: vi.fn(),
    })),
}));

vi.mock('@/hooks/use-scapi-fetcher-effect', () => ({
    useScapiFetcherEffect: vi.fn(),
}));

// Mock toast
vi.mock('@/components/toast', () => ({
    useToast: vi.fn(() => ({
        addToast: vi.fn(),
    })),
}));

import { composeStories } from '@storybook/react-vite';

import * as RemoveAddressConfirmationDialogStories from './index.stories';
import { render, cleanup } from '@testing-library/react';
const composed = composeStories(RemoveAddressConfirmationDialogStories);

afterEach(() => {
    cleanup();
});

describe('RemoveAddressConfirmationDialog stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        // Stories that opt out via `parameters: { snapshot: false }` are skipped —
        // typically because the visible DOM lives in a Radix portal that the
        // harness's `container.firstChild` capture would record as null.
        const optedOut = (Story as { parameters?: { snapshot?: boolean } }).parameters?.snapshot === false;
        const testFn = optedOut ? test.skip : test;
        testFn(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
