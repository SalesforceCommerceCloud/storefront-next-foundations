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
/** @sfdc-extension-file SFDC_EXT_SHIPPING_DELIVERY */
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/currency';
import { useSite } from '@salesforce/storefront-next-runtime/site-context';
import { Typography } from '@/components/typography';
// @sfdc-extension-block-start SFDC_EXT_SHIPPING_DELIVERY
import type { EstimatedDeliveryData } from '@/extensions/shipping-delivery/lib/api/shipping-delivery.server';
// @sfdc-extension-block-end SFDC_EXT_SHIPPING_DELIVERY

/**
 * Renders estimated delivery / fulfillment & shipping modal content.
 * Layout: Estimated Delivery options table, Shipping Options (rates), International Shipping, Order Tracking.
 */
export function EstimatedDeliveryModalContent({
    deliveryData,
    currency,
}: {
    deliveryData: EstimatedDeliveryData;
    currency: string;
}): ReactElement {
    const { t } = useTranslation('estimatedDelivery');
    const { site: currentSite } = useSite();
    const locale = currentSite.defaultLocale;
    const { estimatedDelivery, shippingOptions, internationalShipping, orderTracking } = deliveryData;

    return (
        <>
            {/* Estimated Delivery Options */}
            {estimatedDelivery.options.length > 0 && (
                <div>
                    <Typography variant="h5" as="h3" className="mb-3 font-medium">
                        {t('sectionHeading')}
                    </Typography>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        {estimatedDelivery.options.map((option) => (
                            <Typography key={option.name} as="p" variant="muted" className="text-sm">
                                <Typography as="span" className="font-medium text-foreground">
                                    {option.name}:
                                </Typography>{' '}
                                {option.deliveryTime}
                            </Typography>
                        ))}
                        {estimatedDelivery.note && (
                            <Typography as="p" variant="muted" className="mt-2 text-xs">
                                {estimatedDelivery.note}
                            </Typography>
                        )}
                    </div>
                </div>
            )}

            {/* Shipping Options with Rates */}
            {shippingOptions.length > 0 && (
                <div>
                    <Typography variant="h5" as="h3" className="mb-3 font-medium">
                        {t('shippingOptionsHeading')}
                    </Typography>
                    <div className="space-y-3">
                        {shippingOptions.map((option) => (
                            <div key={option.name} className="rounded-ui border border-border p-4">
                                <div className="mb-2 flex items-start justify-between">
                                    <div>
                                        <Typography as="p" className="font-medium text-foreground">
                                            {option.name}
                                        </Typography>
                                        <Typography as="p" variant="muted" className="text-sm">
                                            {option.deliveryTime}
                                        </Typography>
                                    </div>
                                    <Typography as="span" className="text-sm font-semibold text-foreground">
                                        {option.cost != null && option.cost > 0
                                            ? formatCurrency(option.cost, locale, currency)
                                            : t('free')}
                                    </Typography>
                                </div>
                                {option.condition && (
                                    <Typography as="p" variant="muted" className="text-xs">
                                        {option.condition}
                                    </Typography>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* International Shipping */}
            <div>
                <Typography variant="h5" as="h3" className="mb-3 font-medium">
                    {internationalShipping.heading}
                </Typography>
                {internationalShipping.points.length > 0 && (
                    <div className="space-y-2 text-sm text-foreground">
                        {internationalShipping.points.map((point) => (
                            <Typography key={point} as="p" className="text-sm leading-relaxed text-foreground">
                                {point}
                            </Typography>
                        ))}
                        {internationalShipping.note && (
                            <Typography as="p" variant="muted" className="mt-2 text-xs">
                                {internationalShipping.note}
                            </Typography>
                        )}
                    </div>
                )}
            </div>

            {/* Order Tracking */}
            <div>
                <Typography variant="h5" as="h3" className="mb-3 font-medium">
                    {orderTracking.heading}
                </Typography>
                {orderTracking.points.length > 0 && (
                    <div className="space-y-2 text-sm text-foreground">
                        {orderTracking.points.map((point) => (
                            <Typography key={point} as="p" className="text-sm leading-relaxed text-foreground">
                                {point}
                            </Typography>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
