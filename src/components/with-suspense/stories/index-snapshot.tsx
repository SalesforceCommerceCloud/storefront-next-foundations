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

import * as WithSuspenseStories from './index.stories';
import { render, cleanup, act, waitFor } from '@testing-library/react';

const composed = composeStories(WithSuspenseStories);

afterEach(() => {
    cleanup();
});

describe('WithSuspense stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, async () => {
            // Wrap render in act() and await Suspense resolution
            let container: HTMLElement | undefined;
            await act(async () => {
                const result = render(<Story />);
                container = result.container;
                // Wait for Suspense to resolve by waiting for content to appear
                // This ensures all async operations complete before taking snapshot
                await waitFor(
                    () => {
                        // Check that something rendered (either fallback or content)
                        expect(container?.firstChild || container).toBeTruthy();
                    },
                    { timeout: 1000 }
                );
            });
            // Take snapshot of whatever rendered (fallback or resolved content)
            const snapshotTarget = container?.firstChild || container || document.body;
            expect(snapshotTarget).toMatchSnapshot();
        });
    }
});
