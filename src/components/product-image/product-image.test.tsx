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
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProductImage from './product-image';

// Mock the DynamicImage component
const DynamicImageMock = vi.fn(({ src, alt, imageProps, ...props }: any) => (
    <img src={src} alt={alt} onError={imageProps?.onError} {...props} />
));

vi.mock('@/components/dynamic-image', () => ({
    DynamicImage: (props: any) => DynamicImageMock(props),
}));

describe('ProductImage', () => {
    beforeEach(() => {
        DynamicImageMock.mockClear();
    });

    it('renders image when src is valid', () => {
        render(<ProductImage src="https://valid-image.jpg" alt="Valid image" className="test-class" />);

        const img = screen.getByAltText('Valid image');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://valid-image.jpg');
        expect(img).toHaveClass('test-class');
    });

    it('shows fallback when image fails to load', () => {
        render(<ProductImage src="https://invalid-image.jpg" alt="Invalid image" />);

        // Simulate image error
        const img = screen.getByAltText('Invalid image');
        fireEvent.error(img);

        // Should show fallback content
        expect(screen.getByText('No image available')).toBeInTheDocument();
        expect(screen.getByText('📷')).toBeInTheDocument();
    });

    it('calls both internal and custom onError handlers when image fails', () => {
        const customOnError = vi.fn();

        render(
            <ProductImage src="https://invalid-image.jpg" alt="Invalid image" imageProps={{ onError: customOnError }} />
        );

        const img = screen.getByAltText('Invalid image');
        fireEvent.error(img);

        // Internal handler should show fallback
        expect(screen.getByText('No image available')).toBeInTheDocument();
        // Custom handler should also have been called
        expect(customOnError).toHaveBeenCalledTimes(1);
    });

    it('passes through DynamicImage props', () => {
        render(
            <ProductImage
                src="https://valid-image.jpg"
                alt="Valid image"
                loading="lazy"
                widths={['50vw', '100vw']}
                heights={[300, 600]}
                imageProps={{ decoding: 'async' }}
            />
        );

        expect(DynamicImageMock).toHaveBeenCalledWith(
            expect.objectContaining({
                src: 'https://valid-image.jpg',
                alt: 'Valid image',
                loading: 'lazy',
                widths: ['50vw', '100vw'],
                heights: [300, 600],
                imageProps: {
                    decoding: 'async',
                    onError: expect.any(Function),
                },
            })
        );
    });
});
