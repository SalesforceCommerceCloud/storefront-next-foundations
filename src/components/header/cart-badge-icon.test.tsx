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
import { describe, expect, test } from 'vitest';
import CartBadgeIcon from './cart-badge-icon';

describe('CartBadgeIcon', () => {
    describe('rendering', () => {
        test('renders shopping cart icon', () => {
            const { container } = render(<CartBadgeIcon numberOfItems={5} />);

            // ShoppingCart icon from lucide-react should be present
            const icon = container.querySelector('svg');
            expect(icon).toBeInTheDocument();
            expect(icon).toHaveClass('size-5');
        });

        test('renders badge with number of items', () => {
            render(<CartBadgeIcon numberOfItems={5} />);

            const badge = screen.getByTestId('shopping-cart-badge');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveTextContent('5');
        });

        test('displays correct number for single item', () => {
            render(<CartBadgeIcon numberOfItems={1} />);

            const badge = screen.getByTestId('shopping-cart-badge');
            expect(badge).toHaveTextContent('1');
        });

        test('displays correct number for multiple items', () => {
            render(<CartBadgeIcon numberOfItems={42} />);

            const badge = screen.getByTestId('shopping-cart-badge');
            expect(badge).toHaveTextContent('42');
        });

        test('hides badge when zero items', () => {
            render(<CartBadgeIcon numberOfItems={0} />);

            expect(screen.queryByTestId('shopping-cart-badge')).not.toBeInTheDocument();
        });
    });

    describe('component structure', () => {
        test('renders fragment with icon and badge', () => {
            const { container } = render(<CartBadgeIcon numberOfItems={5} />);

            const icon = container.querySelector('svg');
            const badge = screen.getByTestId('shopping-cart-badge');

            expect(icon).toBeInTheDocument();
            expect(badge).toBeInTheDocument();
        });
    });

    describe('snapshot consistency', () => {
        test('renders consistently with same props', () => {
            const { container: container1 } = render(<CartBadgeIcon numberOfItems={5} />);
            const { container: container2 } = render(<CartBadgeIcon numberOfItems={5} />);

            expect(container1.innerHTML).toBe(container2.innerHTML);
        });
    });
});
