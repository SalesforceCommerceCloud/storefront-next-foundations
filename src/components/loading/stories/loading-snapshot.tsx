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

import * as LoadingStories from './index.stories';
import { render, cleanup } from '@testing-library/react';

// Snapshot tests render stories outside the Storybook memory-router. The
// stories use `useNavigation()` (Loading itself) and `useNavigate()` (the
// NavigateOnMount harness in the active story); both are stubbed here so
// the snapshot captures the deterministic idle DOM. Other react-router
// exports come through unchanged via importOriginal.
vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>();
    return {
        ...actual,
        useNavigation: () => ({ state: 'idle', location: undefined }),
        useNavigate: () => () => undefined,
    };
});

const composed = composeStories(LoadingStories);

afterEach(() => {
    cleanup();
});

describe('Loading stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
