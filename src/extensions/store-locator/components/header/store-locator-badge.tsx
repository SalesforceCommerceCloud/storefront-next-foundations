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
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { MapPin, Store } from 'lucide-react';
import { SelectedStoreBoundary, useStoreLocator } from '@/extensions/store-locator/providers/store-locator';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';

/**
 * StoreLocatorBadge
 *
 * Opens the Store Locator extension's shared sheet host. The host lazy-loads the
 * sheet only after the shopper requests it, so every Store Locator entry point
 * presents the same dialog without duplicating dialog state or markup.
 *
 * @returns ReactElement
 *
 * @example
 * // Render in the site header
 * import StoreLocatorBadge from '@/extensions/store-locator/components/header/store-locator-badge';
 *
 * export function HeaderRightActions() {
 *     return (
 *         <nav>
 *             <StoreLocatorBadge />
 *         </nav>
 *     );
 * }
 */
export default function StoreLocatorBadge(): ReactElement {
    return (
        <SelectedStoreBoundary
            fallback={<span data-header-control className="inline-block h-9 w-9 lg:w-32" aria-hidden="true" />}>
            {(selection) => <StoreLocatorBadgeContent selection={selection} />}
        </SelectedStoreBoundary>
    );
}

function StoreLocatorBadgeContent({ selection }: { selection?: SelectedStoreInfo | null }): ReactElement {
    const { t } = useTranslation('extStoreLocator');
    const entry = useConfig().features?.storeEntry;
    const currentSelection = useStoreLocator((state) => state.selectedStoreInfo);
    const selectedStoreInfo = selection === undefined ? currentSelection : selection;
    const isOpen = useStoreLocator((state) => state.isOpen);
    const openStoreLocator = useStoreLocator((state) => state.open);
    const openSelectedStore = useStoreLocator((state) => state.openSelectedStore);
    const distanceUnit = useStoreLocator((state) => state.config.radiusUnit);
    const selectedStoreLabel =
        selectedStoreInfo && typeof selectedStoreInfo.distance === 'number'
            ? `${selectedStoreInfo.name} · ${t('storeLocator.details.distanceAway', {
                  distance: selectedStoreInfo.distance.toFixed(2),
                  unit: distanceUnit,
              })}`
            : selectedStoreInfo?.name;
    const modeLabel =
        entry?.enabled && selectedStoreInfo?.fulfillmentMode
            ? t(`storeLocator.entry.${selectedStoreInfo.fulfillmentMode}`)
            : undefined;
    const entryAriaLabel =
        modeLabel && selectedStoreInfo
            ? t('storeLocator.entry.current', { store: selectedStoreLabel ?? selectedStoreInfo.id, mode: modeLabel })
            : undefined;
    const storeAriaLabel = selectedStoreInfo
        ? selectedStoreInfo.postalCode
            ? t('storeLocator.trigger.selectedAriaLabel', {
                  storeName: selectedStoreLabel,
                  postalCode: selectedStoreInfo.postalCode,
              })
            : t('storeLocator.trigger.selectedWithoutPostalAriaLabel', { storeName: selectedStoreLabel })
        : t('storeLocator.trigger.chooseAriaLabel');
    const triggerClassName =
        'hover:bg-transparent hover:text-inherit! hover:opacity-50 transition-opacity max-lg:w-9 max-lg:px-0! lg:w-auto! lg:max-w-64 lg:px-3!';
    const openSelectedStoreLocator = selectedStoreInfo ? openSelectedStore : openStoreLocator;

    return (
        <Button
            variant="ghost"
            className={triggerClassName}
            onClick={() => openSelectedStoreLocator()}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-label={entryAriaLabel ?? storeAriaLabel}
            data-slot={selectedStoreInfo?.postalCode ? 'store-locator-selected-store' : 'button'}>
            <Store className="size-6" aria-hidden="true" />
            {modeLabel && (
                <span
                    className="shrink-0 whitespace-normal break-words text-start text-xs"
                    data-slot="store-locator-fulfillment">
                    {modeLabel}
                </span>
            )}
            <span data-header-label className="hidden max-w-40 truncate lg:inline">
                {selectedStoreInfo ? selectedStoreLabel : storeAriaLabel}
            </span>
            {selectedStoreInfo?.postalCode && (
                <>
                    <span
                        data-header-detail
                        className="mx-0.5 hidden h-4 w-px bg-current/30 lg:block"
                        aria-hidden="true"
                    />
                    <MapPin data-header-detail className="size-5" aria-hidden="true" />
                    <span data-header-label className="hidden max-w-40 shrink-0 truncate lg:inline">
                        {selectedStoreInfo.postalCode}
                    </span>
                </>
            )}
        </Button>
    );
}
