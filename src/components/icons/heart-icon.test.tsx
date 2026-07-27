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

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeartIcon } from './heart-icon';

describe('HeartIcon', () => {
    describe('default state', () => {
        test('renders an unfilled heart SVG', () => {
            render(<HeartIcon />);
            const svg = screen.getByRole('button').querySelector('svg');
            expect(svg).toBeInTheDocument();
            expect(svg).toHaveAttribute('fill', 'none');
        });

        test('has "Add to Wishlist" aria-label', () => {
            render(<HeartIcon />);
            expect(screen.getByRole('button', { name: /add to wishlist/i })).toBeInTheDocument();
        });

        test('is not disabled', () => {
            render(<HeartIcon />);
            expect(screen.getByRole('button')).not.toBeDisabled();
        });

        test('does not set aria-busy', () => {
            render(<HeartIcon />);
            expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
        });

        test('has no border in default state', () => {
            render(<HeartIcon />);
            expect(screen.getByRole('button').className).toContain('border-0');
        });
    });

    describe('filled state', () => {
        test('renders a filled heart SVG', () => {
            render(<HeartIcon isFilled />);
            const svg = screen.getByRole('button').querySelector('svg');
            expect(svg).toBeInTheDocument();
            expect(svg).toHaveAttribute('fill', 'currentColor');
        });

        test('has "Remove from wishlist" aria-label', () => {
            render(<HeartIcon isFilled />);
            expect(screen.getByRole('button', { name: /remove from wishlist/i })).toBeInTheDocument();
        });

        test('applies light red background and red border', () => {
            render(<HeartIcon isFilled />);
            const button = screen.getByRole('button');
            expect(button.className).toContain('bg-red-50');
            expect(button.className).toContain('border-red-200');
        });
    });

    describe('loading state', () => {
        test('renders a spinner instead of SVG', () => {
            render(<HeartIcon isLoading />);
            const button = screen.getByRole('button');
            expect(button.querySelector('svg')).not.toBeInTheDocument();
            expect(button.querySelector('.animate-spin')).toBeInTheDocument();
        });

        test('sets aria-busy to true', () => {
            render(<HeartIcon isLoading />);
            expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
        });

        test('has "Updating wishlist" aria-label', () => {
            render(<HeartIcon isLoading />);
            expect(screen.getByRole('button', { name: /updating wishlist/i })).toBeInTheDocument();
        });

        test('is not disabled', () => {
            render(<HeartIcon isLoading />);
            expect(screen.getByRole('button')).not.toBeDisabled();
        });

        test('applies pointer-events-none class', () => {
            render(<HeartIcon isLoading />);
            expect(screen.getByRole('button').className).toContain('pointer-events-none');
        });

        test('does not apply light red background or border even when isFilled is true', () => {
            render(<HeartIcon isLoading isFilled />);
            const button = screen.getByRole('button');
            expect(button.className).not.toContain('bg-red-50');
            expect(button.className).not.toContain('border-red-200');
        });
    });

    describe('disabled state', () => {
        test('disables the button', () => {
            render(<HeartIcon disabled />);
            expect(screen.getByRole('button')).toBeDisabled();
        });

        test('does not set aria-busy', () => {
            render(<HeartIcon disabled />);
            expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
        });
    });

    describe('click handling', () => {
        test('calls onClick when clicked', async () => {
            const user = userEvent.setup();
            const onClick = vi.fn();
            render(<HeartIcon onClick={onClick} />);
            await user.click(screen.getByRole('button'));
            expect(onClick).toHaveBeenCalledOnce();
        });

        test('does not call onClick when disabled', async () => {
            const user = userEvent.setup();
            const onClick = vi.fn();
            render(<HeartIcon disabled onClick={onClick} />);
            await user.click(screen.getByRole('button'));
            expect(onClick).not.toHaveBeenCalled();
        });

        test('does not call onClick when loading', async () => {
            const user = userEvent.setup();
            const onClick = vi.fn();
            render(<HeartIcon isLoading onClick={onClick} />);
            await user.click(screen.getByRole('button'));
            expect(onClick).not.toHaveBeenCalled();
        });
    });

    describe('size variants', () => {
        test.each([
            ['sm', 'w-4 h-4'],
            ['md', 'w-5 h-5'],
            ['lg', 'w-6 h-6'],
        ] as const)('size "%s" applies %s to SVG', (size, expectedClasses) => {
            render(<HeartIcon size={size} />);
            const svg = screen.getByRole('button').querySelector('svg');
            const svgClass = svg?.getAttribute('class') ?? '';
            for (const cls of expectedClasses.split(' ')) {
                expect(svgClass).toContain(cls);
            }
        });

        test.each([
            ['sm', 'w-4 h-4'],
            ['md', 'w-5 h-5'],
            ['lg', 'w-6 h-6'],
        ] as const)('size "%s" applies %s to spinner when loading', (size, expectedClasses) => {
            render(<HeartIcon size={size} isLoading />);
            const spinner = screen.getByRole('button').querySelector('.animate-spin');
            for (const cls of expectedClasses.split(' ')) {
                expect(spinner?.className).toContain(cls);
            }
        });
    });

    test('forwards ref to the button element', () => {
        const ref = vi.fn();
        render(<HeartIcon ref={ref} />);
        expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
    });

    test('applies custom className', () => {
        render(<HeartIcon className="my-custom-class" />);
        expect(screen.getByRole('button').className).toContain('my-custom-class');
    });

    test('sets tabIndex on the button', () => {
        render(<HeartIcon tabIndex={-1} />);
        expect(screen.getByRole('button')).toHaveAttribute('tabindex', '-1');
    });

    test('forwards rest props to the button element', async () => {
        const user = userEvent.setup();
        const onPointerEnter = vi.fn();
        render(<HeartIcon data-testid="heart" onPointerEnter={onPointerEnter} />);
        const button = screen.getByTestId('heart');
        await user.hover(button);
        expect(onPointerEnter).toHaveBeenCalledOnce();
    });
});
