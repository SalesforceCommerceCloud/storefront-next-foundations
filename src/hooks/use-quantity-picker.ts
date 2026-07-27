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
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

interface UseQuantityPickerProps {
    /** Current quantity value as string */
    value: string;
    /** Callback when quantity changes */
    onChange: (stringValue: string, numberValue: number) => void;
    /** Callback when input loses focus */
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    /** Minimum quantity allowed */
    min?: number;
    /** Maximum quantity allowed (for bonus products, etc.) */
    max?: number;
}

interface UseQuantityPickerReturn {
    /** Current input value as string */
    inputValue: string;
    /** Whether the input is currently focused */
    isFocused: boolean;
    /** Reference to the input element */
    inputRef: RefObject<HTMLInputElement | null>;
    /** Whether the decrement button should be disabled */
    isDecrementDisabled: boolean;
    /** Whether the increment button should be disabled (when max reached) */
    isIncrementDisabled: boolean;
    /** Handle increment button click */
    handleIncrement: () => void;
    /** Handle decrement button click */
    handleDecrement: () => void;
    /** Handle input value change */
    handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    /** Handle input focus */
    handleInputFocus: (event: React.FocusEvent<HTMLInputElement>) => void;
    /** Handle input blur */
    handleInputBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
    /** Handle keyboard navigation and input filtering */
    handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Custom hook for managing quantity picker input behavior and state.
 *
 * This hook provides:
 * - Input value synchronization with external value prop
 * - Increment/decrement logic with minimum value constraints
 * - Input validation (integers only)
 * - Focus management and text selection
 * - Keyboard navigation support
 * - Auto-correction of invalid values on blur (only when no custom onBlur handler is provided)
 *
 * @param props - Hook configuration
 * @returns Object containing state and handlers for quantity picker
 *
 * @example
 * ```tsx
 * const {
 *   inputValue,
 *   isFocused,
 *   inputRef,
 *   isDecrementDisabled,
 *   handleIncrement,
 *   handleDecrement,
 *   handleInputChange,
 *   handleInputFocus,
 *   handleInputBlur,
 *   handleKeyDown
 * } = useQuantityPicker({
 *   value: 2,
 *   onChange: (stringValue, numberValue) => console.log(stringValue, numberValue),
 *   min: 0
 * });
 * ```
 */
export function useQuantityPicker({
    value,
    onChange,
    onBlur,
    min = 0,
    max,
}: UseQuantityPickerProps): UseQuantityPickerReturn {
    const [inputValue, setInputValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync input value with prop changes
    useEffect(() => {
        if (!isFocused) {
            setInputValue(value);
        }
    }, [value, isFocused]);

    // Handle increment button - constrain to max
    const handleIncrement = useCallback(() => {
        const currentValue = parseInt(value, 10) || 0;
        let newValue = currentValue + 1;

        // Constrain to max if provided
        if (max != null) {
            newValue = Math.min(newValue, max);
        }

        if (newValue !== currentValue) {
            // Force input value update immediately for button clicks
            setInputValue(newValue.toString());
            onChange(newValue.toString(), newValue);
        }
    }, [value, max, onChange]);

    // Handle decrement button
    const handleDecrement = useCallback(() => {
        const currentValue = parseInt(value, 10) || 0;
        const newValue = Math.max(currentValue - 1, min);

        if (newValue !== currentValue) {
            // Force input value update immediately for button clicks
            setInputValue(newValue.toString());
            onChange(newValue.toString(), newValue);
        }
    }, [value, min, onChange]);

    // Handle input change - only allow integers
    const handleInputChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = event.target.value;

            // Only allow digits and empty string
            if (newValue === '' || /^\d+$/.test(newValue)) {
                setInputValue(newValue);

                if (newValue === '') {
                    // Allow empty input for user to clear and type new value
                    onChange(newValue, 0);
                } else {
                    // Parse as integer
                    const numValue = parseInt(newValue, 10);
                    onChange(newValue, numValue);
                }
            }
        },
        [onChange]
    );

    // Handle input focus
    const handleInputFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        // Select all text when focused (useful for mobile)
        event.target.select();
    }, []);

    // Handle input blur - clamp to min and max
    const handleInputBlur = useCallback(
        (event: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(false);

            // Call custom onBlur handler first (if provided)
            onBlur?.(event);

            // Auto-correct invalid values to min/max only if no custom onBlur handler
            // This allows custom handlers to override the auto-correction behavior
            if (!onBlur) {
                const numValue = parseInt(inputValue, 10);
                // Check both min and max
                if (isNaN(numValue) || numValue < min || (max !== undefined && numValue > max)) {
                    // Clamp between min and max
                    let clampedValue = min;
                    if (!isNaN(numValue)) {
                        // User typed a valid number, clamp it
                        clampedValue = Math.max(min, numValue); // First, ensure >= min
                        if (max !== undefined) {
                            clampedValue = Math.min(clampedValue, max); // Then, ensure <= max
                        }
                    }
                    setInputValue(clampedValue.toString());
                    onChange(clampedValue.toString(), clampedValue);
                }
            }
        },
        [inputValue, min, max, onChange, onBlur]
    );

    // Handle keyboard navigation and input filtering
    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            // Allow navigation and control keys
            const allowedKeys = [
                'Backspace',
                'Delete',
                'Tab',
                'Escape',
                'Enter',
                'ArrowLeft',
                'ArrowRight',
                'ArrowUp',
                'ArrowDown',
                'Home',
                'End',
                'PageUp',
                'PageDown',
            ];

            // Allow digits (0-9)
            const isDigit = /^[0-9]$/.test(event.key);

            // Allow Ctrl/Cmd combinations (copy, paste, select all, etc.)
            const isCtrlCmd = event.ctrlKey || event.metaKey;

            // Block non-integer characters
            if (!allowedKeys.includes(event.key) && !isDigit && !isCtrlCmd) {
                event.preventDefault();
                return;
            }

            switch (event.key) {
                case 'ArrowUp':
                    event.preventDefault();
                    handleIncrement();
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    handleDecrement();
                    break;
                case 'Enter':
                    // Allow enter to trigger increment when focused on input
                    if (event.target === inputRef.current) {
                        event.preventDefault();
                        // Trigger increment for enter on input
                        handleIncrement();
                    }
                    break;
            }
        },
        [handleIncrement, handleDecrement]
    );

    // Memoize decrement button disabled state to prevent unnecessary re-renders
    const isDecrementDisabled = useMemo(() => {
        const currentValue = parseInt(value, 10) || 0;
        const disabled = value !== '' && value !== '0' && currentValue === 1;

        return disabled;
    }, [value]);

    // Memoize increment button disabled state to prevent unnecessary re-renders
    const isIncrementDisabled = useMemo(() => {
        // If no max, never disable increment
        if (max == null) {
            return false;
        }

        const currentValue = parseInt(value, 10) || 0;
        // Disable if current value has reached or exceeded max
        const disabled = currentValue >= max;

        return disabled;
    }, [value, max]);

    return {
        inputValue,
        isFocused,
        inputRef,
        isDecrementDisabled,
        isIncrementDisabled,
        handleIncrement,
        handleDecrement,
        handleInputChange,
        handleInputFocus,
        handleInputBlur,
        handleKeyDown,
    };
}
