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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import EmptyLayout from './_empty';

describe('_empty.tsx - Empty Layout Route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render child content via Outlet without any wrapper elements', async () => {
        const Stub = createRoutesStub([
            {
                id: 'root',
                path: '/',
                Component: EmptyLayout,
                children: [
                    {
                        index: true,
                        Component: () => <div data-testid="child-content">Login Page Content</div>,
                    },
                ],
            },
        ]);

        render(<Stub initialEntries={['/']} />);

        await waitFor(() => {
            // Verify child content is rendered
            expect(screen.getByTestId('child-content')).toBeInTheDocument();
            expect(screen.getByText('Login Page Content')).toBeInTheDocument();
        });
    });

    it('should NOT render Header or Footer', async () => {
        const Stub = createRoutesStub([
            {
                id: 'root',
                path: '/',
                Component: EmptyLayout,
                children: [
                    {
                        index: true,
                        Component: () => <div data-testid="content">Content</div>,
                    },
                ],
            },
        ]);

        render(<Stub initialEntries={['/']} />);

        await waitFor(() => {
            expect(screen.getByTestId('content')).toBeInTheDocument();
        });

        // Verify no header or footer elements
        expect(screen.queryByRole('header')).not.toBeInTheDocument();
        expect(screen.queryByTestId('header')).not.toBeInTheDocument();
        expect(screen.queryByRole('footer')).not.toBeInTheDocument();
        expect(screen.queryByTestId('footer')).not.toBeInTheDocument();
    });

    it('should render multiple nested routes correctly', async () => {
        const Stub = createRoutesStub([
            {
                id: 'root',
                path: '/',
                Component: EmptyLayout,
                children: [
                    {
                        path: 'login',
                        Component: () => <div data-testid="login-page">Login</div>,
                    },
                    {
                        path: 'signup',
                        Component: () => <div data-testid="signup-page">Signup</div>,
                    },
                ],
            },
        ]);

        // Test login route
        const { unmount } = render(<Stub initialEntries={['/login']} />);
        await waitFor(() => {
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
        });
        unmount();

        // Test signup route
        render(<Stub initialEntries={['/signup']} />);
        await waitFor(() => {
            expect(screen.getByTestId('signup-page')).toBeInTheDocument();
        });
    });

    it('should provide a minimal DOM structure', async () => {
        const Stub = createRoutesStub([
            {
                id: 'root',
                path: '/',
                Component: EmptyLayout,
                children: [
                    {
                        index: true,
                        Component: () => <span data-testid="minimal-content">Minimal</span>,
                    },
                ],
            },
        ]);

        render(<Stub initialEntries={['/']} />);

        await waitFor(() => {
            // The empty layout should add minimal DOM overhead
            // Child content should be directly accessible
            const content = screen.getByTestId('minimal-content');
            expect(content).toBeInTheDocument();
        });

        const main = screen.getByRole('main');
        expect(main).toBeInTheDocument();
        expect(main.classList).toHaveLength(0);
    });
});
