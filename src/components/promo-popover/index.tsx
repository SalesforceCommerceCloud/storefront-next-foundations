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
import type { ReactNode } from 'react';

// components
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/typography';
import { cn } from '@/lib/utils';

interface PromoPopoverProps {
    header?: ReactNode;
    children: ReactNode;
    className?: string;
}

/**
 * This component renders a small info icon and displays a popover when hovered. It could be adapted
 * to handle any kind of popover if needed, but for now its been set up to be used/shared for displaying
 * promotions applied to products and/or orders on cart, checkout, order confirmation and order history.
 */
const PromoPopover = ({ header, children, className, ...props }: PromoPopoverProps) => {
    return (
        <div className={cn('relative', className)} {...props}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-3.5 h-3.5 min-w-0 p-0 flex items-center justify-center"
                        aria-label="Info">
                        <Info className="w-[14px] h-[14px] text-muted-foreground" aria-hidden="true" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    className="max-w-sm p-0 bg-popover text-popover-foreground border border-border shadow-lg [&>span>svg]:bg-popover [&>span>svg]:fill-popover"
                    sideOffset={8}>
                    <div className="p-4">
                        {header && (
                            <div className="mb-2 pb-2 border-b border-border">
                                <Typography variant="h3" as="h3" className="font-bold text-sm text-popover-foreground">
                                    {header}
                                </Typography>
                            </div>
                        )}
                        <div className="text-sm text-muted-foreground">{children}</div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </div>
    );
};

export default PromoPopover;
