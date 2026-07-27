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
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

const { t } = getTranslation();

// Mock the store provider hook to supply state and actions
const mockStore = {
    config: { supportedCountries: [{ countryCode: 'US', countryName: 'United States' }], geoTimeout: 1000 },
    setDeviceCoordinates: vi.fn(),
    setGeoError: vi.fn(),
    searchByForm: vi.fn(),
    searchParams: undefined as any,
};

vi.mock('@/extensions/store-locator/providers/store-locator', () => ({
    useStoreLocator: (selector: any) => selector(mockStore),
}));

// Use real useStoreLocatorForm implementation (it depends on the mocked store above)
import StoreLocatorForm from './form';

describe('StoreLocatorForm', () => {
    beforeEach(() => {
        mockStore.setDeviceCoordinates.mockClear();
        mockStore.setGeoError.mockClear();
        mockStore.searchByForm.mockClear();
        mockStore.searchParams = undefined;
    });

    test('renders fields and actions', () => {
        render(<StoreLocatorForm />);

        expect(
            screen.getByRole('combobox', { name: t('extStoreLocator:storeLocator.form.countryLabel') })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: t('extStoreLocator:storeLocator.form.postalCodeLabel') })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: t('extStoreLocator:storeLocator.form.findButton') })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: t('extStoreLocator:storeLocator.form.useMyLocationButton') })
        ).toBeInTheDocument();
    });

    test('submits form and calls search action', async () => {
        render(<StoreLocatorForm />);

        await userEvent.selectOptions(
            screen.getByRole('combobox', { name: t('extStoreLocator:storeLocator.form.countryLabel') }),
            'US'
        );
        await userEvent.type(
            screen.getByRole('textbox', { name: t('extStoreLocator:storeLocator.form.postalCodeLabel') }),
            '94105'
        );
        await userEvent.click(screen.getByRole('button', { name: t('extStoreLocator:storeLocator.form.findButton') }));

        expect(mockStore.searchByForm).toHaveBeenCalledWith({ countryCode: 'US', postalCode: '94105' });
    });

    test('uses device location when available', async () => {
        const getCurrentPosition = vi
            .fn()
            .mockImplementation((success) => success({ coords: { latitude: 10, longitude: 20 } }));
        // @ts-expect-error - partial mock
        global.navigator.geolocation = { getCurrentPosition };

        render(<StoreLocatorForm />);

        await userEvent.click(
            screen.getByRole('button', { name: t('extStoreLocator:storeLocator.form.useMyLocationButton') })
        );

        expect(mockStore.setGeoError).toHaveBeenCalledWith(false);
        expect(mockStore.setDeviceCoordinates).toHaveBeenCalledWith({ latitude: 10, longitude: 20 });
    });
});
