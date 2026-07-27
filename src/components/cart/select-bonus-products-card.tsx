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
import { Button } from '@/components/ui/button';
import type { BonusPromotionInfo } from '@/lib/cart/bonus-product-utils';
import { useTranslation } from 'react-i18next';

interface SelectBonusProductsCardProps {
    promotion: BonusPromotionInfo;
    onSelectClick?: () => void;
}

/**
 * Card component that displays promotion text and button for selecting bonus products
 * Attached to a specific product item in the cart when only one item qualifies for the promotion
 *
 * Based on PWA Kit's SelectBonusProductsCard pattern
 *
 * @param promotion - Bonus promotion information with callout text and capacity
 * @param onSelectClick - Callback when the select button is clicked
 * @returns Card with promotion text and button
 *
 * @example
 * <SelectBonusProductsCard
 *   promotion={bonusPromoInfo}
 *   onSelectClick={() => navigate('/cart')}
 * />
 */
export default function SelectBonusProductsCard({
    promotion,
    onSelectClick,
}: SelectBonusProductsCardProps): ReactElement {
    const { t } = useTranslation('cart');

    return (
        <div className="flex flex-col gap-2" data-testid={`select-bonus-products-card-${promotion.promotionId}`}>
            {/* Select Button */}
            <Button
                variant="secondary"
                className="w-full"
                onClick={onSelectClick}
                data-testid={`select-bonus-products-button-${promotion.promotionId}`}>
                {t('bonusProducts.selectBonusProducts')}
            </Button>
        </div>
    );
}
