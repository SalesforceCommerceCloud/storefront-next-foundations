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
import { useMemo, type ReactElement } from 'react';

// Commerce SDK
import type { ShopperProducts } from '@/scapi';

// Utils
import { getDisplayVariationValues } from '@/lib/product/product-utils';
import { useTranslation } from 'react-i18next';

// Constants

/**
 * BundledProductItems component that displays bundled product items
 *
 * @param props - Component props
 * @param props.bundledProducts - Array of bundled products with full product details and quantity
 * @returns JSX element with bundled product items list or null if no items
 */
export default function BundledProductItems({
    bundledProducts,
}: {
    bundledProducts: ShopperProducts.schemas['BundledProduct'][];
}): ReactElement {
    const allVariationDisplayValues = useMemo(
        () =>
            bundledProducts.map((bundledProduct) =>
                getDisplayVariationValues(
                    bundledProduct.product.variationAttributes,
                    bundledProduct.product.variationValues
                )
            ),
        [bundledProducts]
    );
    const { t } = useTranslation('cart');

    return (
        <div className="mt-2 space-y-2" data-testid="bundledProductItems">
            <div className="text-sm font-medium">{t('bundle.selectedOptions')}:</div>
            <div className="space-y-2 pl-2">
                {bundledProducts.map((bundledProduct, index) => {
                    const product = bundledProduct.product;
                    const variationDisplayValues = allVariationDisplayValues[index];

                    return (
                        <div key={product.id || index} className="space-y-0.5">
                            {/* Product name */}
                            <div className="text-sm text-foreground">{product.name}</div>

                            {/* Variation attributes */}
                            {Object.keys(variationDisplayValues).length > 0 && (
                                <div className="text-sm text-muted-foreground">
                                    {Object.entries(variationDisplayValues).map(([attrName, attrValue]) => (
                                        <span key={attrName}>
                                            {attrName}: {attrValue}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Quantity */}
                            <div className="text-sm text-muted-foreground">
                                {t('attributes.quantity')} {bundledProduct.quantity}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
