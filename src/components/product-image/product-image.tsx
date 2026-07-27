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
import { type ElementType, type ImgHTMLAttributes, type SyntheticEvent, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { DynamicImageDimensions } from '@/lib/images/dynamic-image';
import { DynamicImage } from '@/components/dynamic-image';

interface ProductImageProps {
    src: string;
    alt: string;
    className?: string;
    // Pass through all DynamicImage props
    widths?: DynamicImageDimensions;
    heights?: DynamicImageDimensions;
    imageProps?: ImgHTMLAttributes<HTMLImageElement>;
    as?: ElementType;
    loading?: 'lazy' | 'eager';
    priority?: 'high' | 'low';
}

/**
 * ProductImage component that shows a broken image icon when image fails to load.
 */
export function ProductImage({ src, alt, className, imageProps, ...dynamicImageProps }: ProductImageProps) {
    const [hasError, setHasError] = useState(false);
    const { onError: customOnError, ...restImageProps } = imageProps ?? {};

    const handleError = useCallback(
        (event: SyntheticEvent<HTMLImageElement, Event>) => {
            setHasError(true);
            customOnError?.(event);
        },
        [customOnError]
    );
    const { t } = useTranslation('common');

    // If there's an error, show simple fallback (centered vertically in expanded header)
    if (hasError) {
        return (
            <div
                className={cn(
                    ' flex items-center justify-center w-full h-full aspect-square bg-secondary/20',
                    className
                )}>
                <div className="text-center text-muted-foreground">
                    <div className="text-4xl mb-2">📷</div>
                    <p>{t('noImageAvailable')}</p>
                </div>
            </div>
        );
    }

    // Render the actual image with error handling
    return (
        <DynamicImage
            src={src}
            alt={alt}
            className={className}
            imageProps={{
                ...restImageProps,
                onError: handleError,
            }}
            {...dynamicImageProps}
        />
    );
}

export default ProductImage;
