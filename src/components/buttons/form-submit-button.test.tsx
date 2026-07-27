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
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { FormSubmitButton } from './form-submit-button';

// Mock react-router
const mockNavigation = {
    state: 'idle' as 'idle' | 'submitting' | 'loading',
};

vi.mock('react-router', () => ({
    href: (path: string) => path,
    useNavigation: () => mockNavigation,
}));

describe('FormSubmitButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset to default state
        mockNavigation.state = 'idle';
    });

    test('renders default text when not submitting', () => {
        render(<FormSubmitButton defaultText="Submit" submittingText="Submitting..." />);

        const button = screen.getByRole('button', { name: 'Submit' });
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute('type', 'submit');
        expect(button).not.toBeDisabled();
    });

    test('shows submitting text and spinner when submitting', () => {
        mockNavigation.state = 'submitting';

        render(<FormSubmitButton defaultText="Submit" submittingText="Submitting..." />);

        const button = screen.getByRole('button');
        expect(button).toHaveTextContent('Submitting...');
        expect(button).toBeDisabled();
    });

    test('renders spinner element when submitting', () => {
        mockNavigation.state = 'submitting';

        const { container } = render(<FormSubmitButton defaultText="Submit" submittingText="Submitting..." />);

        // Check for spinner element by its className
        const spinner = container.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });

    test('button is disabled only when submitting', () => {
        const { rerender } = render(<FormSubmitButton defaultText="Submit" submittingText="Submitting..." />);

        let button = screen.getByRole('button');
        expect(button).not.toBeDisabled();

        // Change to submitting state
        mockNavigation.state = 'submitting';
        rerender(<FormSubmitButton defaultText="Submit" submittingText="Submitting..." />);

        button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });

    test('applies custom className', () => {
        render(<FormSubmitButton defaultText="Submit" submittingText="Submitting..." className="custom-class" />);

        const button = screen.getByRole('button');
        expect(button).toHaveClass('custom-class');
    });

    test('applies default className when none provided', () => {
        render(<FormSubmitButton defaultText="Submit" submittingText="Submitting..." />);

        const button = screen.getByRole('button');
        expect(button).toHaveClass('w-full');
    });

    test('button is disabled when disabled prop is true', () => {
        render(<FormSubmitButton defaultText="Submit" submittingText="Submitting..." disabled={true} />);

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });

    test('button is disabled when either disabled prop or submitting state is true', () => {
        mockNavigation.state = 'submitting';

        render(<FormSubmitButton defaultText="Submit" submittingText="Submitting..." disabled={true} />);

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });

    test('button is enabled when disabled prop is false and not submitting', () => {
        render(<FormSubmitButton defaultText="Submit" submittingText="Submitting..." disabled={false} />);

        const button = screen.getByRole('button');
        expect(button).not.toBeDisabled();
    });
});
