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
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCardIcon } from '@/lib/payment/card-icon-utils';
import { getCardTypeDisplay } from '@/lib/payment/payment-utils';
import type { ShopperBasketsV2 } from '@/scapi';

export interface PaymentMethod {
    id: string;
    type: string;
    last4: string;
    expiryMonth: string;
    expiryYear: string;
    cardholderName: string;
    isDefault: boolean;
}

export interface PaymentMethodCardProps {
    paymentMethod: PaymentMethod;
    onRemove?: () => void;
    onSetDefault?: () => void;
}

/**
 * Payment method card component that displays a payment method
 * with actions to remove or set as default
 */
export function PaymentMethodCard({ paymentMethod, onRemove, onSetDefault }: PaymentMethodCardProps): ReactElement {
    const { t } = useTranslation('account');

    // Use lib utility to normalize card type
    const displayName = getCardTypeDisplay({
        paymentCard: { cardType: paymentMethod.type },
    } as ShopperBasketsV2.schemas['OrderPaymentInstrument']);
    const CardIcon = getCardIcon(displayName);

    return (
        <Card className={`p-6 ${paymentMethod.isDefault ? 'border-primary' : ''}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                    {/* Card Title */}
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-base font-medium text-foreground">
                            {displayName} **** {paymentMethod.last4}
                        </span>
                        {paymentMethod.isDefault && (
                            <Badge variant="secondary" className="text-xs font-normal bg-primary/10 text-primary">
                                {t('paymentMethods.default')}
                            </Badge>
                        )}
                    </div>

                    {/* Card Details */}
                    <p className="text-sm text-muted-foreground mb-4">
                        {t('paymentMethods.expires')} {paymentMethod.expiryMonth}/{paymentMethod.expiryYear} |{' '}
                        {paymentMethod.cardholderName}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        <Button
                            variant="link"
                            size="sm"
                            disabled={paymentMethod.isDefault}
                            onClick={onSetDefault}
                            className="h-auto p-0 text-sm cursor-pointer">
                            {t('paymentMethods.setDefault')}
                        </Button>
                        <Button
                            variant="link"
                            size="sm"
                            onClick={onRemove}
                            className="h-auto p-0 text-sm cursor-pointer">
                            {t('paymentMethods.remove')}
                        </Button>
                    </div>
                </div>

                {/* Card Type Icon - Right Side */}
                <div className="flex-shrink-0 flex items-center" aria-hidden="true">
                    <CardIcon width={40} height={32} className="max-w-[40px] max-h-[32px]" />
                </div>
            </div>
        </Card>
    );
}
