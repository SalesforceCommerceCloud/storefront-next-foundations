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
import { Typography } from '@/components/typography';
import { Badge } from '@/components/ui/badge';
import { getCountryName, getStateName } from '@/components/customer-address-form';
import { useTranslation } from 'react-i18next';
import type { ShopperBasketsV2, ShopperCustomers } from '@/scapi';

interface AddressDisplayProps {
    address: ShopperBasketsV2.schemas['OrderAddress'] | ShopperCustomers.schemas['CustomerAddress'];
    showName?: boolean;
    isPreferred?: boolean;
}

export default function AddressDisplay({ address, showName = true, isPreferred = false }: AddressDisplayProps) {
    const { t } = useTranslation('account');
    if (!address) {
        return (
            <Typography variant="small" className="text-muted-foreground">
                No address provided
            </Typography>
        );
    }

    // Build the location line: postalCode, city, state, country
    const locationParts: string[] = [];
    if (address.postalCode) locationParts.push(address.postalCode);
    if (address.city) locationParts.push(address.city);
    if (address.stateCode && address.countryCode) {
        const stateName = getStateName(address.countryCode as 'US' | 'CA', address.stateCode);
        locationParts.push(stateName || address.stateCode);
    } else if (address.stateCode) {
        locationParts.push(address.stateCode);
    }
    if (address.countryCode) {
        const countryName = getCountryName(address.countryCode as 'US' | 'CA');
        locationParts.push(countryName || address.countryCode);
    }

    const fullName = [address.firstName, address.lastName].filter(Boolean).join(' ');

    return (
        <div className="space-y-1">
            {showName && fullName && (
                <div className="flex items-center gap-2">
                    <Typography variant="p" className="font-medium">
                        {fullName}
                    </Typography>
                    {isPreferred && (
                        <Badge variant="secondary" className="text-xs font-normal bg-primary/10 text-primary">
                            {t('addresses.default')}
                        </Badge>
                    )}
                </div>
            )}
            <Typography variant="small" className="text-muted-foreground">
                {address.address1}
            </Typography>
            <Typography variant="small" className="text-muted-foreground">
                {locationParts.join(', ')}
            </Typography>
        </div>
    );
}
