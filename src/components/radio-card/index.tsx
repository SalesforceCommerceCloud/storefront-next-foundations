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
import { createContext, forwardRef, useContext, useRef, useState, type ReactNode, type KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface RadioCardProps {
    value: string;
    children: ReactNode;
    className?: string;
    disabled?: boolean;
}

interface RadioCardGroupProps {
    children: ReactNode;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    name?: string;
    required?: boolean;
    orientation?: 'horizontal' | 'vertical';
    className?: string;
}

// Simple context for radio group state
const RadioGroupContext = createContext<{
    value?: string;
    onValueChange?: (value: string) => void;
    name?: string;
    disabled?: boolean;
}>({});

const RadioCard = forwardRef<HTMLLabelElement, RadioCardProps>(
    ({ value, children, className, disabled, ...props }, ref) => {
        const context = useContext(RadioGroupContext);
        const isChecked = context.value === value;
        const isDisabled = disabled || context.disabled;
        const inputRef = useRef<HTMLInputElement>(null);

        const handleClick = () => {
            if (!isDisabled && context.onValueChange) {
                context.onValueChange(value);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
            }
        };

        return (
            <Label
                ref={ref}
                htmlFor={`radio-${value}`}
                className={cn(
                    'relative cursor-pointer rounded-ui border p-4 transition-all duration-200 block',
                    'hover:border-border focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                    'border-border bg-card overflow-hidden',
                    isChecked && 'border-primary bg-accent shadow-md',
                    isDisabled && 'cursor-not-allowed opacity-50',
                    className
                )}
                {...props}>
                {/* Radio input */}
                <input
                    ref={inputRef}
                    id={`radio-${value}`}
                    type="radio"
                    name={context.name}
                    value={value}
                    checked={isChecked}
                    disabled={isDisabled}
                    // Controlled by parent
                    onChange={() => {
                        // Intentionally empty
                    }}
                    onClick={handleClick}
                    onKeyDown={handleKeyDown}
                    className="sr-only"
                    aria-describedby={children ? `radio-${value}-description` : undefined}
                />

                {/* Check indicator - only show when selected */}
                {isChecked && (
                    <div className="absolute top-0 right-0 w-0 border-r-primary border-t-0 border-r-40 border-b-40 border-l-0 border-transparent">
                        <Check className="absolute text-primary-foreground font-bold -right-10 top-1 w-5 h-5" />
                    </div>
                )}

                {/* Content with proper accessibility */}
                <div id={`radio-${value}-description`}>{children}</div>
            </Label>
        );
    }
);

RadioCard.displayName = 'RadioCard';

const RadioCardGroup = forwardRef<HTMLDivElement, RadioCardGroupProps>(
    ({ children, className, orientation = 'vertical', value, onValueChange, name, disabled, ...props }, ref) => {
        const [internalValue, setInternalValue] = useState(value || props.defaultValue || '');
        const currentValue = value !== undefined ? value : internalValue;

        const handleValueChange = (newValue: string) => {
            if (value === undefined) {
                setInternalValue(newValue);
            }
            onValueChange?.(newValue);
        };

        return (
            <RadioGroupContext.Provider
                value={{
                    value: currentValue,
                    onValueChange: handleValueChange,
                    name,
                    disabled,
                }}>
                <div
                    ref={ref}
                    role="radiogroup"
                    className={cn(orientation === 'horizontal' ? 'flex gap-4' : 'grid gap-3', className)}
                    {...props}>
                    {children}
                </div>
            </RadioGroupContext.Provider>
        );
    }
);

RadioCardGroup.displayName = 'RadioCardGroup';

export { RadioCard, RadioCardGroup };
