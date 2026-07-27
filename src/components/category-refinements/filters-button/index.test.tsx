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
import { userEvent } from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import FiltersButton from './index';

describe('FiltersButton', () => {
    test('renders filters button', () => {
        render(<FiltersButton onClick={() => {}} />);

        const button = screen.getByRole('button', { name: /filters/i });
        expect(button).toBeInTheDocument();
    });

    test('displays button text', () => {
        render(<FiltersButton onClick={() => {}} />);

        expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    test('displays icon', () => {
        render(<FiltersButton onClick={() => {}} />);

        const button = screen.getByRole('button', { name: /filters/i });
        // The icon is rendered as an SVG element
        const svg = button.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    test('calls onClick handler when clicked', async () => {
        const user = userEvent.setup();
        const handleClick = vi.fn();

        render(<FiltersButton onClick={handleClick} />);

        const button = screen.getByRole('button', { name: /filters/i });
        await user.click(button);

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('applies custom className', () => {
        render(<FiltersButton onClick={() => {}} className="custom-class" />);

        const button = screen.getByRole('button', { name: /filters/i });
        expect(button).toHaveClass('custom-class');
    });

    test('uses outline variant by default', () => {
        render(<FiltersButton onClick={() => {}} />);

        const button = screen.getByRole('button', { name: /filters/i });
        expect(button).toHaveClass('border');
        expect(button).toHaveClass('bg-background');
        expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    test('uses default variant when active', () => {
        render(<FiltersButton onClick={() => {}} isActive />);

        const button = screen.getByRole('button', { name: /filters/i });
        expect(button).toHaveClass('bg-primary');
        expect(button).toHaveClass('text-primary-foreground');
        expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    test('has proper aria-label', () => {
        render(<FiltersButton onClick={() => {}} />);

        const button = screen.getByRole('button', { name: 'Filters' });
        expect(button).toHaveAttribute('aria-label', 'Filters');
    });

    test('renders selected filters badge when count is greater than 0', () => {
        render(<FiltersButton onClick={() => {}} selectedFiltersCount={3} />);

        expect(screen.getByText('3')).toBeInTheDocument();
        const button = screen.getByRole('button', { name: /filters, 3 selected/i });
        expect(button).toHaveAttribute('aria-label', 'Filters, 3 selected');
    });

    test('does not render selected filters badge when count is 0', () => {
        render(<FiltersButton onClick={() => {}} selectedFiltersCount={0} />);

        expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
});
