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
import { useState, useRef, type ReactElement } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AddressBookItem } from '@/lib/customer/profile-utils';
import ShippingAddressDisplay from './shipping-address-display';
import { useTranslation } from 'react-i18next';

const DEFAULT_MAX_VISIBLE = 3;

export type SavedAddressesListProps = {
    /** List of saved addresses to display */
    addresses: AddressBookItem[];
    /** Max number of addresses shown before "View All" (default 3) */
    maxVisible?: number;
    /** Currently selected address id (controlled) */
    value?: string;
    /** Callback when selection changes */
    onValueChange?: (value: string) => void;
    /** Called when "Add New Address" is clicked */
    onAddNewAddress?: () => void;
    /** Called when "Edit Address" is clicked for a specific address */
    onEditAddress?: (addressId: string) => void;
};

/**
 * Displays multiple saved addresses as selectable cards in the Shipping Address checkout stage.
 * Shows up to maxVisible (default 3) with a "View All" control to expand. Default selection is the preferred address.
 */
export function SavedAddressesList({
    addresses,
    maxVisible = DEFAULT_MAX_VISIBLE,
    value,
    onValueChange,
    onAddNewAddress,
    onEditAddress,
}: SavedAddressesListProps): ReactElement {
    const { t } = useTranslation('checkout');
    const [showAll, setShowAll] = useState(false);
    const radioGroupRef = useRef<HTMLDivElement>(null);

    if (addresses.length === 0) {
        return <></>;
    }

    const defaultSelected = value ?? addresses.find((a) => a.preferred)?.id ?? addresses[0]?.id ?? '';
    const selectedId = value ?? defaultSelected;
    const visibleAddresses = showAll ? addresses : addresses.slice(0, maxVisible);
    const hasMore = addresses.length > maxVisible;
    const moreCount = hasMore ? addresses.length - maxVisible : 0;

    const handleViewLess = () => {
        setShowAll(false);
        // Scroll to center the address list in viewport after collapsing
        setTimeout(() => {
            if (radioGroupRef.current) {
                const element = radioGroupRef.current;
                const elementRect = element.getBoundingClientRect();
                const elementTop = elementRect.top + window.scrollY;
                const elementHeight = elementRect.height;
                const viewportHeight = window.innerHeight;

                // Center the element in the viewport
                const offsetPosition = elementTop - viewportHeight / 2 + elementHeight / 2;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth',
                });
            }
        }, 50);
    };

    return (
        <div className="space-y-4">
            {onAddNewAddress && (
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onAddNewAddress}
                        aria-label={t('shippingAddress.addNewAddressButton')}>
                        {t('shippingAddress.addNewAddressButton')}
                    </Button>
                </div>
            )}
            <div ref={radioGroupRef}>
                <RadioGroup
                    value={selectedId}
                    onValueChange={onValueChange}
                    className="space-y-2"
                    aria-label={t('shippingAddress.selectSavedAddress')}>
                    {visibleAddresses.map((addr) => {
                        const isSelected = selectedId === addr.id;
                        return (
                            <div
                                key={addr.id}
                                className={cn(
                                    'group flex items-start gap-2 transition-all duration-200',
                                    isSelected ? 'rounded-ui border border-primary p-4' : 'gap-3'
                                )}>
                                <RadioGroupItem
                                    value={addr.id}
                                    id={`saved-address-${addr.id}`}
                                    className="mt-0.5 size-4 shrink-0"
                                />
                                <Label htmlFor={`saved-address-${addr.id}`} className="flex-1 cursor-pointer min-w-0">
                                    <div className="space-y-1.5">
                                        <ShippingAddressDisplay address={addr} variant="card" />
                                        {onEditAddress && (
                                            <Button
                                                type="button"
                                                variant="link"
                                                size="sm"
                                                className="px-0 h-auto font-medium underline"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    onEditAddress(addr.id);
                                                }}
                                                aria-label={t('shippingAddress.editAddressLink')}>
                                                {t('shippingAddress.editAddressLink')}
                                            </Button>
                                        )}
                                    </div>
                                </Label>
                            </div>
                        );
                    })}
                </RadioGroup>
            </div>
            {hasMore && (
                <div>
                    {!showAll ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-sm font-medium text-foreground"
                            onClick={() => setShowAll(true)}
                            aria-expanded={false}
                            aria-label={t('shippingAddress.viewAllLink')}>
                            {t('shippingAddress.viewAllLink')} {t('shippingAddress.viewAllMore', { count: moreCount })}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-sm font-medium text-foreground"
                            onClick={handleViewLess}
                            aria-expanded={true}
                            aria-label={t('shippingAddress.viewLessAddresses')}>
                            {t('shippingAddress.viewLessAddresses')}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

export default SavedAddressesList;
