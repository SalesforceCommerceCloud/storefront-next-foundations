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
import type { ShopperProducts } from '@/scapi';
import PickupOrDelivery from './pickup-or-delivery';
import { useDeliveryOptions } from '@/extensions/bopis/hooks/use-delivery-options';
import { useStoreLocator } from '@/extensions/store-locator/providers/store-locator';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';
// @sfdc-extension-line SFDC_EXT_SHIPPING_DELIVERY
import { useShippingCalculator } from './use-shipping-calculator';

interface DeliveryOptionsProps {
    /** The product to check inventory for */
    product: ShopperProducts.schemas['Product'];
    /** The selected quantity to check inventory against */
    quantity: number;
    /** The pickup store for basket items. When provided, indicates item is in basket with this pickup store. When falsy, item is not in basket. */
    basketPickupStore?: SelectedStoreInfo;
    /** Additional CSS classes */
    className?: string;
}

/**
 * DeliveryOptions component that provides the complete delivery options experience.
 * This includes the pickup/delivery selection based on the store locator selection and any relevant messaging.
 *
 * @param props - The component props
 * @returns A React element representing the delivery options section
 *
 * @example
 * ```tsx
 * <DeliveryOptions
 *   product={productData}
 *   quantity={2}
 * />
 * ```
 */
export default function DeliveryOptions({
    product,
    quantity,
    basketPickupStore,
    className,
}: DeliveryOptionsProps): ReactElement | null {
    // Get store locator state and actions
    const selectedStore = useStoreLocator((state) => state.selectedStoreInfo);

    // Derive isInBasket from basketPickupStore: when truthy, item is in basket
    const isInBasket = !!basketPickupStore;

    // Use basketPickupStore if item is in basket, otherwise use currently selected store from store locator
    const pickupStore = basketPickupStore || selectedStore;

    const { selectedDeliveryOption, isStoreOutOfStock, isSiteOutOfStock, handleDeliveryOptionChange } =
        useDeliveryOptions({ product, quantity, isInBasket, pickupStore });

    // @sfdc-extension-block-start SFDC_EXT_SHIPPING_DELIVERY
    const { deliveryDays, calculatedZipCode, ShippingCalculatorSlot } = useShippingCalculator({
        isInBasket,
        product,
        selectedDeliveryOption,
    });
    // @sfdc-extension-block-end SFDC_EXT_SHIPPING_DELIVERY

    return (
        <div className={className}>
            <div className="space-y-4">
                {/* Hide title and radio options when editing from cart */}
                {!isInBasket && (
                    <>
                        <PickupOrDelivery
                            instanceId={product.id}
                            value={selectedDeliveryOption}
                            onChange={handleDeliveryOptionChange}
                            isPickupDisabled={isStoreOutOfStock}
                            pickupStore={pickupStore}
                            isDeliveryDisabled={isSiteOutOfStock}
                            // @sfdc-extension-line SFDC_EXT_SHIPPING_DELIVERY
                            deliveryZipCode={calculatedZipCode}
                            // @sfdc-extension-line SFDC_EXT_SHIPPING_DELIVERY
                            deliveryDays={deliveryDays}
                        />

                        {/* @sfdc-extension-block-start SFDC_EXT_SHIPPING_DELIVERY */}
                        {ShippingCalculatorSlot}
                        {/* @sfdc-extension-block-end SFDC_EXT_SHIPPING_DELIVERY */}
                    </>
                )}
            </div>
        </div>
    );
}
