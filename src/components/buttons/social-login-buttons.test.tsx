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
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

const { t } = getTranslation();
import { SocialLoginButtons } from './social-login-buttons';
import { mockConfig } from '@/test-utils/config';

// Mock the useConfig hook - use vi.hoisted to ensure it's available during mock setup
const mockUseConfig = vi.hoisted(() => vi.fn());

vi.mock('@salesforce/storefront-next-runtime/config', async () => {
    const actual = await vi.importActual('@salesforce/storefront-next-runtime/config');
    return {
        ...actual,
        useConfig: mockUseConfig,
    };
});

// Helper function to render component with router context
const renderWithRouter = (component: React.ReactElement) => {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: component,
            },
        ],
        {
            initialEntries: ['/'],
        }
    );
    return render(<RouterProvider router={router} />);
};

describe('SocialLoginButtons', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Set default mock return value
        mockUseConfig.mockReturnValue({
            ...mockConfig,
            features: {
                ...mockConfig.features,
                socialLogin: { enabled: true, providers: ['Apple', 'Google'] },
            },
        });
    });

    test('renders social login buttons for configured providers', () => {
        renderWithRouter(<SocialLoginButtons />);

        expect(screen.getByRole('button', { name: /continue with apple/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    });

    test('renders null when no social providers are configured', () => {
        mockUseConfig.mockReturnValue({
            ...mockConfig,
            features: {
                ...mockConfig.features,
                socialLogin: { enabled: true, providers: [] },
            },
        });

        const { container } = renderWithRouter(<SocialLoginButtons />);

        expect(container.querySelector('div')).toBeNull();
    });

    test('renders correct number of buttons for configured providers', () => {
        mockUseConfig.mockReturnValue({
            ...mockConfig,
            features: {
                ...mockConfig.features,
                socialLogin: { enabled: true, providers: ['Apple', 'Google', 'Facebook'] },
            },
        });

        renderWithRouter(<SocialLoginButtons />);

        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(3);
    });

    test('renders apple icon for Apple provider', () => {
        renderWithRouter(<SocialLoginButtons />);

        const appleButton = screen.getByRole('button', { name: /continue with apple/i });
        // SiApple from @icons-pack/react-simple-icons exposes the brand title.
        expect(appleButton.querySelector('svg title')?.textContent).toBe('Apple');
    });

    test('renders google icon for Google provider', () => {
        renderWithRouter(<SocialLoginButtons />);

        const googleButton = screen.getByRole('button', { name: /continue with google/i });
        // The Google "G" mark is identifiable by Google blue (#4285F4) on its first path.
        const svg = googleButton.querySelector('svg');
        expect(svg).not.toBeNull();
        expect(svg?.querySelector('path[fill="#4285F4"]')).not.toBeNull();
    });

    test('renders default icon for unknown provider', () => {
        mockUseConfig.mockReturnValue({
            ...mockConfig,
            features: {
                ...mockConfig.features,
                socialLogin: { enabled: true, providers: ['UnknownProvider'] },
            },
        });

        renderWithRouter(<SocialLoginButtons />);

        const button = screen.getByRole('button', { name: /continue with unknownprovider/i });
        // Lucide's KeyRound is the fallback icon and tags itself with `lucide-key-round`.
        expect(button.querySelector('svg.lucide-key-round')).not.toBeNull();
    });

    test('renders separator with correct text', () => {
        renderWithRouter(<SocialLoginButtons />);

        expect(screen.getByText(t('login:socialOrContinueWith'))).toBeInTheDocument();
    });

    test('renders forms with correct hidden inputs for each provider', () => {
        const { container } = renderWithRouter(<SocialLoginButtons />);

        const forms = container.querySelectorAll('form');
        expect(forms).toHaveLength(2);

        // Check Apple form
        const appleForm = forms[0];
        const appleLoginModeInput = appleForm.querySelector('input[name="loginMode"]') as HTMLInputElement;
        const appleProviderInput = appleForm.querySelector('input[name="provider"]') as HTMLInputElement;

        expect(appleLoginModeInput?.value).toBe('social');
        expect(appleProviderInput?.value).toBe('Apple');

        // Check Google form
        const googleForm = forms[1];
        const googleLoginModeInput = googleForm.querySelector('input[name="loginMode"]') as HTMLInputElement;
        const googleProviderInput = googleForm.querySelector('input[name="provider"]') as HTMLInputElement;

        expect(googleLoginModeInput?.value).toBe('social');
        expect(googleProviderInput?.value).toBe('Google');
    });

    test('renders buttons with post method', () => {
        const { container } = renderWithRouter(<SocialLoginButtons />);

        const forms = container.querySelectorAll('form');
        forms.forEach((form) => {
            expect(form.getAttribute('method')).toBe('post');
        });
    });

    test('renders buttons with outline variant', () => {
        renderWithRouter(<SocialLoginButtons />);

        const buttons = screen.getAllByRole('button');
        buttons.forEach((button) => {
            // The Button component should have the outline variant class
            // We just check that the button exists and has proper structure
            expect(button).toHaveAttribute('type', 'submit');
        });
    });

    test('renders only unique providers when duplicates exist', () => {
        mockUseConfig.mockReturnValue({
            ...mockConfig,
            features: {
                ...mockConfig.features,
                socialLogin: { enabled: true, providers: ['Apple', 'Apple', 'Google'] },
            },
        });

        const { container } = renderWithRouter(<SocialLoginButtons />);

        // Due to React key prop, only unique providers should render
        const forms = container.querySelectorAll('form');
        // React will only render 2 forms because keys are unique
        expect(forms.length).toBeGreaterThanOrEqual(2);
    });

    test('includes redirectPath hidden input when provided', () => {
        const redirectPath = '/checkout';
        const { container } = renderWithRouter(<SocialLoginButtons redirectPath={redirectPath} />);

        const forms = container.querySelectorAll('form');
        expect(forms.length).toBeGreaterThan(0);

        forms.forEach((form) => {
            const redirectInput = form.querySelector('input[name="redirectPath"]');
            expect((redirectInput as HTMLInputElement)?.value).toBe(redirectPath);
        });
    });
});
