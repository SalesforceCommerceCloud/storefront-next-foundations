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
import { memo, useId, type Ref, type SVGProps } from 'react';
import { cn } from '@/lib/utils';

const STAR_PATH =
    'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';

export interface StarIconProps extends SVGProps<SVGSVGElement> {
    /**
     * Ref forwarded to the root SVG element
     */
    ref?: Ref<SVGSVGElement>;
    /**
     * Fill fraction of the star (0–1). Fully filled = 1, partial = between 0 and 1.
     * For unfilled stars (filled=false) this value is ignored.
     */
    opacity: number;
    /**
     * Whether the star has any fill. When false the star is rendered as an
     * empty outline; when true the fill fraction is controlled by `opacity`.
     */
    filled: boolean;
}

/**
 * Star icon with gradient-based partial fill (industry-standard approach).
 *
 * - Fully filled: solid rating color fill and stroke.
 * - Unfilled: white fill with a subtle border-subtle stroke.
 * - Partial: left-to-right hard-stop gradient (rating → white) with border-subtle stroke.
 */
export const StarIcon = memo(function StarIcon({ opacity, filled, className, ref, ...props }: StarIconProps) {
    const gradientId = useId();
    const isFullyFilled = filled && opacity >= 1;
    const isPartial = filled && opacity > 0 && opacity < 1;

    let fill: string;
    if (isFullyFilled) {
        fill = 'var(--color-rating)';
    } else if (isPartial) {
        fill = `url(#${gradientId})`;
    } else {
        fill = 'white';
    }

    const stroke = isFullyFilled ? 'var(--color-rating)' : 'var(--color-border-subtle)';

    return (
        <svg ref={ref} className={cn('shrink-0', className)} viewBox="0 0 20 20" {...props}>
            {isPartial && (
                <defs>
                    <linearGradient id={gradientId}>
                        <stop offset={`${Math.round(opacity * 100)}%`} stopColor="var(--color-rating)" />
                        <stop offset={`${Math.round(opacity * 100)}%`} stopColor="white" />
                    </linearGradient>
                </defs>
            )}
            <path d={STAR_PATH} fill={fill} stroke={stroke} strokeWidth="1" />
        </svg>
    );
});
