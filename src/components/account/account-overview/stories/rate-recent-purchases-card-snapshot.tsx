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
import { expect, test, describe, afterEach } from 'vitest';
import { composeStories } from '@storybook/react-vite';
import { render, cleanup } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import * as RateRecentPurchasesCardStories from './rate-recent-purchases-card.stories';

const composed = composeStories(RateRecentPurchasesCardStories);

afterEach(() => {
    cleanup();
});

describe('RateRecentPurchasesCard stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        if (Story?.parameters?.snapshot === false) continue;
        test(`${storyName} story renders and matches snapshot`, () => {
            // Snapshot tests run via composeStories without the global preview
            // decorators, so they need their own router. The story-level
            // ConfigWrapper + SiteProvider come through composeStories.
            const router = createMemoryRouter([{ path: '/', element: <Story /> }], { initialEntries: ['/'] });
            const { container } = render(<RouterProvider router={router} />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
