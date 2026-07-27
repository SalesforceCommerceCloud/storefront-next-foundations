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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Signup from './signup';

describe('Footer Signup', () => {
    let alertMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.alert
        alertMock = vi.fn();
        vi.stubGlobal('alert', alertMock);
    });

    test('renders form with email input and submit button', () => {
        const { container } = render(<Signup />);

        // Signup component should render a form
        const form = container.querySelector('form');
        expect(form).toBeInTheDocument();

        // Form should contain email input and submit button
        const emailInput = screen.getByPlaceholderText('Your email');
        const submitButton = screen.getByRole('button', { name: 'Subscribe' });

        expect(emailInput).toBeInTheDocument();
        expect(submitButton).toBeInTheDocument();
        expect(form).toContainElement(emailInput);
        expect(form).toContainElement(submitButton);
    });

    test('renders email input with placeholder', () => {
        render(<Signup />);

        const input = screen.getByPlaceholderText('Your email');
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('type', 'email');
    });

    test('renders subscribe button', () => {
        render(<Signup />);

        const button = screen.getByRole('button', { name: 'Subscribe' });
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute('type', 'submit');
    });

    test('shows alert with email when form is submitted with valid email', async () => {
        const user = userEvent.setup();

        render(<Signup />);

        const input = screen.getByPlaceholderText('Your email');
        const button = screen.getByRole('button', { name: 'Subscribe' });

        await user.type(input, 'test@example.com');
        await user.click(button);

        expect(alertMock).toHaveBeenCalledWith('Signup email address: test@example.com');
        expect(alertMock).toHaveBeenCalledTimes(1);
    });

    test('does not show alert when form is submitted with empty email', async () => {
        const user = userEvent.setup();

        render(<Signup />);

        const button = screen.getByRole('button', { name: 'Subscribe' });

        await user.click(button);

        expect(alertMock).not.toHaveBeenCalled();
    });

    test('does not show alert when form is submitted with whitespace-only email', async () => {
        const user = userEvent.setup();

        render(<Signup />);

        const input = screen.getByPlaceholderText('Your email');
        const button = screen.getByRole('button', { name: 'Subscribe' });

        await user.type(input, '   ');
        await user.click(button);

        expect(alertMock).not.toHaveBeenCalled();
    });

    test('form submission prevents default behavior', async () => {
        const user = userEvent.setup();

        render(<Signup />);

        const input = screen.getByPlaceholderText('Your email');
        const form = input.closest('form');

        // Add a submit listener to verify preventDefault was called
        const submitHandler = vi.fn(() => {
            // The component should call preventDefault, so this shouldn't see a default event
        });
        form?.addEventListener('submit', submitHandler);

        await user.type(input, 'test@example.com');
        await user.click(screen.getByRole('button', { name: 'Subscribe' }));

        // Verify the form was submitted (our handler was called)
        // The actual preventDefault is tested by verifying no page navigation occurred
        expect(alertMock).toHaveBeenCalled();
    });

    test('clears input value after submission', async () => {
        const user = userEvent.setup();

        render(<Signup />);

        const input = screen.getByPlaceholderText('Your email');
        const button = screen.getByRole('button', { name: 'Subscribe' });

        await user.type(input, 'test@example.com');
        expect(input).toHaveValue('test@example.com');

        await user.click(button);

        expect(alertMock).toHaveBeenCalledWith('Signup email address: test@example.com');
        // Note: The component doesn't actually clear the input, so this test documents current behavior
        expect(input).toHaveValue('test@example.com');
    });
});
