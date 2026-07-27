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
import { type ReactElement } from 'react';

// Components
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface ConfirmationDialogProps extends React.ComponentProps<typeof AlertDialog> {
    // Dialog content
    /** Dialog title */
    title: string;
    /** Dialog description */
    description: string;

    // Button configuration
    /** Cancel button text */
    cancelButtonText: string;
    /** Confirm button text */
    confirmButtonText: string;
    /** Callback when cancel button is clicked */
    onCancel: () => void;
    /** Callback when confirm button is clicked */
    onConfirm: () => void;

    // Optional props
    /** Whether the confirm button should be disabled */
    confirmButtonDisabled?: boolean;
    /** Custom className for the dialog content */
    className?: string;
    /** ARIA label for the cancel button (optional) */
    cancelButtonAriaLabel?: string;
    /** ARIA label for the confirm button (optional) */
    confirmButtonAriaLabel?: string;
}

/**
 * Reusable confirmation dialog component
 *
 * This component provides a consistent confirmation dialog pattern across the application.
 * It can be used for various confirmation scenarios like removing items, deleting data, etc.
 *
 * @param props - Component props
 * @returns JSX element with confirmation dialog
 */
export function ConfirmationDialog({
    // Dialog content
    title,
    description,

    // Button configuration
    cancelButtonText,
    confirmButtonText,
    onCancel,
    onConfirm,

    // Optional props
    confirmButtonDisabled = false,
    className = 'sm:max-w-sm',
    cancelButtonAriaLabel,
    confirmButtonAriaLabel,
    ...props
}: ConfirmationDialogProps): ReactElement {
    return (
        <AlertDialog {...props}>
            <AlertDialogContent className={className}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={onCancel}
                        disabled={confirmButtonDisabled}
                        aria-label={cancelButtonAriaLabel}>
                        {cancelButtonText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={confirmButtonDisabled}
                        aria-label={confirmButtonAriaLabel}>
                        {confirmButtonText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
