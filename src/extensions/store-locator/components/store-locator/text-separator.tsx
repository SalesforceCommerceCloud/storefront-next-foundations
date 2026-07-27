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
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface TextSeparatorProps extends HTMLAttributes<HTMLDivElement> {
    text: string;
}

/**
 * TextSeparator
 *
 * Visually separates content with a horizontal rule and a centered small text label.
 *
 * @param text - The label to render in the center of the separator
 * @returns ReactElement
 *
 * @example
 * <TextSeparator text="Or" />
 */
const TextSeparator = forwardRef<HTMLDivElement, TextSeparatorProps>(({ className, text, ...props }, ref) => (
    <div ref={ref} className={cn('relative my-2 flex items-center', className)} {...props}>
        <Separator className="absolute left-0 right-0" />
        <span className="bg-background text-muted-foreground mx-auto px-2 text-xs relative z-10">{text}</span>
    </div>
));
TextSeparator.displayName = 'TextSeparator';

export { TextSeparator };
