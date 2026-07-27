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
/**
 * Marketing consent: view/edit preferences with Edit → change switches → Save (one batch request).
 */
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopperConsents } from '@/scapi';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/toast';
import { useUpdateMarketingConsent } from '@/hooks/use-update-marketing-consent';
import { cn } from '@/lib/utils';

type ConsentSubscription = ShopperConsents.schemas['ConsentSubscription'];
type ConsentChannel = 'email' | 'sms' | 'whatsapp';

export type MarketingConsentSubscriptions = ShopperConsents.schemas['ConsentSubscriptionResponse'] | null;
export type ContactPointValueByChannel = Partial<Record<ConsentChannel, string>>;

export interface MarketingConsentProps {
    subscriptions?: MarketingConsentSubscriptions | null;
    contactPointValueByChannel?: ContactPointValueByChannel | null;
    onConsentUpdated?: () => void;
}

const KEY_SEP = '::';

function getStatus(sub: ConsentSubscription, channelId: string): 'opt_in' | 'opt_out' {
    const entry = sub.consentStatus?.find((e) => e.channel === channelId);
    return entry?.status ?? sub.defaultStatus ?? 'opt_out';
}

function toKey(subscriptionId: string, channelId: string): string {
    return `${subscriptionId}${KEY_SEP}${channelId}`;
}

type Section = { channelId: ConsentChannel; channelLabel: string; items: ConsentSubscription[] };

function groupByChannel(subscriptions: ConsentSubscription[]): Section[] {
    const byChannel = new Map<ConsentChannel, ConsentSubscription[]>();
    for (const sub of subscriptions) {
        for (const channelId of sub.channels ?? []) {
            const list = byChannel.get(channelId) ?? [];
            list.push(sub);
            byChannel.set(channelId, list);
        }
    }
    return Array.from(byChannel, ([channelId, items]) => ({
        channelId,
        channelLabel: channelId.charAt(0).toUpperCase() + channelId.slice(1).toLowerCase(),
        items,
    }));
}

function stateFromSections(sections: Section[]): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const section of sections) {
        for (const sub of section.items) {
            out[toKey(sub.subscriptionId, section.channelId)] = getStatus(sub, section.channelId) === 'opt_in';
        }
    }
    return out;
}

/**
 * Marketing consent state.
 *
 * - serverState: from props (subscriptions), read-only.
 * - When editing: show draft. On Save we set override and clear draft so the next paint shows override (no flicker).
 * - When not editing: show override ?? serverState. Override is set on Save and cleared when subscriptions change or on error.
 */
function useMarketingConsentState(
    subscriptions: MarketingConsentSubscriptions | null,
    channelSections: Section[],
    contactPointValueByChannel: ContactPointValueByChannel | null | undefined,
    onConsentUpdated?: () => void
) {
    const { t } = useTranslation('account');
    const { addToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<Record<string, boolean>>({});
    const [override, setOverride] = useState<Record<string, boolean> | null>(null);

    const { updateBatch, isUpdating } = useUpdateMarketingConsent(
        useCallback(() => {
            onConsentUpdated?.();
        }, [onConsentUpdated]),
        useCallback(
            (_message: string, data?: { partialSuccess?: boolean }) => {
                setOverride(null);
                if (data?.partialSuccess) {
                    addToast(t('marketingConsent.partialSuccess'), 'info');
                    setIsEditing(false);
                    onConsentUpdated?.();
                } else {
                    addToast(t('marketingConsent.updateError'), 'error');
                    setIsEditing(false);
                }
            },
            [addToast, t, onConsentUpdated]
        )
    );

    useEffect(() => setOverride(null), [subscriptions]);

    const serverState = useMemo(() => stateFromSections(channelSections), [channelSections]);
    const displayState = isEditing ? draft : (override ?? serverState);

    const handleEdit = useCallback(() => {
        setDraft({ ...(override ?? serverState) });
        setIsEditing(true);
    }, [override, serverState]);

    const handleCancel = useCallback(() => {
        setIsEditing(false);
        setDraft({});
    }, []);

    const handleSave = useCallback(() => {
        const contactByChannel = contactPointValueByChannel ?? {};
        const payloads: Array<{
            subscriptionId: string;
            channel: ConsentChannel;
            contactPointValue: string;
            status: 'opt_in' | 'opt_out';
        }> = [];
        for (const key of Object.keys(draft)) {
            if (draft[key] === serverState[key]) continue;
            const [subscriptionId, channelId] = key.split(KEY_SEP) as [string, ConsentChannel];
            const contactPointValue = contactByChannel[channelId];
            if (!contactPointValue) continue;
            payloads.push({
                subscriptionId,
                channel: channelId,
                contactPointValue,
                status: draft[key] ? 'opt_in' : 'opt_out',
            });
        }
        if (payloads.length > 0) {
            setOverride({ ...draft });
            updateBatch(payloads);
        } else {
            setOverride(null);
        }
        setIsEditing(false);
        setDraft({});
    }, [contactPointValueByChannel, draft, serverState, updateBatch]);

    const handleSwitchChange = useCallback(
        (subscriptionId: string, channelId: ConsentChannel, checked: boolean) => {
            if (!isEditing) return;
            setDraft((prev) => ({ ...prev, [toKey(subscriptionId, channelId)]: checked }));
        },
        [isEditing]
    );

    return {
        isEditing,
        draft,
        displayState,
        isUpdating,
        handleEdit,
        handleCancel,
        handleSave,
        handleSwitchChange,
    };
}

export function MarketingConsent({
    subscriptions: subscriptionsProp,
    contactPointValueByChannel,
    onConsentUpdated,
}: MarketingConsentProps): ReactElement | null {
    const { t } = useTranslation('account');
    const subscriptions = subscriptionsProp ?? null;
    const channelSections = useMemo(() => groupByChannel(subscriptions?.data ?? []), [subscriptions]);

    const { isEditing, draft, displayState, isUpdating, handleEdit, handleCancel, handleSave, handleSwitchChange } =
        useMarketingConsentState(subscriptions, channelSections, contactPointValueByChannel, onConsentUpdated);

    const hasData = Array.isArray(subscriptions?.data) && (subscriptions?.data?.length ?? 0) > 0;
    if (!hasData) return null;

    const statusLabel = (optIn: boolean) => (optIn ? t('marketingConsent.optedIn') : t('marketingConsent.optedOut'));

    return (
        <Card className="" data-section="marketing-consent">
            <CardHeader className="border-b border-muted-foreground/20 pb-4">
                <CardTitle>{t('marketingConsent.title')}</CardTitle>
                <CardAction>
                    {isEditing ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={handleSave}
                                disabled={isUpdating}>
                                {t('common.save')}
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                                {t('common.cancel')}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            aria-label={t('marketingConsent.editA11y')}
                            onClick={handleEdit}
                            disabled={isUpdating}
                            className="cursor-pointer">
                            {t('marketingConsent.edit')}
                        </Button>
                    )}
                </CardAction>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    {channelSections.map((section, idx) => {
                        const contactPoint = contactPointValueByChannel?.[section.channelId];
                        const disabled = !isEditing || !contactPoint;
                        return (
                            <section
                                key={section.channelId}
                                className={idx === 0 ? '' : 'border-t border-muted-foreground/10 pt-4'}
                                aria-labelledby={`marketing-consent-channel-${section.channelId}`}>
                                <h2
                                    id={`marketing-consent-channel-${section.channelId}`}
                                    className="text-sm font-semibold text-foreground mb-2">
                                    {section.channelLabel}
                                </h2>
                                <ul className="space-y-2 pl-4" role="list">
                                    {section.items.map((sub) => {
                                        const key = toKey(sub.subscriptionId, section.channelId);
                                        const checked = isEditing
                                            ? (draft[key] ?? displayState[key])
                                            : displayState[key];
                                        const title = sub.title ?? sub.subscriptionId;
                                        return (
                                            <li
                                                key={key}
                                                className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between py-1">
                                                <div className="space-y-1 min-w-0">
                                                    {sub.title != null && sub.title !== '' && (
                                                        <p className="text-sm font-medium text-foreground">
                                                            {sub.title}
                                                        </p>
                                                    )}
                                                    {sub.subtitle != null && sub.subtitle !== '' && (
                                                        <p className="text-sm text-muted-foreground">{sub.subtitle}</p>
                                                    )}
                                                </div>
                                                <Switch
                                                    checked={!!checked}
                                                    disabled={disabled}
                                                    aria-label={`${title}: ${statusLabel(!!checked)}`}
                                                    onCheckedChange={(value) =>
                                                        handleSwitchChange(
                                                            sub.subscriptionId,
                                                            section.channelId,
                                                            value === true
                                                        )
                                                    }
                                                    className={cn(
                                                        'shrink-0 sm:ml-4',
                                                        !isEditing && 'cursor-default disabled:cursor-default'
                                                    )}
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        );
                    })}
                    <p className="text-sm text-muted-foreground pt-4 border-t border-muted-foreground/10">
                        {t('marketingConsent.disclaimer')}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

export default MarketingConsent;
