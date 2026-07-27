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
import { vi, describe, test, expect } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AllProvidersWrapper } from '@/test-utils/context-provider';

vi.mock('@/lib/decorators/component', () => ({
    Component: () => (target: any) => target,
}));

vi.mock('@/lib/decorators', () => ({
    RegionDefinition: () => (target: any) => target,
}));

vi.mock('@/lib/decorators/attribute-definition', () => ({
    AttributeDefinition: () => () => {},
}));

import AnnouncementBanner from './index';

function renderWithRouter(ui: React.ReactElement) {
    const router = createMemoryRouter(
        [
            {
                path: '*',
                element: <AllProvidersWrapper>{ui}</AllProvidersWrapper>,
            },
        ],
        { initialEntries: ['/'] }
    );
    return render(<RouterProvider router={router} />);
}

describe('AnnouncementBanner', () => {
    test('renders message text', () => {
        renderWithRouter(<AnnouncementBanner message="Free shipping on orders over $50" />);
        expect(screen.getByText('Free shipping on orders over $50')).toBeInTheDocument();
    });

    test('renders with role="status" for accessibility', () => {
        renderWithRouter(<AnnouncementBanner message="Sale today" />);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('renders CTA link when linkUrl and linkText provided', () => {
        renderWithRouter(<AnnouncementBanner message="Summer Sale" linkUrl="/sale" linkText="Shop Now" />);
        const link = screen.getByRole('link', { name: 'Shop Now' });
        expect(link.getAttribute('href')).toContain('/sale');
    });

    test('does not render link when linkUrl is missing', () => {
        renderWithRouter(<AnnouncementBanner message="Hello" />);
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    test('does not render link when linkText is missing', () => {
        renderWithRouter(<AnnouncementBanner message="Hello" linkUrl="/sale" />);
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    test('renders nothing when message is empty', () => {
        renderWithRouter(<AnnouncementBanner message="" />);
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    test('uses bg-primary tokens by default', () => {
        renderWithRouter(<AnnouncementBanner message="Sale" />);
        expect(screen.getByRole('status')).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    test('applies className alongside built-in classes', () => {
        renderWithRouter(<AnnouncementBanner message="Sale" className="custom-banner" />);
        expect(screen.getByRole('status')).toHaveClass('custom-banner');
    });

    describe('height', () => {
        test('defaults to medium density when no height is provided', () => {
            renderWithRouter(<AnnouncementBanner message="Sale" />);
            expect(screen.getByRole('status')).toHaveClass('py-3', 'text-sm');
        });

        test('applies small density classes when height="sm"', () => {
            renderWithRouter(<AnnouncementBanner message="Sale" height="sm" />);
            expect(screen.getByRole('status')).toHaveClass('py-1.5', 'text-xs');
        });

        test('applies large density classes when height="lg"', () => {
            renderWithRouter(<AnnouncementBanner message="Sale" height="lg" />);
            expect(screen.getByRole('status')).toHaveClass('py-5', 'text-base');
        });

        test('falls back to medium density for unknown height values', () => {
            renderWithRouter(<AnnouncementBanner message="Sale" height="huge" />);
            expect(screen.getByRole('status')).toHaveClass('py-3', 'text-sm');
        });
    });

    describe('alignment', () => {
        test('defaults to center alignment when no alignment is provided', () => {
            renderWithRouter(<AnnouncementBanner message="Sale" />);
            const banner = screen.getByRole('status');
            expect(banner).toHaveClass('justify-center');
            expect(screen.getByText('Sale')).toHaveClass('text-center');
        });

        test('applies left alignment classes', () => {
            renderWithRouter(<AnnouncementBanner message="Sale" alignment="left" />);
            const banner = screen.getByRole('status');
            expect(banner).toHaveClass('justify-start');
            expect(screen.getByText('Sale')).toHaveClass('text-left');
        });

        test('applies right alignment classes', () => {
            renderWithRouter(<AnnouncementBanner message="Sale" alignment="right" />);
            const banner = screen.getByRole('status');
            expect(banner).toHaveClass('justify-end');
            expect(screen.getByText('Sale')).toHaveClass('text-right');
        });

        test('falls back to center for unknown alignment values', () => {
            renderWithRouter(<AnnouncementBanner message="Sale" alignment="diagonal" />);
            expect(screen.getByRole('status')).toHaveClass('justify-center');
        });
    });

    test('renders link inline with message when both linkUrl and linkText are provided', () => {
        renderWithRouter(<AnnouncementBanner message="Summer Sale" linkUrl="/sale" linkText="Shop Now" />);
        const paragraph = screen.getByText(/Summer Sale/);
        expect(paragraph).toContainElement(screen.getByRole('link', { name: 'Shop Now' }));
    });

    test('does not apply an inline style attribute', () => {
        renderWithRouter(<AnnouncementBanner message="Sale" />);
        expect(screen.getByRole('status').getAttribute('style')).toBeNull();
    });

    describe('colorScheme', () => {
        test('defaults to primary tokens', () => {
            renderWithRouter(<AnnouncementBanner message="Sale" />);
            expect(screen.getByRole('status')).toHaveClass('bg-primary', 'text-primary-foreground');
        });

        test('applies secondary tokens when colorScheme="secondary"', () => {
            renderWithRouter(<AnnouncementBanner message="Sale" colorScheme="secondary" />);
            expect(screen.getByRole('status')).toHaveClass('bg-secondary', 'text-secondary-foreground');
        });

        test('applies destructive tokens when colorScheme="destructive"', () => {
            renderWithRouter(<AnnouncementBanner message="Sale" colorScheme="destructive" />);
            expect(screen.getByRole('status')).toHaveClass('bg-destructive', 'text-white');
        });

        test('falls back to primary tokens for unknown colorScheme values', () => {
            renderWithRouter(<AnnouncementBanner message="Sale" colorScheme="rainbow" />);
            expect(screen.getByRole('status')).toHaveClass('bg-primary');
        });
    });
});
