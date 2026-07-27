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
import { type ComponentRef, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ShareIconProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    onClick?: () => void;
    tabIndex?: number;
}

const ShareIcon = forwardRef<ComponentRef<'button'>, ShareIconProps>(
    ({ size = 'md', className, onClick, tabIndex }, ref) => {
        const { t } = useTranslation('product');
        const sizeClasses = {
            sm: 'w-4 h-4',
            md: 'w-5 h-5',
            lg: 'w-6 h-6',
        };

        return (
            <button
                ref={ref}
                type="button"
                className={cn(
                    'bg-background w-9 h-9 p-2 shadow-md flex items-center justify-center rounded-ui',
                    'transition-all duration-200 ease-in-out border-0 cursor-pointer',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    className
                )}
                onClick={onClick}
                tabIndex={tabIndex}
                aria-label={t('share')}>
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={cn(sizeClasses[size], 'text-muted-foreground transition-all duration-200 ease-in-out')}>
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
            </button>
        );
    }
);

ShareIcon.displayName = 'ShareIcon';

export { ShareIcon };
