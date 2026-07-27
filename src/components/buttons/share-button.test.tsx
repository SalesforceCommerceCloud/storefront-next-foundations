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

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ShareButton } from './share-button';
import type { ShopperProducts } from '@/scapi';
import { createConfigWrapper } from '@/test-utils/config';

// Mock useToast
const mockAddToast = vi.fn();
vi.mock('@/components/toast', () => ({
    useToast: () => ({
        addToast: mockAddToast,
    }),
}));

// Mock navigator.clipboard
const mockWriteText = vi.fn();
Object.assign(navigator, {
    clipboard: {
        writeText: mockWriteText,
    },
});

// Mock navigator.share
const mockShare = vi.fn();
Object.defineProperty(navigator, 'share', {
    writable: true,
    configurable: true,
    value: mockShare,
});

// Mock window.open
const mockWindowOpen = vi.fn();
window.open = mockWindowOpen;

// Mock window.location with configurable property and getter for href
let mockLocationHref = 'http://localhost:5173/product/25686571M?color=CHARCWL';
Object.defineProperty(window, 'location', {
    writable: true,
    configurable: true,
    value: {
        get href() {
            return mockLocationHref;
        },
        set href(value: string) {
            mockLocationHref = value;
        },
    },
});

describe('ShareButton', () => {
    const mockProduct: ShopperProducts.schemas['Product'] = {
        id: '25686571M',
        name: 'Charcoal Single Pleat Wool Suit',
        shortDescription: 'This suit is great for any occasion.',
    } as ShopperProducts.schemas['Product'];

    // Create a wrapper with default config
    const defaultConfigWrapper = createConfigWrapper({
        app: {
            features: {
                passwordlessLogin: {
                    callbackUri: '/passwordless-login-callback',
                    landingUri: '/passwordless-login-landing',
                },
                socialLogin: { enabled: true, callbackUri: '/social-callback', providers: ['Apple', 'Google'] },
                socialShare: { enabled: true, providers: ['Twitter', 'Facebook', 'LinkedIn', 'Email'] },
                guestCheckout: true,
            },
            commerce: {
                sites: [
                    {
                        defaultLocale: 'en-US',
                        defaultCurrency: 'USD',
                    },
                ],
            },
        },
    } as any);

    beforeEach(() => {
        vi.clearAllMocks();
        mockWriteText.mockResolvedValue(undefined);
        mockShare.mockResolvedValue(undefined);
        mockWindowOpen.mockClear();

        // Ensure window.location.href is set correctly before each test
        mockLocationHref = 'http://localhost:5173/product/25686571M?color=CHARCWL';

        // Ensure navigator.share is restored before each test
        if (!('share' in navigator)) {
            Object.defineProperty(navigator, 'share', {
                writable: true,
                configurable: true,
                value: mockShare,
            });
        }
    });

    describe('Rendering', () => {
        test('renders share button', () => {
            render(<ShareButton product={mockProduct} />, { wrapper: defaultConfigWrapper });

            expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
        });

        test('renders with custom className', () => {
            render(<ShareButton product={mockProduct} className="custom-class" />, { wrapper: defaultConfigWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            expect(button).toHaveClass('custom-class');
        });

        test('opens dropdown menu when clicked (no native share)', async () => {
            // Disable native share for this test
            Object.defineProperty(navigator, 'share', {
                writable: true,
                configurable: true,
                value: undefined,
            });

            const user = userEvent.setup();
            render(<ShareButton product={mockProduct} />, { wrapper: defaultConfigWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            expect(screen.getByText('Copy link')).toBeInTheDocument();

            // Restore native share
            Object.defineProperty(navigator, 'share', {
                writable: true,
                configurable: true,
                value: mockShare,
            });
        });
    });

    describe('Native Share', () => {
        test('calls navigator.share directly when button is clicked', async () => {
            const user = userEvent.setup();
            render(<ShareButton product={mockProduct} />, { wrapper: defaultConfigWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            await waitFor(() => {
                expect(mockShare).toHaveBeenCalledWith({
                    title: 'Charcoal Single Pleat Wool Suit',
                    text: expect.stringContaining('Charcoal Single Pleat Wool Suit'),
                    url: 'http://localhost:5173/product/25686571M?color=CHARCWL',
                });
            });
        });

        test('does not show dropdown when native share is available', async () => {
            const user = userEvent.setup();
            render(<ShareButton product={mockProduct} />, { wrapper: defaultConfigWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            // Dropdown should not appear with native share
            expect(screen.queryByText('Copy link')).not.toBeInTheDocument();
        });

        test('does not show native share when navigator.share is not available', async () => {
            // Temporarily set navigator.share to undefined by creating a new mock
            const originalShare = (navigator as { share?: () => Promise<void> }).share;
            // Delete the property first if possible, otherwise override
            try {
                delete (navigator as any).share;
            } catch {
                // If delete fails, we'll override instead
            }

            // Set it to undefined to simulate not being available
            Object.defineProperty(navigator, 'share', {
                writable: true,
                configurable: true,
                enumerable: true,
                value: undefined,
            });

            const user = userEvent.setup();
            render(<ShareButton product={mockProduct} />, { wrapper: defaultConfigWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            // Native share option should not appear when navigator.share is not a function
            expect(screen.queryByText('Share via...')).not.toBeInTheDocument();

            // Restore navigator.share
            Object.defineProperty(navigator, 'share', {
                writable: true,
                configurable: true,
                enumerable: true,
                value: originalShare,
            });
        });

        test('handles share cancellation gracefully', async () => {
            const abortError = new DOMException('User cancelled', 'AbortError');
            mockShare.mockRejectedValue(abortError);

            const user = userEvent.setup();
            render(<ShareButton product={mockProduct} />, { wrapper: defaultConfigWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            await waitFor(() => {
                expect(mockShare).toHaveBeenCalled();
            });

            // Should not show error toast for cancellation (AbortError is handled silently)
            expect(mockAddToast).not.toHaveBeenCalled();
        });

        test('shows error toast when share fails', async () => {
            const error = new Error('Share failed');
            mockShare.mockRejectedValue(error);

            const user = userEvent.setup();
            render(<ShareButton product={mockProduct} />, { wrapper: defaultConfigWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            await waitFor(() => {
                expect(mockAddToast).toHaveBeenCalledWith('Failed to share', 'error');
            });
        });
    });

    describe('Copy Link', () => {
        test('shows copy link option in dropdown when no native share', async () => {
            // Disable native share
            Object.defineProperty(navigator, 'share', {
                writable: true,
                configurable: true,
                value: undefined,
            });

            const user = userEvent.setup();
            render(<ShareButton product={mockProduct} />, { wrapper: defaultConfigWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            await waitFor(() => {
                expect(screen.getByText('Copy link')).toBeInTheDocument();
            });

            // Restore native share
            Object.defineProperty(navigator, 'share', {
                writable: true,
                configurable: true,
                value: mockShare,
            });
        });

        test('copy link option is clickable', async () => {
            // Disable native share
            Object.defineProperty(navigator, 'share', {
                writable: true,
                configurable: true,
                value: undefined,
            });

            const user = userEvent.setup();
            render(<ShareButton product={mockProduct} />, { wrapper: defaultConfigWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            await waitFor(() => {
                expect(screen.getByText('Copy link')).toBeInTheDocument();
            });

            const copyLinkOption = screen.getByText('Copy link');

            // Verify the option is clickable (not disabled)
            expect(copyLinkOption).toBeInTheDocument();
            await user.click(copyLinkOption);

            // Verify toast is shown (success or error depending on clipboard API availability)
            await waitFor(() => {
                expect(mockAddToast).toHaveBeenCalled();
            });

            // Restore native share
            Object.defineProperty(navigator, 'share', {
                writable: true,
                configurable: true,
                value: mockShare,
            });
        });
    });

    describe('Social Share Providers', () => {
        beforeEach(() => {
            // Disable native share for all social provider tests (they test dropdown)
            Object.defineProperty(navigator, 'share', {
                writable: true,
                configurable: true,
                value: undefined,
            });
        });

        afterEach(() => {
            // Restore native share
            Object.defineProperty(navigator, 'share', {
                writable: true,
                configurable: true,
                value: mockShare,
            });
        });

        test('renders only enabled providers from config', async () => {
            const customWrapper = createConfigWrapper({
                app: {
                    features: {
                        passwordlessLogin: {
                            callbackUri: '/passwordless-login-callback',
                            landingUri: '/passwordless-login-landing',
                        },
                        socialLogin: { enabled: true, callbackUri: '/social-callback', providers: ['Apple', 'Google'] },
                        socialShare: { enabled: true, providers: ['Twitter', 'Email'] },
                        guestCheckout: true,
                    },
                    commerce: {
                        sites: [
                            {
                                defaultLocale: 'en-US',
                                defaultCurrency: 'USD',
                            },
                        ],
                    },
                },
            } as any);

            const user = userEvent.setup();
            render(<ShareButton product={mockProduct} />, { wrapper: customWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            expect(screen.getByText('Twitter/X')).toBeInTheDocument();
            expect(screen.getByText('Email')).toBeInTheDocument();
            expect(screen.queryByText('Facebook')).not.toBeInTheDocument();
            expect(screen.queryByText('LinkedIn')).not.toBeInTheDocument();
        });

        test('does not render social providers when socialShare is disabled', async () => {
            const customWrapper = createConfigWrapper({
                app: {
                    features: {
                        passwordlessLogin: {
                            callbackUri: '/passwordless-login-callback',
                            landingUri: '/passwordless-login-landing',
                        },
                        socialLogin: { enabled: true, callbackUri: '/social-callback', providers: ['Apple', 'Google'] },
                        socialShare: { enabled: false, providers: ['Twitter', 'Facebook', 'LinkedIn', 'Email'] },
                        guestCheckout: true,
                    },
                    commerce: {
                        sites: [
                            {
                                defaultLocale: 'en-US',
                                defaultCurrency: 'USD',
                            },
                        ],
                    },
                },
            } as any);

            const user = userEvent.setup();
            render(<ShareButton product={mockProduct} />, { wrapper: customWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            expect(screen.getByText('Copy link')).toBeInTheDocument();
            expect(screen.queryByText('Twitter/X')).not.toBeInTheDocument();
            expect(screen.queryByText('Email')).not.toBeInTheDocument();
        });

        test('opens email client with correct parameters', async () => {
            const user = userEvent.setup();
            render(<ShareButton product={mockProduct} />, { wrapper: defaultConfigWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            const emailOption = screen.getByText('Email');
            await user.click(emailOption);

            await waitFor(() => {
                expect(mockWindowOpen).toHaveBeenCalledWith(expect.stringContaining('mailto:?subject='), '_blank');
            });

            const callArgs = mockWindowOpen.mock.calls[0][0];
            expect(callArgs).toContain('subject=Charcoal%20Single%20Pleat%20Wool%20Suit');
            expect(callArgs).toContain('body=');
        });

        test('opens Twitter share with correct URL', async () => {
            const user = userEvent.setup();
            render(<ShareButton product={mockProduct} />, { wrapper: defaultConfigWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            const twitterOption = screen.getByText('Twitter/X');
            await user.click(twitterOption);

            await waitFor(() => {
                expect(mockWindowOpen).toHaveBeenCalledWith(
                    expect.stringContaining('https://twitter.com/intent/tweet'),
                    '_blank'
                );
            });

            const callArgs = mockWindowOpen.mock.calls[0][0];
            expect(callArgs).toContain('text=');
            expect(callArgs).toContain('url=');
        });

        test('opens Facebook share with correct URL', async () => {
            const user = userEvent.setup();
            render(<ShareButton product={mockProduct} />, { wrapper: defaultConfigWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            const facebookOption = screen.getByText('Facebook');
            await user.click(facebookOption);

            await waitFor(() => {
                expect(mockWindowOpen).toHaveBeenCalledWith(
                    expect.stringContaining('https://www.facebook.com/sharer/sharer.php'),
                    '_blank'
                );
            });
        });

        test('opens LinkedIn share with correct URL', async () => {
            const user = userEvent.setup();
            render(<ShareButton product={mockProduct} />, { wrapper: defaultConfigWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            const linkedInOption = screen.getByText('LinkedIn');
            await user.click(linkedInOption);

            await waitFor(() => {
                expect(mockWindowOpen).toHaveBeenCalledWith(
                    expect.stringContaining('https://www.linkedin.com/sharing/share-offsite/'),
                    '_blank'
                );
            });
        });

        test('filters out invalid providers', async () => {
            const customWrapper = createConfigWrapper({
                app: {
                    features: {
                        passwordlessLogin: {
                            callbackUri: '/passwordless-login-callback',
                            landingUri: '/passwordless-login-landing',
                        },
                        socialLogin: { enabled: true, callbackUri: '/social-callback', providers: ['Apple', 'Google'] },
                        socialShare: {
                            enabled: true,
                            providers: ['Twitter', 'Email', 'InvalidProvider' as 'Twitter'], // Cast to test filtering
                        },
                        guestCheckout: true,
                    },
                    commerce: {
                        sites: [
                            {
                                defaultLocale: 'en-US',
                                defaultCurrency: 'USD',
                            },
                        ],
                    },
                },
            } as any);

            const user = userEvent.setup();
            render(<ShareButton product={mockProduct} />, { wrapper: customWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            expect(screen.getByText('Twitter/X')).toBeInTheDocument();
            expect(screen.getByText('Email')).toBeInTheDocument();
            // InvalidProvider should be filtered out
            expect(screen.queryByText('InvalidProvider')).not.toBeInTheDocument();
        });
    });

    describe('Product Data Handling', () => {
        beforeEach(() => {
            // Disable native share for dropdown tests
            Object.defineProperty(navigator, 'share', {
                writable: true,
                configurable: true,
                value: undefined,
            });
        });

        afterEach(() => {
            // Restore native share
            Object.defineProperty(navigator, 'share', {
                writable: true,
                configurable: true,
                value: mockShare,
            });
        });

        test('handles missing product name', async () => {
            const productWithoutName = { ...mockProduct, name: undefined } as ShopperProducts.schemas['Product'];

            const user = userEvent.setup();
            render(<ShareButton product={productWithoutName} />, { wrapper: defaultConfigWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            await waitFor(() => {
                expect(screen.getByText('Copy link')).toBeInTheDocument();
            });

            // Should still work with fallback name
            expect(screen.getByText('Copy link')).toBeInTheDocument();
        });

        test('handles missing product description', async () => {
            const productWithoutDesc = {
                ...mockProduct,
                shortDescription: undefined,
            } as ShopperProducts.schemas['Product'];

            const user = userEvent.setup();
            render(<ShareButton product={productWithoutDesc} />, { wrapper: defaultConfigWrapper });

            const button = screen.getByRole('button', { name: /share/i });
            await user.click(button);

            await waitFor(() => {
                expect(screen.getByText('Copy link')).toBeInTheDocument();
            });

            // Should still work with fallback description
            expect(screen.getByText('Copy link')).toBeInTheDocument();
        });
    });
});
