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

import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/spinner';
import AddressDisplay from '@/components/address-display';
import type { ShopperCustomers } from '@/scapi';

interface AddressCardProps {
    /** The address data to display */
    address: ShopperCustomers.schemas['CustomerAddress'];
    /** Callback function called when the edit button is clicked */
    onEdit?: () => void;
    /** Callback function called when the remove button is clicked */
    onRemove?: () => void;
    /** Callback function called when the set default button is clicked */
    onSetDefault?: () => void;
    /** Whether this address is the preferred address */
    isPreferred?: boolean;
    /** Whether the remove action is in progress */
    isRemoving?: boolean;
    /** Whether the set default action is in progress */
    isSettingDefault?: boolean;
}

/**
 * AddressCard component displays a single customer address with edit and remove actions.
 *
 * This component provides a card-based layout for displaying address information
 * with optional edit and remove handlers. It uses the AddressDisplay component
 * for consistent address formatting and shadcn/ui components for styling.
 *
 * @param props - Component props
 * @returns JSX element representing the address card
 *
 * @example
 * ```tsx
 * <AddressCard
 *   address={customerAddress}
 *   onEdit={() => handleEdit(address.addressId)}
 *   onRemove={() => handleRemove(address.addressId)}
 *   isPreferred={address.preferred}
 * />
 * ```
 */
export default function AddressCard({
    address,
    onEdit,
    onRemove,
    onSetDefault,
    isPreferred = false,
    isRemoving = false,
    isSettingDefault = false,
}: AddressCardProps): ReactElement {
    const { t } = useTranslation(['account', 'actionCard']);

    const isLoading = isRemoving || isSettingDefault;

    return (
        <Card
            data-testid="address-card"
            className={`gap-0 py-4 relative ${isPreferred ? '[--ui-border-width:2px] border-primary' : ''}`}>
            <CardContent className="px-6 pt-4">
                <AddressDisplay address={address} showName={true} isPreferred={isPreferred} />
            </CardContent>
            {(onEdit || onRemove || onSetDefault) && (
                <CardFooter className="gap-4 px-6 pt-2">
                    {onEdit && (
                        <Button
                            onClick={onEdit}
                            variant="link"
                            size="sm"
                            className="font-bold px-0"
                            aria-label={t('account:addresses.editAddress')}>
                            {t('account:addresses.editAddress')}
                        </Button>
                    )}
                    {onSetDefault && (
                        <Button
                            onClick={onSetDefault}
                            variant="link"
                            size="sm"
                            className={`font-bold px-0 ${isPreferred ? 'text-muted-foreground cursor-not-allowed' : ''}`}
                            aria-label={t('account:addresses.setDefault')}
                            disabled={isPreferred || isSettingDefault}>
                            {t('account:addresses.setDefault')}
                        </Button>
                    )}
                    {onRemove && (
                        <Button
                            onClick={onRemove}
                            variant="link"
                            size="sm"
                            className="font-bold px-0"
                            aria-label={t('actionCard:remove')}
                            disabled={isRemoving}>
                            {t('actionCard:remove')}
                        </Button>
                    )}
                </CardFooter>
            )}
            {/* Loading Spinner Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 pointer-events-none flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            )}
        </Card>
    );
}
