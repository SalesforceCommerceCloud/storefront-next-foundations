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
import { use } from 'react';
import type { ShopperBasketsV2, ShopperProducts } from '@/scapi';
import type { CheckoutActionData } from '@/components/checkout/types';
import ShippingMultiAddress from './shipping-multi-address';

/**
 * Wrapper component that resolves productMap Promise within Suspense boundary for ShippingMultiAddress.
 */
export default function ShippingMultiAddressWithData({
    isLoading,
    isEditing,
    actionData,
    productMapPromise,
    isDeliveryProductItem,
    deliveryShipments,
    handleToggleShippingAddressMode,
    onEdit,
    onSubmit,
    isCompleted,
    hasMultipleDeliveryAddresses,
    ...shippingAddressState
}: {
    isLoading: boolean;
    isEditing: boolean;
    actionData?: CheckoutActionData;
    productMapPromise: Promise<Record<string, ShopperProducts.schemas['Product']>>;
    isDeliveryProductItem: (item: ShopperBasketsV2.schemas['ProductItem']) => boolean;
    deliveryShipments: ShopperBasketsV2.schemas['Shipment'][];
    handleToggleShippingAddressMode: () => void;
    onEdit: () => void;
    onSubmit: (formData: FormData) => void;
    isCompleted?: boolean;
    hasMultipleDeliveryAddresses?: boolean;
}) {
    // Only resolve the productMap promise when editing; pass undefined for summary view since product details aren't needed
    const productMap = isEditing ? use(productMapPromise) : undefined;

    return (
        <ShippingMultiAddress
            isLoading={isLoading}
            isEditing={isEditing}
            actionData={actionData}
            productMap={productMap}
            isDeliveryProductItem={isDeliveryProductItem}
            deliveryShipments={deliveryShipments}
            handleToggleShippingAddressMode={handleToggleShippingAddressMode}
            onEdit={onEdit}
            onSubmit={onSubmit}
            isCompleted={isCompleted}
            hasMultipleDeliveryAddresses={hasMultipleDeliveryAddresses}
            {...shippingAddressState}
        />
    );
}
