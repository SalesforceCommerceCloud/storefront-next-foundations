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
import { useCheckoutContext } from '@/hooks/use-checkout';
import CheckoutPickup from './checkout-pickup';

/**
 * Wrapper component that resolves productMap Promise within Suspense boundary for CheckoutPickup.
 */
export default function CheckoutPickupWithData({
    cart,
    productMapPromise,
    isEditing,
    onEdit,
    onContinue,
    continueButtonLabel,
}: {
    cart: ShopperBasketsV2.schemas['Basket'];
    productMapPromise: Promise<Record<string, ShopperProducts.schemas['Product']>>;
    isEditing: boolean;
    onEdit: () => void;
    onContinue: () => void;
    continueButtonLabel: string;
}) {
    // Avoid rendering until the shipping defaults are set in the basket.
    // Pickup address and method setting failure will be caught by checkout error boundary.
    const checkoutContext = useCheckoutContext();
    use(checkoutContext.shippingDefaultSet);

    // Only resolve the productMap promise when editing; pass undefined for summary view since product details aren't needed
    const productsByItemId = isEditing ? use(productMapPromise) : undefined;

    return (
        <CheckoutPickup
            cart={cart}
            productsByItemId={productsByItemId}
            isEditing={isEditing}
            onEdit={onEdit}
            onContinue={onContinue}
            continueButtonLabel={continueButtonLabel}
        />
    );
}
