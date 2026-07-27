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

// Mock basket provider — render children directly so story decorators that pass a static
// basket fixture (e.g. CustomerProfileCheckoutWithDelivery) don't trigger BasketProvider's
// internal useFetcher, which requires a data router context that the snapshot test runner
// doesn't provide for nested decorators.
vi.mock('@/providers/basket', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/providers/basket')>();
    return {
        ...actual,
        default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        useBasket: vi.fn(() => undefined),
    };
});

import type React from 'react';

// BasketProvider calls useScapiFetcher → useFetcher during render. Without a data router in the
// test tree, useFetcher throws "must be used within a data router". Stub useFetcher to return an
// idle fetcher so the provider tree renders synchronously; load()/submit() are only invoked from
// callbacks, so vi.fn() suffices and useScapiFetcherEffect's idle-state guard short-circuits.
vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>();
    return {
        ...actual,
        useFetcher: () => ({
            data: undefined,
            state: 'idle' as const,
            submit: vi.fn(),
            load: vi.fn(),
            Form: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
        }),
    };
});

import { composeStories } from '@storybook/react-vite';

import * as CheckoutContextStories from './checkout-context.stories';
import { render, cleanup } from '@testing-library/react';

const composed = composeStories(CheckoutContextStories);

afterEach(() => {
    cleanup();
});

describe('CheckoutContext stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
