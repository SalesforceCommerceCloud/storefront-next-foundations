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
import { useTranslation } from 'react-i18next';
import type { ShopperStores } from '@/scapi';

interface StoreAddressProps {
    /** Store object containing address information */
    store: ShopperStores.schemas['Store'];
    /** Whether to show each address line on separate lines */
    multiline?: boolean;
    /** Include store name inline with first address line */
    includeStoreName?: boolean;
}

/**
 * StoreAddress
 *
 * Renders a store address in an i18n-friendly way. The field order and separators
 * come from UI strings so they can be localized per locale.
 *
 * @param store - Store object containing address information
 * @param multiline - Whether to render each line separately (default true)
 * @param includeStoreName - Include store name inline with first address line
 * @returns ReactElement | null
 *
 * @example
 * <StoreAddress store={store} />
 *
 * @example
 * <StoreAddress store={store} multiline={false} />
 *
 * @example
 * <StoreAddress store={store} includeStoreName={true} />
 */
export default function StoreAddress({ store, multiline = true, includeStoreName = false }: StoreAddressProps) {
    const { t } = useTranslation('extStoreLocator');

    if (!store) {
        return null;
    }

    const formatKey = multiline ? 'storeLocator.address.multilineFormat' : 'storeLocator.address.singleLineFormat';
    const formattedAddress = t(formatKey, {
        address1: store.address1 || '',
        city: store.city || '',
        stateCode: store.stateCode || '',
        postalCode: store.postalCode || '',
    });
    const lines = multiline ? formattedAddress.split('\n') : [formattedAddress];

    return (
        <>
            {lines.map((line, index) => (
                <div key={`address-${line}`}>
                    {index === 0 && includeStoreName && store.name && <span>{store.name} - </span>}
                    {line}
                </div>
            ))}
        </>
    );
}
