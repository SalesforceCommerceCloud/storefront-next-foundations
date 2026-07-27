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
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { JsonLd } from './index';

describe('JsonLd', () => {
    it('should render a script tag with type application/ld+json', () => {
        const data = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Test Product',
        };

        const { container } = render(<JsonLd data={data} />);
        const script = container.querySelector('script[type="application/ld+json"]');

        expect(script).toBeInTheDocument();
    });

    it('should stringify and inject the data as innerHTML', () => {
        const data = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Test Product',
            description: 'Test Description',
        };

        const { container } = render(<JsonLd data={data} />);
        const script = container.querySelector('script[type="application/ld+json"]');

        expect(script).toBeInTheDocument();
        expect(script?.innerHTML).toBe(JSON.stringify(data));
    });

    it('should include the id attribute when provided', () => {
        const data = {
            '@context': 'https://schema.org',
            '@type': 'Product',
        };

        const { container } = render(<JsonLd data={data} id="product-schema" />);
        const script = container.querySelector('script#product-schema');

        expect(script).toBeInTheDocument();
        expect(script).toHaveAttribute('id', 'product-schema');
    });

    it('should handle complex nested data structures', () => {
        const data = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Test Product',
            offers: {
                '@type': 'Offer',
                price: '99.99',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
            },
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.5',
                reviewCount: '100',
            },
        };

        const { container } = render(<JsonLd data={data} />);
        const script = container.querySelector('script[type="application/ld+json"]');

        expect(script).toBeInTheDocument();
        const parsedData = JSON.parse(script?.innerHTML || '{}');
        expect(parsedData).toEqual(data);
    });

    it('should handle empty data object', () => {
        const data = {};

        const { container } = render(<JsonLd data={data} />);
        const script = container.querySelector('script[type="application/ld+json"]');

        // Empty object is valid JSON (though not useful for SEO)
        expect(script).toBeInTheDocument();
        expect(script?.innerHTML).toBe('{}');
    });

    it('should handle data with arrays', () => {
        const data = {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Item 1',
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Item 2',
                },
            ],
        };

        const { container } = render(<JsonLd data={data} />);
        const script = container.querySelector('script[type="application/ld+json"]');

        expect(script).toBeInTheDocument();
        const parsedData = JSON.parse(script?.innerHTML || '{}');
        expect(parsedData.itemListElement).toHaveLength(2);
        expect(parsedData.itemListElement[0].name).toBe('Item 1');
    });

    it('should render multiple JsonLd components with different ids', () => {
        const productData = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Product',
        };

        const breadcrumbData = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [],
        };

        const { container } = render(
            <>
                <JsonLd data={productData} id="product-schema" />
                <JsonLd data={breadcrumbData} id="breadcrumb-schema" />
            </>
        );

        const productScript = container.querySelector('script#product-schema');
        const breadcrumbScript = container.querySelector('script#breadcrumb-schema');

        expect(productScript).toBeInTheDocument();
        expect(breadcrumbScript).toBeInTheDocument();
        expect(container.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(2);
    });

    it('should handle special characters in data', () => {
        const data = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Product with "quotes" & <special> chars',
            description: 'Description with\nnewlines\tand\ttabs',
        };

        const { container } = render(<JsonLd data={data} />);
        const script = container.querySelector('script[type="application/ld+json"]');

        expect(script).toBeInTheDocument();
        const parsedData = JSON.parse(script?.innerHTML || '{}');
        expect(parsedData.name).toBe('Product with "quotes" & <special> chars');
        expect(parsedData.description).toBe('Description with\nnewlines\tand\ttabs');
    });

    describe('Error Handling', () => {
        it('should return null for null data', () => {
            const { container } = render(<JsonLd data={null as unknown as Record<string, unknown>} />);
            const script = container.querySelector('script[type="application/ld+json"]');
            expect(script).not.toBeInTheDocument();
        });

        it('should return null for undefined data', () => {
            const { container } = render(<JsonLd data={undefined as unknown as Record<string, unknown>} />);
            const script = container.querySelector('script[type="application/ld+json"]');
            expect(script).not.toBeInTheDocument();
        });

        it('should return null for array data', () => {
            const { container } = render(<JsonLd data={[1, 2, 3] as unknown as Record<string, unknown>} />);
            const script = container.querySelector('script[type="application/ld+json"]');
            expect(script).not.toBeInTheDocument();
        });

        it('should return null for primitive data (string)', () => {
            const { container } = render(<JsonLd data={'string' as unknown as Record<string, unknown>} />);
            const script = container.querySelector('script[type="application/ld+json"]');
            expect(script).not.toBeInTheDocument();
        });

        it('should return null for primitive data (number)', () => {
            const { container } = render(<JsonLd data={42 as unknown as Record<string, unknown>} />);
            const script = container.querySelector('script[type="application/ld+json"]');
            expect(script).not.toBeInTheDocument();
        });

        it('should return null for data with circular references', () => {
            const circularData: Record<string, unknown> = {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: 'Test',
            };
            // Create circular reference
            circularData.self = circularData;

            const { container } = render(<JsonLd data={circularData} />);
            const script = container.querySelector('script[type="application/ld+json"]');
            expect(script).not.toBeInTheDocument();
        });

        it('should handle data with functions (functions are silently removed by JSON.stringify)', () => {
            const dataWithFunction = {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: 'Test',

                fn: () => {},
            };

            const { container } = render(<JsonLd data={dataWithFunction} />);
            const script = container.querySelector('script[type="application/ld+json"]');

            // JSON.stringify converts functions to undefined, so it renders successfully
            // but the function property is not included in the output
            expect(script).toBeInTheDocument();
            const parsedData = JSON.parse(script?.innerHTML || '{}');
            expect(parsedData.name).toBe('Test');
            expect(parsedData.fn).toBeUndefined(); // Function is removed
        });
    });
});
