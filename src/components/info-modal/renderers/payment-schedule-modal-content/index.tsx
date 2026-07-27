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
import { formatCurrency } from '@/lib/currency';
import { Typography } from '@/components/typography';
import { cn } from '@/lib/utils';
import type { PaymentSchedule, StepInfo } from '../../types';
import { useTranslation } from 'react-i18next';

/**
 * Renders payment schedule modal content (e.g., "Pay in 4").
 * Layout: Payment Schedule (timeline row + amounts row), How it works (numbered list), disclaimer box.
 */
export function PaymentScheduleModalContent({
    paymentSchedule,
    steps,
    disclaimer,
    currency,
}: {
    paymentSchedule?: PaymentSchedule;
    steps?: StepInfo[];
    disclaimer?: string;
    currency: string;
}): ReactElement {
    const { i18n } = useTranslation();
    return (
        <>
            {paymentSchedule && paymentSchedule.payments.length > 0 && (
                <div>
                    <h3 className="mb-4 text-sm font-medium text-foreground">Payment Schedule</h3>
                    <div className="space-y-4">
                        {/* 7-column layout: dot, line, dot, line, dot, line, dot — each dot directly above its amount */}
                        <div className="flex items-center">
                            {paymentSchedule.payments.flatMap((payment, index) =>
                                index < paymentSchedule.payments.length - 1
                                    ? [
                                          <div
                                              key={`dot-${payment.amount}-${payment.dueDate}`}
                                              className="flex flex-1 justify-center min-w-0">
                                              <div
                                                  className={cn(
                                                      'h-3 w-3 flex-shrink-0 rounded-full',
                                                      index === 0 ? 'bg-primary' : 'bg-muted-foreground/50'
                                                  )}
                                              />
                                          </div>,
                                          <div
                                              key={`line-${payment.amount}-${payment.dueDate}`}
                                              className="mx-0.5 h-0 min-w-[4px] flex-1 border-t-2 border-dashed border-muted-foreground/50"
                                              aria-hidden
                                          />,
                                      ]
                                    : [
                                          <div
                                              key={`dot-${payment.amount}-${payment.dueDate}`}
                                              className="flex flex-1 justify-center min-w-0">
                                              <div
                                                  className={cn(
                                                      'h-3 w-3 flex-shrink-0 rounded-full',
                                                      index === 0 ? 'bg-primary' : 'bg-muted-foreground/50'
                                                  )}
                                              />
                                          </div>,
                                      ]
                            )}
                        </div>
                        <div className="flex items-start">
                            {paymentSchedule.payments.flatMap((payment, index) =>
                                index < paymentSchedule.payments.length - 1
                                    ? [
                                          <div
                                              key={`pay-${payment.amount}-${payment.dueDate}`}
                                              className="flex flex-1 flex-col items-center min-w-0 pt-1">
                                              <Typography variant="small" className="font-semibold text-foreground">
                                                  {formatCurrency(payment.amount, i18n.language, currency)}
                                              </Typography>
                                              <Typography variant="muted" className="mt-1 text-xs">
                                                  {payment.dueDate}
                                              </Typography>
                                          </div>,
                                          <div
                                              key={`space-${payment.amount}-${payment.dueDate}`}
                                              className="flex-1 min-w-0"
                                              aria-hidden
                                          />,
                                      ]
                                    : [
                                          <div
                                              key={`pay-${payment.amount}-${payment.dueDate}`}
                                              className="flex flex-1 flex-col items-center min-w-0 pt-1">
                                              <Typography variant="small" className="font-semibold text-foreground">
                                                  {formatCurrency(payment.amount, i18n.language, currency)}
                                              </Typography>
                                              <Typography variant="muted" className="mt-1 text-xs">
                                                  {payment.dueDate}
                                              </Typography>
                                          </div>,
                                      ]
                            )}
                        </div>
                    </div>
                </div>
            )}

            {steps && steps.length > 0 && (
                <div>
                    <h3 className="mb-3 text-sm font-medium text-foreground">How it works</h3>
                    <div className="space-y-3">
                        {steps.map((step) => (
                            <div key={step.number} className="flex gap-3">
                                <Typography variant="muted" as="span" className="flex-shrink-0 font-normal">
                                    {step.number}.
                                </Typography>
                                <Typography variant="muted" as="span" className="font-normal">
                                    {(() => {
                                        const payInMatch = step.text.match(/(Pay in \d+)/);
                                        if (payInMatch) {
                                            const phrase = payInMatch[1];
                                            const parts = step.text.split(phrase);
                                            let charPos = 0;
                                            return parts.flatMap((part, partIndex) => {
                                                const keyPos = charPos;
                                                charPos += part.length + phrase.length;
                                                const isLastPart = partIndex === parts.length - 1;
                                                return !isLastPart
                                                    ? [
                                                          part,
                                                          <strong
                                                              key={`${step.number}-${phrase}-${keyPos}`}
                                                              className="font-semibold text-foreground">
                                                              {phrase}
                                                          </strong>,
                                                      ]
                                                    : [part];
                                            });
                                        }
                                        return step.text;
                                    })()}
                                </Typography>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {disclaimer != null && disclaimer !== '' && (
                <div className="rounded-ui bg-muted p-4">
                    <Typography variant="muted" className="text-xs leading-relaxed">
                        {disclaimer}
                    </Typography>
                </div>
            )}
        </>
    );
}
