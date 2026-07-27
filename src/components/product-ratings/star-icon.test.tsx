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

import { render } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { StarIcon } from './star-icon';

describe('StarIcon', () => {
    describe('basic rendering', () => {
        test('renders an SVG element', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} />);
            const svg = container.querySelector('svg');
            expect(svg).toBeInTheDocument();
        });

        test('renders with correct viewBox', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveAttribute('viewBox', '0 0 20 20');
        });

        test('renders a path with a stroke', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} />);
            const path = container.querySelector('path');
            expect(path).toBeInTheDocument();
            expect(path).toHaveAttribute('stroke');
            expect(path).toHaveAttribute('stroke-width', '1');
        });
    });

    describe('fully filled state', () => {
        test('uses rating color for fill and stroke', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} />);
            const path = container.querySelector('path');
            expect(path).toHaveAttribute('fill', 'var(--color-rating)');
            expect(path).toHaveAttribute('stroke', 'var(--color-rating)');
        });

        test('does not render a gradient', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} />);
            expect(container.querySelector('linearGradient')).not.toBeInTheDocument();
        });
    });

    describe('unfilled state', () => {
        test('uses white fill and border-subtle stroke', () => {
            const { container } = render(<StarIcon opacity={1} filled={false} />);
            const path = container.querySelector('path');
            expect(path).toHaveAttribute('fill', 'white');
            expect(path).toHaveAttribute('stroke', 'var(--color-border-subtle)');
        });

        test('does not render a gradient', () => {
            const { container } = render(<StarIcon opacity={0} filled={false} />);
            expect(container.querySelector('linearGradient')).not.toBeInTheDocument();
        });
    });

    describe('partially filled state', () => {
        test('renders a linearGradient for partial fill', () => {
            const { container } = render(<StarIcon opacity={0.6} filled={true} />);
            const gradient = container.querySelector('linearGradient');
            expect(gradient).toBeInTheDocument();
        });

        test('sets gradient stops at the correct percentage', () => {
            const { container } = render(<StarIcon opacity={0.7} filled={true} />);
            const stops = container.querySelectorAll('stop');
            expect(stops).toHaveLength(2);
            expect(stops[0]).toHaveAttribute('offset', '70%');
            expect(stops[1]).toHaveAttribute('offset', '70%');
        });

        test('first gradient stop is rating color and second is white', () => {
            const { container } = render(<StarIcon opacity={0.5} filled={true} />);
            const stops = container.querySelectorAll('stop');
            expect(stops[0]).toHaveAttribute('stop-color', 'var(--color-rating)');
            expect(stops[1]).toHaveAttribute('stop-color', 'white');
        });

        test('path fill references the gradient', () => {
            const { container } = render(<StarIcon opacity={0.5} filled={true} />);
            const path = container.querySelector('path');
            const gradient = container.querySelector('linearGradient');
            expect(path?.getAttribute('fill')).toBe(`url(#${gradient?.id})`);
        });

        test('uses border-subtle stroke for partial fill', () => {
            const { container } = render(<StarIcon opacity={0.5} filled={true} />);
            const path = container.querySelector('path');
            expect(path).toHaveAttribute('stroke', 'var(--color-border-subtle)');
        });

        test('rounds fill percentage to nearest integer', () => {
            const { container } = render(<StarIcon opacity={0.33} filled={true} />);
            const stops = container.querySelectorAll('stop');
            expect(stops[0]).toHaveAttribute('offset', '33%');
        });
    });

    describe('className prop', () => {
        test('applies custom className', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} className="custom-class" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveClass('custom-class');
        });

        test('preserves shrink-0 base class with custom className', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} className="w-8 h-8" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveClass('shrink-0', 'w-8', 'h-8');
        });

        test('applies multiple custom classes', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} className="w-6 h-6" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveClass('w-6', 'h-6');
        });
    });

    describe('additional SVG props', () => {
        test('forwards aria-hidden attribute', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} aria-hidden="true" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveAttribute('aria-hidden', 'true');
        });

        test('forwards data attributes', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} data-testid="star-icon" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveAttribute('data-testid', 'star-icon');
        });

        test('forwards custom props', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} role="img" aria-label="Star" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveAttribute('role', 'img');
            expect(svg).toHaveAttribute('aria-label', 'Star');
        });
    });

    describe('ref forwarding', () => {
        test('forwards ref to SVG element', () => {
            const ref = { current: null };
            render(<StarIcon opacity={1} filled={true} ref={ref} />);
            expect(ref.current).toBeInstanceOf(SVGSVGElement);
        });
    });

    describe('edge cases', () => {
        test('opacity of 0 with filled=true renders as unfilled visually (0% gradient)', () => {
            const { container } = render(<StarIcon opacity={0} filled={true} />);
            const path = container.querySelector('path');
            // opacity=0 + filled=true → fillValue clamped to 0, not partial, not fully filled
            // Falls to the else branch → white fill
            expect(path).toHaveAttribute('fill', 'white');
        });

        test('opacity of exactly 1 with filled=true is fully filled (no gradient)', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} />);
            expect(container.querySelector('linearGradient')).not.toBeInTheDocument();
            const path = container.querySelector('path');
            expect(path).toHaveAttribute('fill', 'var(--color-rating)');
        });
    });
});
