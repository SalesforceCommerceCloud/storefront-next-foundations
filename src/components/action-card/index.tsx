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
import { type ComponentProps, type ReactNode, type Ref, useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/spinner';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export interface ActionCardProps extends ComponentProps<'div'> {
    children?: ReactNode;
    onEdit?: () => void;
    onRemove?: () => void | Promise<unknown>;
    /** Ref for the edit button so that it can be focused on for accessibility */
    editBtnRef?: Ref<HTMLButtonElement>;
    editBtnLabel?: string;
    /** Ref for the edit button so that it can be focused on for accessibility */
    removeBtnRef?: Ref<HTMLButtonElement>;
    removeBtnLabel?: string;
}

/**
 * Card-style container with optional Edit/Remove actions.
 * If onRemove returns a promise, a loading overlay is shown while it resolves.
 */
const ActionCard = ({
    children,
    onEdit,
    onRemove,
    editBtnRef,
    editBtnLabel,
    removeBtnRef,
    removeBtnLabel,
    className,
    ...props
}: ActionCardProps) => {
    const [showLoading, setShowLoading] = useState(false);
    const { t } = useTranslation('actionCard');

    const handleRemove = async () => {
        if (!onRemove) {
            return;
        }
        setShowLoading(true);
        try {
            await onRemove();
        } finally {
            setShowLoading(false);
        }
    };

    return (
        <Card className={cn('relative', className)} {...props}>
            {showLoading && (
                <div className="absolute inset-0 z-10 bg-background/60" data-testid="loading-spinner">
                    <div className="flex h-full w-full items-center justify-center">
                        <Spinner size="md" />
                    </div>
                </div>
            )}
            <CardContent>{children}</CardContent>
            {(onEdit || onRemove) && (
                <CardFooter className="gap-4">
                    {onEdit && (
                        <Button
                            ref={editBtnRef}
                            onClick={onEdit}
                            variant="link"
                            size="sm"
                            className="font-bold"
                            aria-label={editBtnLabel ?? t('edit')}>
                            {t('edit')}
                        </Button>
                    )}
                    {onRemove && (
                        <Button
                            aria-label={removeBtnLabel ?? t('remove')}
                            className="text-destructive hover:text-destructive/80 font-bold"
                            onClick={() => void handleRemove()}
                            ref={removeBtnRef}
                            size="sm"
                            variant="link">
                            {t('remove')}
                        </Button>
                    )}
                </CardFooter>
            )}
        </Card>
    );
};

export default ActionCard;
