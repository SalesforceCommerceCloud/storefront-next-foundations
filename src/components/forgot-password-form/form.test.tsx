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
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode, ComponentProps } from 'react';
import { ForgotPasswordForm } from './form';

interface MockInputProps extends ComponentProps<'input'> {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// Mock React Router Form component
vi.mock('react-router', () => ({
    href: (path: string) => path,
    Form: ({ children, ...props }: { children: ReactNode; method?: string; className?: string }) => (
        <form {...props}>{children}</form>
    ),
}));

// Mock the Link component from @/components/link
vi.mock('@/components/link', () => ({
    Link: ({ children, to, ...props }: { children: ReactNode; to: string; className?: string }) => (
        <a href={to} {...props}>
            {children}
        </a>
    ),
}));

// Mock UI components
vi.mock('@/components/ui/input', () => ({
    Input: (props: MockInputProps) => <input {...props} />,
}));

vi.mock('@/components/buttons/form-submit-button', () => ({
    FormSubmitButton: ({ defaultText, submittingText }: { defaultText: string; submittingText: string }) => (
        <button type="submit" data-default-text={defaultText} data-submitting-text={submittingText}>
            {defaultText}
        </button>
    ),
}));

describe('ForgotPasswordForm', () => {
    describe('rendering', () => {
        it('should render email input field', () => {
            render(<ForgotPasswordForm />);

            const emailInput = screen.getByLabelText(/email/i);
            expect(emailInput).toBeInTheDocument();
            expect(emailInput).toHaveAttribute('type', 'email');
            expect(emailInput).toHaveAttribute('name', 'email');
            expect(emailInput).toHaveAttribute('required');
        });

        it('should render email input with correct attributes', () => {
            render(<ForgotPasswordForm />);

            const emailInput = screen.getByLabelText(/email/i);
            expect(emailInput).toHaveAttribute('autoComplete', 'email');
            expect(emailInput).toHaveAttribute('id', 'email');
        });

        it('should render submit button', () => {
            render(<ForgotPasswordForm />);

            const submitButton = screen.getByRole('button', { name: /reset password|send reset link/i });
            expect(submitButton).toBeInTheDocument();
            expect(submitButton).toHaveAttribute('type', 'submit');
        });

        it('should render form element', () => {
            const { container } = render(<ForgotPasswordForm />);

            const formElement = container.querySelector('form');
            expect(formElement).toBeInTheDocument();
            expect(formElement).toHaveAttribute('method', 'post');
        });

        it('should render back to login link', () => {
            render(<ForgotPasswordForm />);

            const loginLink = screen.getByRole('link', { name: /back to login|go back to login/i });
            expect(loginLink).toBeInTheDocument();
            expect(loginLink).toHaveAttribute('href', '/login');
        });
    });

    describe('error display', () => {
        it('should display error message when error prop is provided', () => {
            const errorMessage = 'Email is required';
            render(<ForgotPasswordForm error={errorMessage} />);

            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });

        it('should not display error message when error prop is not provided', () => {
            render(<ForgotPasswordForm />);

            // Check that no error container is rendered
            const errorElements = document.querySelectorAll('.bg-destructive\\/10');
            expect(errorElements.length).toBe(0);
        });

        it('should display error with correct styling', () => {
            const errorMessage = 'Something went wrong';
            render(<ForgotPasswordForm error={errorMessage} />);

            const errorElement = screen.getByText(errorMessage);
            const errorContainer = errorElement.closest('div');
            expect(errorContainer).toHaveClass('bg-destructive/10');
            expect(errorContainer).toHaveClass('border-destructive/20');
        });

        it('should handle empty error string', () => {
            render(<ForgotPasswordForm error="" />);

            // Empty error should not render error container
            const errorElements = document.querySelectorAll('.bg-destructive\\/10');
            expect(errorElements.length).toBe(0);
        });
    });

    describe('form structure', () => {
        it('should have correct form method', () => {
            const { container } = render(<ForgotPasswordForm />);

            const form = container.querySelector('form');
            expect(form).toHaveAttribute('method', 'post');
        });

        it('should wrap all elements in a form', () => {
            const { container } = render(<ForgotPasswordForm />);

            const form = container.querySelector('form');
            const emailInput = screen.getByLabelText(/email/i);
            const submitButton = screen.getByRole('button', { name: /reset password|send reset link/i });

            expect(form).toContainElement(emailInput);
            expect(form).toContainElement(submitButton);
        });

        it('should include link to login page', () => {
            render(<ForgotPasswordForm />);

            const loginLink = screen.getByRole('link', { name: /back to login|go back to login/i });
            expect(loginLink).toHaveAttribute('href', '/login');
        });
    });

    describe('email input', () => {
        it('should be required', () => {
            render(<ForgotPasswordForm />);

            const emailInput = screen.getByLabelText(/email/i);
            expect(emailInput).toHaveAttribute('required');
        });

        it('should have email type for proper validation', () => {
            render(<ForgotPasswordForm />);

            const emailInput = screen.getByLabelText(/email/i);
            expect(emailInput).toHaveAttribute('type', 'email');
        });

        it('should have autocomplete attribute', () => {
            render(<ForgotPasswordForm />);

            const emailInput = screen.getByLabelText(/email/i);
            expect(emailInput).toHaveAttribute('autoComplete', 'email');
        });
    });

    describe('submit button', () => {
        it('should render FormSubmitButton with correct props', () => {
            render(<ForgotPasswordForm />);

            const submitButton = screen.getByRole('button', { name: /reset password|send reset link/i });
            expect(submitButton).toHaveAttribute('type', 'submit');
        });

        it('should have default and submitting text', () => {
            render(<ForgotPasswordForm />);

            const submitButton = screen.getByRole('button', { name: /reset password|send reset link/i });
            expect(submitButton).toHaveAttribute('data-default-text');
            expect(submitButton).toHaveAttribute('data-submitting-text');
        });
    });

    describe('accessibility', () => {
        it('should have label associated with email input', () => {
            render(<ForgotPasswordForm />);

            const emailInput = screen.getByLabelText(/email/i);
            expect(emailInput).toBeInTheDocument();
        });

        it('should have proper form structure for screen readers', () => {
            const { container } = render(<ForgotPasswordForm />);

            const form = container.querySelector('form');
            const label = screen.getByText(/email/i);
            const input = screen.getByLabelText(/email/i);

            expect(form).toBeInTheDocument();
            expect(label).toBeInTheDocument();
            expect(input).toBeInTheDocument();
        });
    });

    describe('error handling edge cases', () => {
        it('should handle undefined error prop', () => {
            render(<ForgotPasswordForm error={undefined} />);

            const errorElements = document.querySelectorAll('.bg-destructive\\/10');
            expect(errorElements.length).toBe(0);
        });

        it('should handle long error messages', () => {
            const longError =
                'This is a very long error message that should still be displayed properly without breaking the layout or causing any issues';
            render(<ForgotPasswordForm error={longError} />);

            expect(screen.getByText(longError)).toBeInTheDocument();
        });

        it('should handle error messages with special characters', () => {
            const specialError = "Error: Can't process request! Try again...";
            render(<ForgotPasswordForm error={specialError} />);

            expect(screen.getByText(specialError)).toBeInTheDocument();
        });
    });
});
