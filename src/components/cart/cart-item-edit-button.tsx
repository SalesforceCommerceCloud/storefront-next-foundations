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

// React
import { type ReactElement, useState } from 'react';

// Types
import type { ShopperBasketsV2, ShopperProducts } from '@/scapi';

// Components
import { CartItemModal } from '@/components/cart-item-modal';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// Constants

interface CartItemEditButtonProps {
    product: ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>;
    className?: string;
}

/**
 * CartItemEditButton component that renders an edit button with product modal
 *
 * This component provides:
 * - Edit item functionality with product modal
 * - Same styling as RemoveItemButtonWithConfirmation for consistency
 * - Modal for editing cart item with product variants
 *
 * Used by cart-content components for consistent edit item behavior.
 *
 * @param props - Component props
 * @returns JSX element with edit button and product modal
 */
export function CartItemEditButton({ product, className }: CartItemEditButtonProps): ReactElement {
    // Modal state management
    const { t } = useTranslation('actionCard');
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button
                variant="link"
                size="sm"
                className={cn('text-xs cursor-pointer hover:no-underline', className)}
                aria-label={`${t('edit')} ${product.productName ?? ''}`}
                data-testid={`edit-item-${product.itemId}`}
                onClick={() => setIsOpen(true)}>
                {t('edit')}
            </Button>

            {product.itemId && (
                <CartItemModal
                    open={isOpen}
                    onOpenChange={setIsOpen}
                    product={product as ShopperProducts.schemas['Product']}
                    initialQuantity={product.quantity || 1}
                    itemId={product.itemId}
                />
            )}
        </>
    );
}
