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
import { beforeEach, describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import AuthProvider from '@/providers/auth';
import type { SessionData } from '@/lib/api/types';
vi.mock('@/extensions/store-locator/providers/selection', () => ({
    default: ({ children }: { children: React.ReactNode }) => children,
}));

const { t } = getTranslation();
const guestSession: SessionData = { userType: 'guest' };
const registeredSession: SessionData = { userType: 'registered', customerId: 'test-customer-1' };

function renderBadge(session?: SessionData) {
    return render(
        <AllProvidersWrapper>
            {session ? (
                <AuthProvider value={session}>
                    <StoreLocatorBadge />
                </AuthProvider>
            ) : (
                <StoreLocatorBadge />
            )}
        </AllProvidersWrapper>
    );
}

const openStoreLocator = vi.fn();
const openSelectedStoreLocator = vi.fn();
const storeLocatorState = {
    selectedStoreInfo: null as { id: string; name?: string; postalCode?: string; distance?: number } | null,
    isOpen: false,
    open: openStoreLocator,
    openSelectedStore: openSelectedStoreLocator,
    config: { radiusUnit: 'mi' as const },
};

vi.mock('@/extensions/store-locator/providers/store-locator', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/extensions/store-locator/providers/store-locator')>();
    return {
        ...actual,
        useStoreLocator: (selector: (state: typeof storeLocatorState) => unknown) => selector(storeLocatorState),
    };
});

import StoreLocatorBadge from './store-locator-badge';

describe('StoreLocatorBadge', () => {
    beforeEach(() => {
        openStoreLocator.mockClear();
        openSelectedStoreLocator.mockClear();
        storeLocatorState.selectedStoreInfo = null;
        storeLocatorState.isOpen = false;
    });

    test('renders initial trigger button', () => {
        renderBadge();

        const trigger = screen.getByRole('button', {
            name: t('extStoreLocator:storeLocator.trigger.chooseAriaLabel'),
        });
        expect(trigger).toBeInTheDocument();
        expect(trigger).toHaveTextContent(t('extStoreLocator:storeLocator.trigger.chooseAriaLabel'));
        expect(trigger.querySelector('.lucide-store')).toBeInTheDocument();
        expect(trigger).toHaveClass('hover:opacity-50');
        expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');

        expect(
            screen.queryByRole('button', { name: t('extStoreLocator:storeLocator.trigger.openAriaLabel') })
        ).not.toBeInTheDocument();
    });

    test('opens the shared Store Locator sheet host when clicked', async () => {
        renderBadge();

        await userEvent.click(
            screen.getByRole('button', { name: t('extStoreLocator:storeLocator.trigger.chooseAriaLabel') })
        );

        expect(openStoreLocator).toHaveBeenCalledOnce();
    });

    test('reports the sheet as expanded while it is open', () => {
        storeLocatorState.isOpen = true;
        renderBadge();

        expect(
            screen.getByRole('button', { name: t('extStoreLocator:storeLocator.trigger.chooseAriaLabel') })
        ).toHaveAttribute('aria-expanded', 'true');
    });

    test.each([
        ['guest', guestSession],
        ['registered', registeredSession],
    ])('uses the same choose-store trigger for %s shoppers', (_shopperType, session) => {
        renderBadge(session);

        const trigger = screen.getByRole('button', {
            name: t('extStoreLocator:storeLocator.trigger.chooseAriaLabel'),
        });
        expect(trigger).toHaveTextContent(t('extStoreLocator:storeLocator.trigger.chooseAriaLabel'));
        expect(trigger.querySelector('.lucide-store')).toBeInTheDocument();
        expect(trigger.querySelector('.lucide-map-pin')).not.toBeInTheDocument();
        expect(trigger).toHaveClass('hover:opacity-50');
    });

    test('displays the selected store name and postal code in one dialog trigger', () => {
        storeLocatorState.selectedStoreInfo = {
            id: 'store-1',
            name: 'Downtown Store',
            postalCode: '94105',
            distance: 1.2,
        };
        renderBadge();

        const trigger = screen.getByRole('button', {
            name: 'Change your store: Downtown Store · 1.20 mi away, 94105',
        });
        expect(trigger).toHaveTextContent('Downtown Store · 1.20 mi away');
        expect(trigger).toHaveTextContent('94105');
        expect(trigger.querySelector('.lucide-map-pin')).toBeInTheDocument();
        expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    test('opens the shared Store Locator sheet from the selected-store trigger', async () => {
        storeLocatorState.selectedStoreInfo = {
            id: 'store-1',
            name: 'Downtown Store',
            postalCode: '94105',
            distance: 1.2,
        };
        renderBadge();

        await userEvent.click(
            screen.getByRole('button', { name: 'Change your store: Downtown Store · 1.20 mi away, 94105' })
        );
        expect(openSelectedStoreLocator).toHaveBeenCalledOnce();
        expect(openStoreLocator).not.toHaveBeenCalled();
    });
});
