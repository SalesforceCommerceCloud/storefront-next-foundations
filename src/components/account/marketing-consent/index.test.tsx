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
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { ShopperConsents } from '@/scapi';
import { MarketingConsent } from './index';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { ConfigWrapper } from '@/test-utils/config';

const { t } = getTranslation();

const mockUpdateBatch = vi.fn();
const mockAddToast = vi.fn();
let capturedOnError: ((message: string, data?: { partialSuccess?: boolean }) => void) | undefined;
vi.mock('@/hooks/use-update-marketing-consent', () => ({
    useUpdateMarketingConsent: vi.fn(
        (_onSuccess: () => void, onError?: (message: string, data?: { partialSuccess?: boolean }) => void) => {
            capturedOnError = onError;
            return {
                updateBatch: mockUpdateBatch,
                isUpdating: false,
            };
        }
    ),
}));
vi.mock('@/components/toast', () => ({
    useToast: () => ({ addToast: mockAddToast }),
}));

function renderWithProviders(ui: React.ReactElement) {
    return render(<ConfigWrapper>{ui}</ConfigWrapper>);
}

const subscriptionsFixture: ShopperConsents.schemas['ConsentSubscriptionResponse'] = {
    data: [
        {
            subscriptionId: 'Sale',
            channels: ['email'],
            title: 'Sale',
            consentType: 'marketing',
            consentRequired: false,
            defaultStatus: 'opt_out',
            tags: [],
            consentStatus: [{ channel: 'email', contactPointValue: 'user@example.com', status: 'opt_out' }],
        },
        {
            subscriptionId: 'Newsletter',
            channels: ['email'],
            title: 'Newsletter',
            consentType: 'marketing',
            consentRequired: false,
            defaultStatus: 'opt_out',
            tags: [],
            consentStatus: [{ channel: 'email', contactPointValue: 'user@example.com', status: 'opt_in' }],
        },
    ],
};

/** Fixture with multiple channels (email + sms) and subtitle for coverage. */
const multiChannelFixture: ShopperConsents.schemas['ConsentSubscriptionResponse'] = {
    data: [
        {
            subscriptionId: 'Promo',
            channels: ['sms', 'email'],
            title: 'Promotions',
            subtitle: 'Get offers and deals.',
            consentType: 'marketing',
            consentRequired: false,
            defaultStatus: 'opt_out',
            tags: [],
            consentStatus: [
                { channel: 'email', contactPointValue: 'u@ex.com', status: 'opt_in' },
                { channel: 'sms', contactPointValue: '+123', status: 'opt_out' },
            ],
        },
    ],
};

/** Subscription with no consentStatus (fallback to defaultStatus). */
const defaultStatusOnlyFixture: ShopperConsents.schemas['ConsentSubscriptionResponse'] = {
    data: [
        {
            subscriptionId: 'Legal',
            channels: ['email'],
            title: 'Legal updates',
            consentType: 'legal',
            consentRequired: true,
            defaultStatus: 'opt_in',
            tags: [],
        },
    ],
};

/** Subscription with no title (fallback to subscriptionId in UI). */
const noTitleFixture: ShopperConsents.schemas['ConsentSubscriptionResponse'] = {
    data: [
        {
            subscriptionId: 'no-title-id',
            channels: ['email'],
            consentType: 'marketing',
            consentRequired: false,
            defaultStatus: 'opt_out',
            tags: [],
            consentStatus: [{ channel: 'email', contactPointValue: 'u@ex.com', status: 'opt_out' }],
        },
    ],
};

describe('MarketingConsent', () => {
    beforeEach(() => {
        mockUpdateBatch.mockClear();
        mockAddToast.mockClear();
        capturedOnError = undefined;
    });

    test('renders card with title and Edit button', () => {
        renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        expect(screen.getByText(t('account:marketingConsent.title'))).toBeInTheDocument();
        expect(screen.getByRole('button', { name: t('account:marketingConsent.editA11y') })).toBeInTheDocument();
    });

    test('renders Edit button with correct type and aria-label', () => {
        renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        const editButton = screen.getByRole('button', { name: t('account:marketingConsent.editA11y') });
        expect(editButton).toHaveAttribute('type', 'button');
        expect(editButton).toHaveAttribute('aria-label', t('account:marketingConsent.editA11y'));
    });

    test('renders disclaimer', () => {
        renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        expect(screen.getByText(t('account:marketingConsent.disclaimer'))).toBeInTheDocument();
    });

    test('renders card with data-section attribute for marketing consent', () => {
        const { container } = renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        const card = container.querySelector('[data-section="marketing-consent"]');
        expect(card).toBeInTheDocument();
    });

    test('with subscriptions prop renders channel section and subscription titles', () => {
        renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        expect(screen.getByText('Sale')).toBeInTheDocument();
        expect(screen.getByText('Newsletter')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Email', level: 2 })).toBeInTheDocument();
    });

    test('with subscriptions prop renders switches with correct initial state from consentStatus', () => {
        renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        const switches = screen.getAllByRole('switch');
        expect(switches).toHaveLength(2);
        const saleSwitch = screen.getByRole('switch', {
            name: new RegExp(`Sale.*${t('account:marketingConsent.optedOut')}`),
        });
        const newsletterSwitch = screen.getByRole('switch', {
            name: new RegExp(`Newsletter.*${t('account:marketingConsent.optedIn')}`),
        });
        expect(saleSwitch).toHaveAttribute('aria-checked', 'false');
        expect(newsletterSwitch).toHaveAttribute('aria-checked', 'true');
    });

    test('switches are disabled until Edit is clicked', () => {
        renderWithProviders(
            <MarketingConsent
                subscriptions={subscriptionsFixture}
                contactPointValueByChannel={{ email: 'user@example.com' }}
            />
        );

        const switches = screen.getAllByRole('switch');
        switches.forEach((sw) => expect(sw).toBeDisabled());
        const editButton = screen.getByRole('button', { name: t('account:marketingConsent.editA11y') });
        expect(editButton).toBeInTheDocument();
    });

    test('clicking Edit then toggling switch then Save calls updateBatch with correct payload', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <MarketingConsent
                subscriptions={subscriptionsFixture}
                contactPointValueByChannel={{ email: 'user@example.com' }}
            />
        );

        await user.click(screen.getByRole('button', { name: t('account:marketingConsent.editA11y') }));

        const saleSwitch = screen.getByRole('switch', {
            name: new RegExp(`Sale.*${t('account:marketingConsent.optedOut')}`),
        });
        expect(saleSwitch).not.toBeDisabled();
        await user.click(saleSwitch);
        expect(saleSwitch).toHaveAttribute('aria-checked', 'true');

        await user.click(screen.getByRole('button', { name: t('account:common.save') }));

        expect(mockUpdateBatch).toHaveBeenCalledTimes(1);
        expect(mockUpdateBatch).toHaveBeenCalledWith([
            {
                subscriptionId: 'Sale',
                channel: 'email',
                contactPointValue: 'user@example.com',
                status: 'opt_in',
            },
        ]);
    });

    test('clicking Cancel exits edit mode without calling updateBatch', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <MarketingConsent
                subscriptions={subscriptionsFixture}
                contactPointValueByChannel={{ email: 'user@example.com' }}
            />
        );

        await user.click(screen.getByRole('button', { name: t('account:marketingConsent.editA11y') }));
        const saleSwitch = screen.getByRole('switch', {
            name: new RegExp(`Sale.*${t('account:marketingConsent.optedOut')}`),
        });
        await user.click(saleSwitch);
        expect(saleSwitch).toHaveAttribute('aria-checked', 'true');

        await user.click(screen.getByRole('button', { name: t('account:common.cancel') }));

        expect(mockUpdateBatch).not.toHaveBeenCalled();
        const saleSwitchAfterCancel = screen.getByRole('switch', {
            name: new RegExp(`Sale.*${t('account:marketingConsent.optedOut')}`),
        });
        expect(saleSwitchAfterCancel).toHaveAttribute('aria-checked', 'false');
    });

    test('switch is disabled when contactPointValueByChannel has no value for channel', async () => {
        const user = userEvent.setup();
        renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        await user.click(screen.getByRole('button', { name: t('account:marketingConsent.editA11y') }));

        const switches = screen.getAllByRole('switch');
        expect(switches).toHaveLength(2);
        switches.forEach((sw) => expect(sw).toBeDisabled());
    });

    test('with subscriptions null does not render the card', () => {
        renderWithProviders(<MarketingConsent subscriptions={null} />);

        expect(screen.queryByText(t('account:marketingConsent.title'))).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    });

    test('with empty data array does not render the card', () => {
        renderWithProviders(<MarketingConsent subscriptions={{ data: [] }} />);

        expect(screen.queryByText(t('account:marketingConsent.title'))).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    });

    test('with multiple channels renders section per channel in API order', () => {
        renderWithProviders(<MarketingConsent subscriptions={multiChannelFixture} />);

        expect(screen.getByRole('heading', { name: 'Sms', level: 2 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Email', level: 2 })).toBeInTheDocument();
        expect(screen.getAllByText('Promotions')).toHaveLength(2);
        expect(screen.getAllByText('Get offers and deals.')).toHaveLength(2);
    });

    test('with multiple channels renders correct status per channel', () => {
        renderWithProviders(<MarketingConsent subscriptions={multiChannelFixture} />);

        const switches = screen.getAllByRole('switch');
        expect(switches).toHaveLength(2);
        const smsSwitch = screen.getByRole('switch', {
            name: new RegExp(`Promotions.*${t('account:marketingConsent.optedOut')}`),
        });
        const emailSwitch = screen.getByRole('switch', {
            name: new RegExp(`Promotions.*${t('account:marketingConsent.optedIn')}`),
        });
        expect(smsSwitch).toHaveAttribute('aria-checked', 'false');
        expect(emailSwitch).toHaveAttribute('aria-checked', 'true');
    });

    test('uses defaultStatus when consentStatus is missing', () => {
        renderWithProviders(<MarketingConsent subscriptions={defaultStatusOnlyFixture} />);

        const sw = screen.getByRole('switch', { name: new RegExp(`Legal.*${t('account:marketingConsent.optedIn')}`) });
        expect(sw).toHaveAttribute('aria-checked', 'true');
    });

    test('renders subscription list when data provided', () => {
        renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        const lists = screen.getAllByRole('list');
        expect(lists).toHaveLength(1);
    });

    test('when subscription has no title uses subscriptionId for switch label', () => {
        renderWithProviders(<MarketingConsent subscriptions={noTitleFixture} />);

        const sw = screen.getByRole('switch', {
            name: new RegExp(`no-title-id.*${t('account:marketingConsent.optedOut')}`),
        });
        expect(sw).toHaveAttribute('aria-checked', 'false');
    });

    test('when opt-in fails after Save, error toast is shown and switch shows server state', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <MarketingConsent
                subscriptions={subscriptionsFixture}
                contactPointValueByChannel={{ email: 'user@example.com' }}
            />
        );

        await user.click(screen.getByRole('button', { name: t('account:marketingConsent.editA11y') }));
        const saleSwitch = screen.getByRole('switch', {
            name: new RegExp(`Sale.*${t('account:marketingConsent.optedOut')}`),
        });
        await user.click(saleSwitch);
        await user.click(screen.getByRole('button', { name: t('account:common.save') }));

        act(() => {
            capturedOnError?.('API error');
        });
        expect(mockAddToast).toHaveBeenCalledWith(t('account:marketingConsent.updateError'), 'error');
        const saleSwitchAfterRevert = screen.getByRole('switch', {
            name: new RegExp(`Sale.*${t('account:marketingConsent.optedOut')}`),
        });
        expect(saleSwitchAfterRevert).toHaveAttribute('aria-checked', 'false');
    });

    test('when opt-out fails after Save, error toast is shown and switch shows server state', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <MarketingConsent
                subscriptions={subscriptionsFixture}
                contactPointValueByChannel={{ email: 'user@example.com' }}
            />
        );

        await user.click(screen.getByRole('button', { name: t('account:marketingConsent.editA11y') }));
        const newsletterSwitch = screen.getByRole('switch', {
            name: new RegExp(`Newsletter.*${t('account:marketingConsent.optedIn')}`),
        });
        await user.click(newsletterSwitch);
        await user.click(screen.getByRole('button', { name: t('account:common.save') }));

        act(() => {
            capturedOnError?.('API error');
        });
        expect(mockAddToast).toHaveBeenCalledWith(t('account:marketingConsent.updateError'), 'error');
        const newsletterSwitchAfterRevert = screen.getByRole('switch', {
            name: new RegExp(`Newsletter.*${t('account:marketingConsent.optedIn')}`),
        });
        expect(newsletterSwitchAfterRevert).toHaveAttribute('aria-checked', 'true');
    });
});
