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
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { User, LogOut } from 'lucide-react';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import { AccountNavItem } from './nav-item';

const mockNavItem = {
    path: '/account',
    icon: User,
    label: 'Account Details',
    disabled: false,
};

const createTestWrapper = (component: React.ReactElement, initialPath = '/account') => {
    const router = createMemoryRouter(
        [
            {
                path: '/account',
                element: <AllProvidersWrapper>{component}</AllProvidersWrapper>,
            },
        ],
        { initialEntries: [initialPath] }
    );
    return <RouterProvider router={router} />;
};

describe('<AccountNavItem />', () => {
    describe('Rendering with disabled false', () => {
        test('displays navigation item with correct label, link, and icon', () => {
            render(createTestWrapper(<AccountNavItem item={mockNavItem} />));
            const link = screen.getByRole('link', { name: 'Account Details' });
            expect(link).toBeInTheDocument();
            expect(link).toHaveAttribute('href', '/global/en-GB/account');
            expect(screen.getByTestId('Account Details-icon')).toBeInTheDocument();
            expect(screen.getAllByRole('link')).toHaveLength(1);
        });
    });

    describe('Rendering with disabled true', () => {
        test('renders as disabled div when disabled is true', () => {
            const disabledItem = { ...mockNavItem, disabled: true };
            render(createTestWrapper(<AccountNavItem item={disabledItem} />));

            const disabledElement = screen.getByRole('button', { name: 'Account Details' });
            expect(disabledElement).toBeInTheDocument();
            expect(disabledElement).toBeDisabled();
        });

        test('does not render as link when disabled', () => {
            const disabledItem = { ...mockNavItem, disabled: true };
            render(createTestWrapper(<AccountNavItem item={disabledItem} />));

            expect(screen.queryByRole('link')).not.toBeInTheDocument();
            expect(screen.getByRole('button')).toBeInTheDocument();
        });
    });

    describe('Mobile mode rendering', () => {
        test('renders with mobile classes when isMobile is true', () => {
            render(createTestWrapper(<AccountNavItem item={mockNavItem} isMobile={true} />));

            const link = screen.getByRole('link', { name: 'Account Details' });
            expect(link).toBeInTheDocument();
            expect(link).toHaveClass('border');
        });

        test('renders disabled state with mobile classes', () => {
            const disabledItem = { ...mockNavItem, disabled: true };
            render(createTestWrapper(<AccountNavItem item={disabledItem} isMobile={true} />));

            const disabledElement = screen.getByRole('button', { name: 'Account Details' });
            expect(disabledElement).toBeInTheDocument();
            expect(disabledElement).toHaveClass('border');
        });
    });

    describe('Logout form action', () => {
        const logoutItem = {
            path: '',
            icon: LogOut,
            label: 'Log Out',
            action: '/logout',
            method: 'post' as const,
        };

        test('renders logout button as form with correct action and method', () => {
            const { container } = render(createTestWrapper(<AccountNavItem item={logoutItem} />));

            const form = container.querySelector('form');
            expect(form).toBeInTheDocument();
            expect(form).toHaveAttribute('method', 'post');
            expect(form).toHaveAttribute('action', '/global/en-GB/logout');
            expect(form).toHaveClass('w-full');
        });

        test('renders logout button with correct label and icon', () => {
            render(createTestWrapper(<AccountNavItem item={logoutItem} />));

            const button = screen.getByRole('button', { name: 'Log Out' });
            expect(button).toBeInTheDocument();
            expect(button).toHaveAttribute('type', 'submit');
            expect(screen.getByTestId('Log Out-icon')).toBeInTheDocument();
        });

        test('logout button has correct styling classes', () => {
            render(createTestWrapper(<AccountNavItem item={logoutItem} />));

            const button = screen.getByRole('button', { name: 'Log Out' });
            expect(button).toHaveClass('w-full', 'px-3', 'py-2', 'text-left');
            expect(button).toHaveClass('text-sidebar-foreground');
        });

        test('logout button uses default POST method when method is not specified', () => {
            const logoutItemWithoutMethod = {
                ...logoutItem,
                method: undefined,
            };

            const { container } = render(createTestWrapper(<AccountNavItem item={logoutItemWithoutMethod as any} />));

            const form = container.querySelector('form');
            expect(form).toHaveAttribute('method', 'post');
        });

        test('logout button renders with mobile classes when isMobile is true', () => {
            render(createTestWrapper(<AccountNavItem item={logoutItem} isMobile={true} />));

            const button = screen.getByRole('button', { name: 'Log Out' });
            expect(button).toHaveClass('border');
        });

        test('logout button does not render as NavLink', () => {
            render(createTestWrapper(<AccountNavItem item={logoutItem} />));

            const links = screen.queryAllByRole('link');
            expect(links).toHaveLength(0);
        });

        test('logout form button has hover styles', () => {
            render(createTestWrapper(<AccountNavItem item={logoutItem} />));

            const button = screen.getByRole('button', { name: 'Log Out' });
            expect(button).toHaveClass('hover:text-sidebar-foreground', 'hover:bg-sidebar-accent');
        });
    });
});
