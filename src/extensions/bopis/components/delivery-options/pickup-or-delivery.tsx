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
import { type ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DELIVERY_OPTIONS, type DeliveryOption } from '@/extensions/bopis/constants';
import { useStoreLocator } from '@/extensions/store-locator/providers/store-locator';
import { getStoreName } from '@/extensions/bopis/lib/store-utils';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';

interface PickupOrDeliveryProps {
    /** Optional unique id for radio inputs (prevents duplicate-id bugs when multiple instances on page) */
    instanceId?: string;
    /** Current selected delivery option. When undefined, no option is pre-selected. */
    value?: DeliveryOption | undefined;
    /** Callback function when delivery option changes */
    onChange?: (value: DeliveryOption) => void;
    /** Whether pickup option is disabled */
    isPickupDisabled?: boolean;
    /** The pickup store for basket items, if pickup option is selected. */
    pickupStore?: SelectedStoreInfo | null;
    /** Whether delivery option is disabled */
    isDeliveryDisabled?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** ZIP code for delivery (when calculated) */
    deliveryZipCode?: string;
    /** Estimated delivery days (when calculated) */
    deliveryDays?: number;
}

/**
 * PickupOrDelivery component that allows users to choose between shipping and pickup options
 *
 * @param props - The component props
 * @returns A React element representing the pickup or delivery selection
 *
 * @example
 * ```tsx
 * <PickupOrDelivery
 *   value={DELIVERY_OPTIONS.DELIVERY}
 *   onChange={(value) => setDeliveryOption(value)}
 *   isPickupDisabled={!hasStoreInventory}
 *   pickupStore={pickupStore}
 *   isDeliveryDisabled={isSiteOutOfStock}
 * />
 * ```
 */
export default function PickupOrDelivery({
    instanceId,
    value,
    onChange,
    isPickupDisabled = false,
    pickupStore,
    isDeliveryDisabled = false,
    className,
    deliveryZipCode,
    deliveryDays,
}: PickupOrDeliveryProps): ReactElement {
    const { t } = useTranslation('extBopis');
    const deliveryId = instanceId ? `delivery-option-${instanceId}` : 'delivery-option';
    const pickupId = instanceId ? `pickup-option-${instanceId}` : 'pickup-option';
    const handleValueChange = (newValue: string) => {
        if (onChange && (newValue === DELIVERY_OPTIONS.DELIVERY || newValue === DELIVERY_OPTIONS.PICKUP)) {
            onChange(newValue as DeliveryOption);
        }
    };
    const openStoreLocator = useStoreLocator((state) => state.open);

    // Memoize storeSelectionText for performance
    const storeSelectionText = useMemo(() => {
        if (pickupStore) {
            return getStoreName(pickupStore);
        } else {
            return t('deliveryOptions.pickupOrDelivery.selectStore');
        }
    }, [pickupStore, t]);

    return (
        <div className={cn('w-full', className)}>
            <RadioGroup
                value={value}
                onValueChange={handleValueChange}
                className="grid grid-cols-2 gap-2"
                data-testid="delivery-option-select">
                {/* Delivery Card */}
                <Label
                    htmlFor={deliveryId}
                    className={cn(
                        'flex items-start gap-2 rounded-ui p-3 border transition-colors text-left shadow-xs cursor-pointer',
                        value === DELIVERY_OPTIONS.DELIVERY
                            ? 'border-primary'
                            : 'border-muted-foreground/20 hover:border-primary/50',
                        isDeliveryDisabled && 'opacity-50 cursor-not-allowed'
                    )}>
                    <RadioGroupItem
                        value={DELIVERY_OPTIONS.DELIVERY}
                        id={deliveryId}
                        disabled={isDeliveryDisabled}
                        className="sr-only"
                    />
                    <div className="mt-0.5 shrink-0">
                        <div
                            className={cn(
                                'w-4 h-4 border-2 flex items-center justify-center transition-colors',
                                value === DELIVERY_OPTIONS.DELIVERY ? 'border-primary' : 'border-muted-foreground/20'
                            )}>
                            {value === DELIVERY_OPTIONS.DELIVERY && <div className="w-2 h-2 bg-primary" />}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium leading-none text-foreground">
                                {deliveryZipCode
                                    ? t('deliveryOptions.pickupOrDelivery.deliverToZip', {
                                          zipCode: deliveryZipCode,
                                      })
                                    : t('deliveryOptions.pickupOrDelivery.deliverTo')}
                            </span>
                            <p className="text-xs font-normal leading-4 tracking-[0.12px] text-muted-foreground mt-0.5">
                                {deliveryDays
                                    ? t('deliveryOptions.pickupOrDelivery.deliveryInDays', {
                                          days: deliveryDays,
                                      })
                                    : t('deliveryOptions.pickupOrDelivery.enterZipPrompt')}
                            </p>
                        </div>
                    </div>
                </Label>

                {/* Pickup Card */}
                <Label
                    htmlFor={pickupId}
                    onClick={() => {
                        if (!isPickupDisabled && !pickupStore) {
                            openStoreLocator();
                        }
                    }}
                    className={cn(
                        'flex items-start gap-2 rounded-ui p-3 border transition-colors text-left shadow-xs cursor-pointer',
                        value === DELIVERY_OPTIONS.PICKUP
                            ? 'border-primary'
                            : 'border-muted-foreground/20 hover:border-primary/50',
                        isPickupDisabled && 'opacity-50 cursor-not-allowed'
                    )}>
                    <RadioGroupItem
                        value={DELIVERY_OPTIONS.PICKUP}
                        id={pickupId}
                        disabled={isPickupDisabled}
                        className="sr-only"
                    />
                    <div className="mt-0.5 shrink-0">
                        <div
                            className={cn(
                                'w-4 h-4 border-2 flex items-center justify-center transition-colors',
                                value === DELIVERY_OPTIONS.PICKUP ? 'border-primary' : 'border-muted-foreground/20'
                            )}>
                            {value === DELIVERY_OPTIONS.PICKUP && <div className="w-2 h-2 bg-primary" />}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium leading-none text-foreground">
                                {!isPickupDisabled
                                    ? t('deliveryOptions.pickupOrDelivery.pickUpInStore')
                                    : t('deliveryOptions.pickupOrDelivery.unavailablePickUpIn')}
                            </span>
                            {pickupStore ? (
                                <div className="mt-0.5">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openStoreLocator();
                                        }}
                                        className="text-xs text-primary hover:underline cursor-pointer">
                                        {storeSelectionText}
                                    </button>
                                    {/* Stock message - Render only if a store is selected */}
                                    {!isPickupDisabled ? (
                                        <p className="text-xs font-normal text-muted-foreground mt-1">
                                            {t('deliveryOptions.pickupOrDelivery.inStockAtStore')}
                                        </p>
                                    ) : (
                                        <p className="text-xs font-normal text-destructive mt-1">
                                            {t('deliveryOptions.pickupOrDelivery.outOfStockAtStore')}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        openStoreLocator();
                                    }}
                                    className="text-xs font-normal leading-4 tracking-[0.12px] text-muted-foreground mt-0.5 text-left hover:underline cursor-pointer">
                                    {storeSelectionText}
                                </button>
                            )}
                        </div>
                    </div>
                </Label>
            </RadioGroup>
        </div>
    );
}
