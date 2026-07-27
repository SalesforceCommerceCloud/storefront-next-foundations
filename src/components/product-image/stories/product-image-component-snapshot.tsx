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
import * as ProductImageStories from './product-image-component.stories';
import { composeStories } from '@storybook/react-vite';
import { render } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

// Mock mocks
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        useNavigate: vi.fn(),
        useLocation: vi.fn(),
        useResolvedPath: vi.fn(),
        useHref: vi.fn(),
        Link: ({ children, to, preventScrollReset: _preventScrollReset, ...props }: any) => (
            <a href={to} {...props}>
                {children}
            </a>
        ),
        NavLink: ({ children, to, preventScrollReset: _preventScrollReset, ...props }: any) => (
            <a href={to} {...props}>
                {children}
            </a>
        ),
    };
});

const { Default, ErrorFallback } = composeStories(ProductImageStories);

describe('ProductImage Snapshots', () => {
    test('Default snapshot', () => {
        const { container } = render(<Default />);
        expect(container).toMatchSnapshot();
    });

    test('ErrorFallback snapshot', () => {
        const { container } = render(<ErrorFallback />);
        expect(container).toMatchSnapshot();
    });
});
