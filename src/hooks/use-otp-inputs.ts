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
import { useRef, useCallback, useState, useEffect } from 'react';

interface UseOtpInputsReturn {
    inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
    values: string[];
    clear: () => void;
    setValue: (index: number, value: string) => string | null;
    handleKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
    handlePaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}

/**
 * Hook for managing OTP input fields
 */
export function useOtpInputs(length: number, onPasteComplete?: (code: string) => void): UseOtpInputsReturn {
    const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(length).fill(null));
    const [values, setValues] = useState<string[]>(Array(length).fill(''));
    const valuesRef = useRef<string[]>(Array(length).fill(''));
    const onPasteCompleteRef = useRef(onPasteComplete);

    useEffect(() => {
        onPasteCompleteRef.current = onPasteComplete;
    }, [onPasteComplete]);

    const clear = useCallback(() => {
        const emptyArray = Array(length).fill('');
        setValues(emptyArray);
        valuesRef.current = emptyArray;
        inputRefs.current.forEach((ref) => {
            if (ref) {
                ref.value = '';
            }
        });
    }, [length]);

    const setValue = useCallback(
        (index: number, value: string): string | null => {
            const numericValue = value.replace(/\D/g, '');
            if (numericValue.length > 1) {
                return null;
            }

            const newValues = [...valuesRef.current];
            newValues[index] = numericValue;
            valuesRef.current = newValues;
            setValues(newValues);

            const code = newValues.join('');

            if (numericValue && index < length - 1) {
                inputRefs.current[index + 1]?.focus();
            }

            return code;
        },
        [length]
    );

    const handleKeyDown = useCallback(
        (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Backspace' && !valuesRef.current[index] && index > 0) {
                e.preventDefault();
                inputRefs.current[index - 1]?.focus();
            } else if (e.key === 'ArrowLeft' && index > 0) {
                e.preventDefault();
                inputRefs.current[index - 1]?.focus();
            } else if (e.key === 'ArrowRight' && index < length - 1) {
                e.preventDefault();
                inputRefs.current[index + 1]?.focus();
            }
        },
        [length]
    );

    const handlePaste = useCallback(
        (e: React.ClipboardEvent<HTMLInputElement>) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);

            if (pastedData.length > 0) {
                const newValues = Array(length).fill('');
                for (let i = 0; i < pastedData.length && i < length; i++) {
                    newValues[i] = pastedData[i];
                    const inputRef = inputRefs.current[i];
                    if (inputRef) {
                        inputRef.value = pastedData[i];
                    }
                }

                valuesRef.current = newValues;
                setValues(newValues);

                const focusIndex = Math.min(pastedData.length, length - 1);
                setTimeout(() => {
                    inputRefs.current[focusIndex]?.focus();
                }, 0);

                // A paste delivers the whole code at once, so (unlike typing) it
                // can't be a prefix of something longer — safe to offer for
                // auto-submit. The consumer decides whether `code` is submittable.
                const code = newValues.join('');
                if (onPasteCompleteRef.current) {
                    setTimeout(() => {
                        onPasteCompleteRef.current?.(code);
                    }, 0);
                }
            }
        },
        [length]
    );

    return {
        inputRefs,
        values,
        clear,
        setValue,
        handleKeyDown,
        handlePaste,
    };
}
