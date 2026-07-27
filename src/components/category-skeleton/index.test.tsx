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
import { render } from '@testing-library/react';
import { ProductTileSwatchesSkeleton } from './index';

describe('ProductTileSwatchesSkeleton', () => {
    test('renders the default count of 2 skeleton items', () => {
        const { container } = render(<ProductTileSwatchesSkeleton />);
        // Each skeleton item is a child of the container div
        const wrapper = container.firstElementChild;
        expect(wrapper?.children).toHaveLength(2);
    });

    test('renders the specified number of skeleton items', () => {
        const { container } = render(<ProductTileSwatchesSkeleton count={5} />);
        const wrapper = container.firstElementChild;
        expect(wrapper?.children).toHaveLength(5);
    });

    test('renders zero skeleton items when count is 0', () => {
        const { container } = render(<ProductTileSwatchesSkeleton count={0} />);
        const wrapper = container.firstElementChild;
        expect(wrapper?.children).toHaveLength(0);
    });

    test('applies gap-1 to match ProductTileSwatches spacing', () => {
        const { container } = render(<ProductTileSwatchesSkeleton />);
        const wrapper = container.firstElementChild;
        expect(wrapper?.className).toContain('gap-1');
    });

    test('does not apply gap-2 (old incorrect value)', () => {
        const { container } = render(<ProductTileSwatchesSkeleton />);
        const wrapper = container.firstElementChild;
        expect(wrapper?.className).not.toContain('gap-2');
    });

    test('applies items-center to align with ProductTileSwatches', () => {
        const { container } = render(<ProductTileSwatchesSkeleton />);
        const wrapper = container.firstElementChild;
        expect(wrapper?.className).toContain('items-center');
    });

    test('applies mb-2 bottom margin to match ProductTileSwatches', () => {
        const { container } = render(<ProductTileSwatchesSkeleton />);
        const wrapper = container.firstElementChild;
        expect(wrapper?.className).toContain('mb-2');
    });

    test('each skeleton item has rounded-full to match real swatches', () => {
        const { container } = render(<ProductTileSwatchesSkeleton count={3} />);
        const wrapper = container.firstElementChild;
        Array.from(wrapper?.children ?? []).forEach((child) => {
            expect(child.className).toContain('rounded-full');
        });
    });

    test('each skeleton item has h-4 w-4 dimensions matching real swatches', () => {
        const { container } = render(<ProductTileSwatchesSkeleton count={2} />);
        const wrapper = container.firstElementChild;
        Array.from(wrapper?.children ?? []).forEach((child) => {
            expect(child.className).toContain('h-4');
            expect(child.className).toContain('w-4');
        });
    });
});
