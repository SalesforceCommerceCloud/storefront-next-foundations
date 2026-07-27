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
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import MaintenancePage, { loader } from './_empty.maintenance';
import type { AppConfig } from '@/types/config';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';

// Mock the config module
const mockConfig: AppConfig = {
    pages: {
        maintenancePage: {
            sharedMaintenancePage: false,
            cdnUrl: 'http://prd.cmp.cdn.commercecloud.salesforce.com',
            forwardedHost: '',
        },
    },
} as AppConfig;

vi.mock('@salesforce/storefront-next-runtime/config', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@salesforce/storefront-next-runtime/config')>();
    return {
        ...actual,
        getConfig: vi.fn(() => mockConfig),
    };
});

vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    })),
}));

describe('MaintenancePage', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        // Restore original fetch and reset mocks
        global.fetch = originalFetch;
        vi.restoreAllMocks();
        // Reset config to defaults
        mockConfig.pages.maintenancePage.sharedMaintenancePage = false;
        mockConfig.pages.maintenancePage.cdnUrl = 'http://prd.cmp.cdn.commercecloud.salesforce.com';
        mockConfig.pages.maintenancePage.forwardedHost = '';
    });

    describe('Component Rendering', () => {
        test('renders fallback maintenance message', async () => {
            const router = createMemoryRouter(
                [
                    {
                        path: '/',
                        element: <MaintenancePage />,
                        loader: () => null, // Simulate loader returning null (fallback)
                    },
                ],
                {
                    initialEntries: ['/'],
                }
            );

            render(
                <I18nextProvider i18n={i18next}>
                    <AllProvidersWrapper>
                        <RouterProvider router={router} />
                    </AllProvidersWrapper>
                </I18nextProvider>
            );

            // Wait for navigation to complete
            await screen.findByText(/We're making things even better/i);

            expect(screen.getByText(/We're making things even better/i)).toBeInTheDocument();
            expect(screen.getByText(/scheduled maintenance/i)).toBeInTheDocument();
        });

        test('renders without header or footer', async () => {
            const router = createMemoryRouter(
                [
                    {
                        path: '/',
                        element: <MaintenancePage />,
                        loader: () => null,
                    },
                ],
                {
                    initialEntries: ['/'],
                }
            );

            const { container } = render(
                <I18nextProvider i18n={i18next}>
                    <AllProvidersWrapper>
                        <RouterProvider router={router} />
                    </AllProvidersWrapper>
                </I18nextProvider>
            );

            // Wait for content to load
            await screen.findByText(/We're making things even better/i);

            // Should not have header or footer elements
            expect(container.querySelector('header')).not.toBeInTheDocument();
            expect(container.querySelector('footer')).not.toBeInTheDocument();
        });

        test('renders CDN content when available', async () => {
            const cdnContent = '<h1>Custom Maintenance</h1><p>Be back soon!</p>';
            const router = createMemoryRouter(
                [
                    {
                        path: '/',
                        element: <MaintenancePage />,
                        loader: () => cdnContent,
                    },
                ],
                {
                    initialEntries: ['/'],
                }
            );

            render(
                <I18nextProvider i18n={i18next}>
                    <AllProvidersWrapper>
                        <RouterProvider router={router} />
                    </AllProvidersWrapper>
                </I18nextProvider>
            );

            await screen.findByText('Custom Maintenance');
            expect(screen.getByText('Be back soon!')).toBeInTheDocument();
        });
    });

    describe('Loader - sharedMaintenancePage = false (default)', () => {
        beforeEach(() => {
            mockConfig.pages.maintenancePage.sharedMaintenancePage = false;
        });

        test('returns null without making fetch call', async () => {
            const mockFetch = vi.fn();
            global.fetch = mockFetch;

            const result = await loader({} as any);

            expect(result).toBeNull();
            expect(mockFetch).not.toHaveBeenCalled();
        });
    });

    describe('Loader - sharedMaintenancePage = true', () => {
        beforeEach(() => {
            mockConfig.pages.maintenancePage.sharedMaintenancePage = true;
            mockConfig.pages.maintenancePage.cdnUrl = 'http://prd.cmp.cdn.commercecloud.salesforce.com';
            mockConfig.pages.maintenancePage.forwardedHost = '';
        });

        test('fetches from CDN with correct URL and headers', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                text: () => '<div>CDN Maintenance</div>',
            });
            global.fetch = mockFetch;

            await loader({} as any);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://prd.cmp.cdn.commercecloud.salesforce.com',
                expect.objectContaining({
                    headers: {
                        'x-dw-forwarded-host': '',
                    },
                })
            );
        });

        test('includes forwardedHost in headers when configured', async () => {
            mockConfig.pages.maintenancePage.forwardedHost = 'mystore.example.com';

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                text: () => '<div>Maintenance</div>',
            });
            global.fetch = mockFetch;

            await loader({} as any);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: {
                        'x-dw-forwarded-host': 'mystore.example.com',
                    },
                })
            );
        });

        test('strips HTML wrapper tags from CDN response', async () => {
            const mockHtml = `
                <html>
                <head><title>Maintenance</title></head>
                <body>
                    <div>We are under maintenance</div>
                </body>
                </html>
            `;
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                text: () => mockHtml,
            });

            const result = await loader({} as any);

            expect(result).not.toContain('<html>');
            expect(result).not.toContain('<head>');
            expect(result).not.toContain('<body>');
            expect(result).toContain('We are under maintenance');
        });

        test('returns null when CDN returns non-OK status', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
            });

            const result = await loader({} as any);
            expect(result).toBeNull();
        });

        test('returns null when fetch throws network error', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const result = await loader({} as any);
            expect(result).toBeNull();
        });

        test('returns null when response.text() throws error', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                text: () => {
                    throw new Error('Failed to read response');
                },
            });

            const result = await loader({} as any);
            expect(result).toBeNull();
        });
    });

    describe('Config - Custom CDN URL', () => {
        beforeEach(() => {
            mockConfig.pages.maintenancePage.sharedMaintenancePage = true;
        });

        test('uses custom CDN URL when configured', async () => {
            mockConfig.pages.maintenancePage.cdnUrl = 'https://custom-cdn.example.com/maintenance';

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                text: () => '<div>Custom</div>',
            });
            global.fetch = mockFetch;

            await loader({} as any);

            expect(mockFetch).toHaveBeenCalledWith('https://custom-cdn.example.com/maintenance', expect.any(Object));
        });

        test('handles malformed CDN URL gracefully', async () => {
            mockConfig.pages.maintenancePage.cdnUrl = 'not-a-valid-url';

            global.fetch = vi.fn().mockRejectedValue(new TypeError('Invalid URL'));

            const result = await loader({} as any);
            expect(result).toBeNull();
        });
    });
});
