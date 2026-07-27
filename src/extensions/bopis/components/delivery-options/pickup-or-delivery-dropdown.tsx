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
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { DELIVERY_OPTIONS, type DeliveryOption } from '@/extensions/bopis/constants';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Store, ShoppingCart } from 'lucide-react';
export interface PickupOrDeliveryDropdownProps {
    value: DeliveryOption;
    onChange: (v: DeliveryOption) => void;
    isPickupDisabled?: boolean;
    isDeliveryDisabled?: boolean;
}

export default function PickupOrDeliveryDropdown({
    value,
    onChange,
    isPickupDisabled = false,
    isDeliveryDisabled = false,
}: PickupOrDeliveryDropdownProps) {
    const { t } = useTranslation('extBopis');
    const isPickup = value === DELIVERY_OPTIONS.PICKUP;
    const text = isPickup
        ? t('deliveryOptions.pickupOrDelivery.storePickupLabel')
        : t('deliveryOptions.pickupOrDelivery.delivery');

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'mb-1 w-fit px-2 border-0 bg-muted text-xs font-medium text-foreground flex items-center justify-center gap-1 hover:bg-accent transition-colors'
                    )}>
                    {isPickup ? <Store className="size-3" /> : <ShoppingCart className="size-3" />}
                    <span>{text}</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="p-0 min-w-[200px]">
                <DropdownMenuItem
                    onSelect={() => !isDeliveryDisabled && onChange(DELIVERY_OPTIONS.DELIVERY)}
                    className={cn(
                        'flex-row px-4 py-2',
                        value === DELIVERY_OPTIONS.DELIVERY && 'text-primary font-semibold',
                        isDeliveryDisabled && 'opacity-50 pointer-events-none'
                    )}>
                    {value === DELIVERY_OPTIONS.DELIVERY && <span className="mr-2">✓</span>}
                    {t('deliveryOptions.pickupOrDelivery.shipToAddress')}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={() => !isPickupDisabled && onChange(DELIVERY_OPTIONS.PICKUP)}
                    className={cn(
                        'flex-row px-4 py-2',
                        value === DELIVERY_OPTIONS.PICKUP && 'text-primary font-semibold',
                        isPickupDisabled && 'opacity-50 pointer-events-none'
                    )}>
                    {value === DELIVERY_OPTIONS.PICKUP && <span className="mr-2">✓</span>}
                    {t('deliveryOptions.pickupOrDelivery.storePickup')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
