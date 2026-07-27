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
import { type ReactElement, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Third-party libraries
import { AlertTriangle } from 'lucide-react';
import type { ShopperCustomers } from '@/scapi';

// Hooks
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { useScapiFetcherEffect } from '@/hooks/use-scapi-fetcher-effect';
import { useRevalidator } from 'react-router';

// Components
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/typography';
import { useToast } from '@/components/toast';
import AddressDisplay from '@/components/address-display';

export interface RemoveAddressConfirmationDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
    /** The full address object to remove */
    address: ShopperCustomers.schemas['CustomerAddress'];
    /** Customer ID for the remove operation */
    customerId: string;
    /** Callback when remove succeeds */
    onSuccess?: () => void;
}

/**
 * RemoveAddressConfirmationDialog component that provides a confirmation dialog
 * for removing customer addresses with integrated SCAPI fetcher.
 *
 * This component:
 * - Creates its own fetcher for the specific address removal operation
 * - Displays the full address details in the confirmation
 * - Shows a warning if removing the default address
 * - Handles success and error states with toast notifications
 * - Automatically closes on successful removal
 * - Revalidates data after successful removal
 *
 * @param props - Component props
 * @returns JSX element with confirmation dialog
 */
export function RemoveAddressConfirmationDialog({
    open,
    onOpenChange,
    address,
    customerId,
    onSuccess,
}: RemoveAddressConfirmationDialogProps): ReactElement {
    const { t } = useTranslation('account');
    const { addToast } = useToast();
    const revalidator = useRevalidator();

    const addressId = address?.addressId || '';
    const isDefault = address?.preferred || false;

    // Create fetcher for removing this specific address
    // The fetcher is stable because addressId doesn't change while modal is open
    const removeFetcher = useScapiFetcher('shopperCustomers', 'removeCustomerAddress', {
        params: {
            path: {
                customerId,
                addressName: addressId,
            },
        },
    });

    const isLoading = removeFetcher.state === 'submitting';

    // Handle fetcher effects
    useScapiFetcherEffect(removeFetcher, {
        onSuccess: () => {
            addToast(t('addresses.removeSuccess'), 'success');
            onOpenChange(false); // Close modal on success
            onSuccess?.();
            void revalidator.revalidate();
        },
        onError: (errors) => {
            const errorMessage = errors?.length > 0 ? errors.join(', ') : t('addresses.removeError');
            addToast(errorMessage, 'error');
        },
    });

    // Handle confirm action
    const handleConfirm = useCallback(() => {
        if (!addressId || !customerId) {
            addToast(t('addresses.removeError'), 'error');
            return;
        }

        if (removeFetcher.state === 'idle') {
            void removeFetcher.submit();
        }
    }, [addressId, customerId, removeFetcher, addToast, t]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('addresses.removeDialogTitle')}</DialogTitle>
                    <DialogDescription>{t('addresses.removeDialogDescription')}</DialogDescription>
                </DialogHeader>

                {/* Address Card */}
                <Card className="border-border">
                    <CardContent className="px-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Typography variant="h6" as="p">
                                {address.addressId}
                            </Typography>
                            {isDefault && (
                                <Badge variant="secondary" className="text-xs font-normal bg-primary/10 text-primary">
                                    {t('addresses.default')}
                                </Badge>
                            )}
                        </div>
                        <AddressDisplay address={address} showName={true} />
                    </CardContent>
                </Card>

                {/* Default Address Warning */}
                {isDefault && (
                    <div className="flex gap-3 p-3 rounded-ui bg-destructive/10 border border-destructive/20">
                        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive">{t('addresses.removeDefaultWarning')}</p>
                    </div>
                )}

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        {t('addresses.removeCancelButton')}
                    </Button>
                    <Button variant="destructive" onClick={handleConfirm} disabled={isLoading}>
                        {t('addresses.removeButton')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
