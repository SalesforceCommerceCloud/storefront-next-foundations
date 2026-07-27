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
import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';

/** Four-pointed sparkle path (top, right, bottom, left). Reused for header chat, AI review summary, etc. */
const SPARKLE_PATH = 'M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z';

interface SparklesIconProps {
    className?: string;
    style?: React.CSSProperties;
    'aria-hidden'?: boolean;
}

/**
 * Reusable sparkles (four-pointed star) icon. Use in header, AI features, chat, etc.
 */
export function SparklesIcon({ className, style, 'aria-hidden': ariaHidden = true }: SparklesIconProps): ReactElement {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={cn('size-5', className)}
            style={style}
            aria-hidden={ariaHidden}>
            <path d={SPARKLE_PATH} />
        </svg>
    );
}
