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

import type { ReactElement } from 'react';
import type { ShopperProducts } from '@/scapi';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useTranslation } from 'react-i18next';

interface ProductAccordionProps {
    product: ShopperProducts.schemas['Product'];
}

export default function ProductAccordion({ product }: ProductAccordionProps): ReactElement {
    const { t } = useTranslation('product');

    return (
        <div className="max-w-4xl">
            <Accordion type="multiple" className="w-full">
                {/* Product Details */}
                <AccordionItem value="details">
                    <AccordionTrigger className="text-left font-semibold text-sm">
                        {t('productDetails')}
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-4 text-muted-foreground">
                            {product.longDescription ? (
                                <div className="prose prose-sm max-w-none">{product.longDescription}</div>
                            ) : (
                                <p>{product.shortDescription || t('noDetailedDescription')}</p>
                            )}

                            {/* Additional product attributes */}
                            {product.brand && (
                                <div>
                                    <strong>{t('brand')}</strong> {product.brand}
                                </div>
                            )}

                            {product.manufacturerName && (
                                <div>
                                    <strong>{t('manufacturer')}</strong> {product.manufacturerName}
                                </div>
                            )}

                            {product.manufacturerSku && (
                                <div>
                                    <strong>{t('sku')}</strong> {product.manufacturerSku}
                                </div>
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Size & Fit */}
                <AccordionItem value="size-fit">
                    <AccordionTrigger className="text-left font-semibold text-sm">{t('sizeAndFit')}</AccordionTrigger>
                    <AccordionContent>
                        <div className="text-muted-foreground">
                            <p>{t('sizeAndFitComingSoon')}</p>
                            {/* Future: Add size chart, fit guide, etc. */}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Shipping & Returns */}
                <AccordionItem value="shipping">
                    <AccordionTrigger className="text-left font-semibold text-sm">
                        {t('shippingAndReturns')}
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="text-muted-foreground space-y-2">
                            <p>
                                <strong>{t('freeShipping')}</strong>
                            </p>
                            <p>
                                <strong>{t('standardShipping')}</strong>
                            </p>
                            <p>
                                <strong>{t('expressShipping')}</strong>
                            </p>
                            <p>
                                <strong>{t('returns')}</strong>
                            </p>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Care Instructions */}
                {product.type?.item && (
                    <AccordionItem value="care">
                        <AccordionTrigger className="text-left font-semibold text-sm">
                            {t('careInstructions')}
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="text-muted-foreground">
                                <p>{t('careInstructionsComingSoon')}</p>
                                {/* Future: Add care instruction details */}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}
            </Accordion>
        </div>
    );
}
