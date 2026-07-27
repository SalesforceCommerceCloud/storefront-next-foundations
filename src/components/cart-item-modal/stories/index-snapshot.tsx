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
import { composeStories } from '@storybook/react-vite';
import { render, cleanup } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import * as CartItemModalStories from './index.stories';

const fetcherMock = {
    data: null,
    state: 'idle' as const,
    submit: () => {},
    load: vi.fn(),
    Form: (props: React.PropsWithChildren<Record<string, unknown>>) => <form {...props}>{props.children}</form>,
};

// Partial mock — keep RouterProvider/createMemoryRouter real, only override
// the data hooks (Pattern 2). Full-replacement mocks render <RouterProvider>
// children to null.
vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>();
    return {
        ...actual,
        useFetcher: () => fetcherMock,
        useFetchers: () => [],
        useNavigation: () => ({ state: 'idle' as const, location: undefined }),
    };
});

vi.mock('@/hooks/use-scapi-fetcher', () => ({
    useScapiFetcher: () => fetcherMock,
}));

const composed = composeStories(CartItemModalStories);

afterEach(() => {
    cleanup();
});

describe('CartItemModal stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const router = createMemoryRouter([{ path: '/', element: <Story /> }], { initialEntries: ['/'] });
            const { container } = render(<RouterProvider router={router} />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
