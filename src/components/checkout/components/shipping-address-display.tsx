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
import type { ReactElement } from 'react';
import { Typography } from '@/components/typography';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import type { AddressBookItem } from '@/lib/customer/profile-utils';
import { formatAddress, isAddressEmpty } from '@/lib/address/address-utils';
import { stripCountryCode } from '@/lib/address/phone-utils';

export type ShippingAddressDisplayProps = {
    /** Address to display (order/basket address shape). When null/undefined or empty, nothing is rendered. */
    address?: Partial<AddressBookItem> | null;
    /** When true, display address.phone at the end. Default false (phone not shown). */
    displayPhone?: boolean;
    /** Shipping Address display variant */
    variant?: 'summary' | 'card';
};

/**
 * Shipping address display – same structure as checkout shipping-address summary.
 * When address is missing or empty, renders nothing. Used in checkout and order details.
 */
export function ShippingAddressDisplay({
    address,
    displayPhone = false,
    variant = 'summary',
}: ShippingAddressDisplayProps): ReactElement {
    const { t } = useTranslation('checkout');

    if (!address || isAddressEmpty(address)) {
        return <></>;
    }

    const isCard = variant === 'card';
    const { nameLine, streetLine, cityLine } = formatAddress(address);

    return (
        <div className={isCard ? 'space-y-1.5' : 'text-sm font-normal leading-5 text-foreground'}>
            <div className={isCard ? 'flex flex-wrap items-center gap-2' : undefined}>
                {isCard ? (
                    <>
                        <Typography variant="small" className="text-sm font-medium text-foreground">
                            {nameLine}
                        </Typography>
                        {address.preferred && (
                            <Badge variant="secondary" className="text-xs font-normal bg-primary/10 text-primary">
                                {t('shippingAddress.defaultBadge')}
                            </Badge>
                        )}
                    </>
                ) : (
                    <p>{nameLine}</p>
                )}
            </div>
            {streetLine &&
                (isCard ? (
                    <Typography variant="small" className="text-sm text-muted-foreground">
                        {streetLine}
                    </Typography>
                ) : (
                    <p>{streetLine}</p>
                ))}
            {cityLine &&
                (isCard ? (
                    <Typography variant="small" className="text-sm text-muted-foreground">
                        {cityLine}
                    </Typography>
                ) : (
                    <p>{cityLine}</p>
                ))}
            {displayPhone &&
                address.phone &&
                (isCard ? (
                    <Typography variant="small" className="text-sm text-muted-foreground">
                        {stripCountryCode(address.phone)}
                    </Typography>
                ) : (
                    <p>{stripCountryCode(address.phone)}</p>
                ))}
        </div>
    );
}

export default ShippingAddressDisplay;
