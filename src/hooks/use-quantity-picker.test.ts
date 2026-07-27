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

import { renderHook, act } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { useQuantityPicker } from './use-quantity-picker';

describe('useQuantityPicker', () => {
    const mockOnChange = vi.fn();
    const mockOnBlur = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        test('initializes with string value', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            expect(result.current.inputValue).toBe('5');
            expect(result.current.isFocused).toBe(false);
            expect(result.current.isDecrementDisabled).toBe(false);
        });

        test('initializes with different string value', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '10',
                    onChange: mockOnChange,
                })
            );

            expect(result.current.inputValue).toBe('10');
            expect(result.current.isFocused).toBe(false);
        });

        test('initializes with default min value of 0', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '0',
                    onChange: mockOnChange,
                })
            );

            expect(result.current.isDecrementDisabled).toBe(false);
        });

        test('initializes with custom min value', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '1',
                    onChange: mockOnChange,
                    min: 1,
                })
            );

            expect(result.current.isDecrementDisabled).toBe(true);
        });
    });

    describe('value synchronization', () => {
        test('syncs input value when prop changes and not focused', () => {
            const { result, rerender } = renderHook(
                ({ value }) =>
                    useQuantityPicker({
                        value,
                        onChange: mockOnChange,
                    }),
                { initialProps: { value: '5' } }
            );

            expect(result.current.inputValue).toBe('5');

            rerender({ value: '10' });
            expect(result.current.inputValue).toBe('10');
        });

        test('does not sync input value when focused', () => {
            const { result, rerender } = renderHook(
                ({ value }) =>
                    useQuantityPicker({
                        value,
                        onChange: mockOnChange,
                    }),
                { initialProps: { value: '5' } }
            );

            // Focus the input
            act(() => {
                result.current.handleInputFocus({
                    target: { select: vi.fn() },
                } as unknown as React.FocusEvent<HTMLInputElement>);
            });

            expect(result.current.isFocused).toBe(true);

            // Change prop value
            rerender({ value: '10' });

            // Input value should not change when focused
            expect(result.current.inputValue).toBe('5');
        });
    });

    describe('increment functionality', () => {
        test('increments number value correctly', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            act(() => {
                result.current.handleIncrement();
            });

            expect(mockOnChange).toHaveBeenCalledWith('6', 6);
        });

        test('increments string value correctly', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '3',
                    onChange: mockOnChange,
                })
            );

            act(() => {
                result.current.handleIncrement();
            });

            expect(mockOnChange).toHaveBeenCalledWith('4', 4);
        });

        test('handles increment from 0', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '0',
                    onChange: mockOnChange,
                })
            );

            act(() => {
                result.current.handleIncrement();
            });

            expect(mockOnChange).toHaveBeenCalledWith('1', 1);
        });

        test('handles increment from empty string', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '',
                    onChange: mockOnChange,
                })
            );

            act(() => {
                result.current.handleIncrement();
            });

            expect(mockOnChange).toHaveBeenCalledWith('1', 1);
        });
    });

    describe('decrement functionality', () => {
        test('decrements number value correctly', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            act(() => {
                result.current.handleDecrement();
            });

            expect(mockOnChange).toHaveBeenCalledWith('4', 4);
        });

        test('decrements string value correctly', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '10',
                    onChange: mockOnChange,
                })
            );

            act(() => {
                result.current.handleDecrement();
            });

            expect(mockOnChange).toHaveBeenCalledWith('9', 9);
        });

        test('respects minimum value constraint', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '1',
                    onChange: mockOnChange,
                    min: 1,
                })
            );

            act(() => {
                result.current.handleDecrement();
            });

            // When value is already at minimum, decrement should not call onChange
            expect(mockOnChange).not.toHaveBeenCalled();
        });

        test('decrements to minimum when below min', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '0',
                    onChange: mockOnChange,
                    min: 2,
                })
            );

            act(() => {
                result.current.handleDecrement();
            });

            expect(mockOnChange).toHaveBeenCalledWith('2', 2);
        });

        test('handles decrement from empty string', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '',
                    onChange: mockOnChange,
                    min: 0,
                })
            );

            act(() => {
                result.current.handleDecrement();
            });

            // Empty string is treated as 0, so decrement should not call onChange
            expect(mockOnChange).not.toHaveBeenCalled();
        });
    });

    describe('input change handling', () => {
        test('allows valid integer input', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '1',
                    onChange: mockOnChange,
                })
            );

            act(() => {
                result.current.handleInputChange({
                    target: { value: '5' },
                } as unknown as React.FocusEvent<HTMLInputElement>);
            });

            expect(result.current.inputValue).toBe('5');
            expect(mockOnChange).toHaveBeenCalledWith('5', 5);
        });

        test('allows empty input', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            act(() => {
                result.current.handleInputChange({
                    target: { value: '' },
                } as unknown as React.FocusEvent<HTMLInputElement>);
            });

            expect(result.current.inputValue).toBe('');
            expect(mockOnChange).toHaveBeenCalledWith('', 0);
        });

        test('blocks non-integer characters', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            act(() => {
                result.current.handleInputChange({
                    target: { value: '5.5' },
                } as unknown as React.FocusEvent<HTMLInputElement>);
            });

            // Input value should not change
            expect(result.current.inputValue).toBe('5');
            expect(mockOnChange).not.toHaveBeenCalled();
        });

        test('blocks negative numbers', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            act(() => {
                result.current.handleInputChange({
                    target: { value: '-5' },
                } as unknown as React.FocusEvent<HTMLInputElement>);
            });

            // Input value should not change
            expect(result.current.inputValue).toBe('5');
            expect(mockOnChange).not.toHaveBeenCalled();
        });

        test('blocks letters and special characters', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            act(() => {
                result.current.handleInputChange({
                    target: { value: 'abc' },
                } as unknown as React.FocusEvent<HTMLInputElement>);
            });

            // Input value should not change
            expect(result.current.inputValue).toBe('5');
            expect(mockOnChange).not.toHaveBeenCalled();
        });
    });

    describe('focus handling', () => {
        test('sets focused state and selects text on focus', () => {
            const mockSelect = vi.fn();
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            act(() => {
                result.current.handleInputFocus({
                    target: { select: mockSelect },
                } as unknown as React.FocusEvent<HTMLInputElement>);
            });

            expect(result.current.isFocused).toBe(true);
            expect(mockSelect).toHaveBeenCalled();
        });

        test('sets unfocused state on blur', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            // First focus
            act(() => {
                result.current.handleInputFocus({
                    target: { select: vi.fn() },
                } as unknown as React.FocusEvent<HTMLInputElement>);
            });

            expect(result.current.isFocused).toBe(true);

            // Then blur
            act(() => {
                result.current.handleInputBlur({
                    target: { value: '5' },
                } as unknown as React.FocusEvent<HTMLInputElement>);
            });

            expect(result.current.isFocused).toBe(false);
        });

        test('calls custom onBlur handler when provided', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                    onBlur: mockOnBlur,
                })
            );

            act(() => {
                result.current.handleInputBlur({
                    target: { value: '5' },
                } as unknown as React.FocusEvent<HTMLInputElement>);
            });

            expect(mockOnBlur).toHaveBeenCalled();
        });

        test('auto-corrects invalid values on blur when no custom onBlur', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                    min: 1,
                })
            );

            // Set invalid input value
            act(() => {
                result.current.handleInputChange({
                    target: { value: '' },
                } as unknown as React.FocusEvent<HTMLInputElement>);
            });

            expect(result.current.inputValue).toBe('');

            // Blur should auto-correct to minimum
            act(() => {
                result.current.handleInputBlur({
                    target: { value: '' },
                } as unknown as React.FocusEvent<HTMLInputElement>);
            });

            expect(result.current.inputValue).toBe('1');
            expect(mockOnChange).toHaveBeenCalledWith('1', 1);
        });

        test('does not auto-correct when custom onBlur is provided', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                    onBlur: mockOnBlur,
                    min: 1,
                })
            );

            // Set invalid input value
            act(() => {
                result.current.handleInputChange({
                    target: { value: '' },
                } as unknown as React.FocusEvent<HTMLInputElement>);
            });

            expect(result.current.inputValue).toBe('');

            // Blur should not auto-correct
            act(() => {
                result.current.handleInputBlur({
                    target: { value: '' },
                } as unknown as React.FocusEvent<HTMLInputElement>);
            });

            expect(result.current.inputValue).toBe('');
            expect(mockOnChange).not.toHaveBeenCalledWith('1', 1);
        });
    });

    describe('keyboard navigation', () => {
        test('allows navigation keys', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            const navigationKeys = [
                'Backspace',
                'Delete',
                'Tab',
                'Escape',
                'Enter',
                'ArrowLeft',
                'ArrowRight',
                'Home',
                'End',
            ];

            navigationKeys.forEach((key) => {
                const mockPreventDefault = vi.fn();
                const event = {
                    key,
                    preventDefault: mockPreventDefault,
                } as unknown as React.KeyboardEvent<HTMLInputElement>;

                act(() => {
                    result.current.handleKeyDown(event);
                });

                // Navigation keys should not be prevented
                expect(mockPreventDefault).not.toHaveBeenCalled();
            });
        });

        test('allows digit keys', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            for (let i = 0; i <= 9; i++) {
                const mockPreventDefault = vi.fn();
                const event = {
                    key: i.toString(),
                    preventDefault: mockPreventDefault,
                } as unknown as React.KeyboardEvent<HTMLInputElement>;

                act(() => {
                    result.current.handleKeyDown(event);
                });

                // Digit keys should not be prevented
                expect(mockPreventDefault).not.toHaveBeenCalled();
            }
        });

        test('allows Ctrl/Cmd combinations', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            const mockPreventDefault = vi.fn();
            const event = {
                key: 'a',
                ctrlKey: true,
                preventDefault: mockPreventDefault,
            } as unknown as React.KeyboardEvent<HTMLInputElement>;

            act(() => {
                result.current.handleKeyDown(event);
            });

            // Ctrl combinations should not be prevented
            expect(mockPreventDefault).not.toHaveBeenCalled();
        });

        test('blocks non-allowed keys', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            const blockedKeys = ['a', 'b', 'c', '.', '-', '+', '='];

            blockedKeys.forEach((key) => {
                const mockPreventDefault = vi.fn();
                const event = {
                    key,
                    preventDefault: mockPreventDefault,
                } as unknown as React.KeyboardEvent<HTMLInputElement>;

                act(() => {
                    result.current.handleKeyDown(event);
                });

                // Non-allowed keys should be prevented
                expect(mockPreventDefault).toHaveBeenCalled();
            });
        });

        test('ArrowUp triggers increment', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            const mockPreventDefault = vi.fn();
            const event = {
                key: 'ArrowUp',
                preventDefault: mockPreventDefault,
            } as unknown as React.KeyboardEvent<HTMLInputElement>;

            act(() => {
                result.current.handleKeyDown(event);
            });

            expect(mockPreventDefault).toHaveBeenCalled();
            expect(mockOnChange).toHaveBeenCalledWith('6', 6);
        });

        test('ArrowDown triggers decrement', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            const mockPreventDefault = vi.fn();
            const event = {
                key: 'ArrowDown',
                preventDefault: mockPreventDefault,
            } as unknown as React.KeyboardEvent<HTMLInputElement>;

            act(() => {
                result.current.handleKeyDown(event);
            });

            expect(mockPreventDefault).toHaveBeenCalled();
            expect(mockOnChange).toHaveBeenCalledWith('4', 4);
        });

        test('Enter triggers increment when focused on input', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '5',
                    onChange: mockOnChange,
                })
            );

            // Mock inputRef.current to simulate focused input
            const mockInput = { focus: vi.fn() } as unknown as HTMLInputElement;
            result.current.inputRef.current = mockInput;

            const mockPreventDefault = vi.fn();
            const event = {
                key: 'Enter',
                target: mockInput,
                preventDefault: mockPreventDefault,
            } as unknown as React.KeyboardEvent<HTMLInputElement>;

            act(() => {
                result.current.handleKeyDown(event);
            });

            expect(mockPreventDefault).toHaveBeenCalled();
            expect(mockOnChange).toHaveBeenCalledWith('6', 6);
        });
    });

    describe('decrement button disabled state', () => {
        test('disables decrement when value is 1 and min is 0', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '1',
                    onChange: mockOnChange,
                    min: 0,
                })
            );

            expect(result.current.isDecrementDisabled).toBe(true);
        });

        test('enables decrement when value is greater than 1', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '2',
                    onChange: mockOnChange,
                    min: 0,
                })
            );

            expect(result.current.isDecrementDisabled).toBe(false);
        });

        test('enables decrement when value is 0', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '0',
                    onChange: mockOnChange,
                    min: 0,
                })
            );

            expect(result.current.isDecrementDisabled).toBe(false);
        });

        test('enables decrement when value is empty string', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '',
                    onChange: mockOnChange,
                    min: 0,
                })
            );

            expect(result.current.isDecrementDisabled).toBe(false);
        });

        test('enables decrement when value is string "0"', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '0',
                    onChange: mockOnChange,
                    min: 0,
                })
            );

            expect(result.current.isDecrementDisabled).toBe(false);
        });
    });

    describe('edge cases', () => {
        test('handles NaN values gracefully', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: 'NaN',
                    onChange: mockOnChange,
                })
            );

            act(() => {
                result.current.handleIncrement();
            });

            // NaN string is treated as 0, so increment should call with 1
            expect(mockOnChange).toHaveBeenCalledWith('1', 1);
        });

        test('handles invalid values gracefully', () => {
            // Test with a value that would cause issues but doesn't crash
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: 'invalid',
                    onChange: mockOnChange,
                })
            );

            act(() => {
                result.current.handleIncrement();
            });

            // Invalid string is treated as 0, so increment should call with 1
            expect(mockOnChange).toHaveBeenCalledWith('1', 1);
        });

        test('handles very large numbers', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '999999',
                    onChange: mockOnChange,
                })
            );

            act(() => {
                result.current.handleIncrement();
            });

            expect(mockOnChange).toHaveBeenCalledWith('1000000', 1000000);
        });

        test('handles zero minimum value', () => {
            const { result } = renderHook(() =>
                useQuantityPicker({
                    value: '0',
                    onChange: mockOnChange,
                    min: 0,
                })
            );

            act(() => {
                result.current.handleDecrement();
            });

            // When value is already at minimum (0), decrement should not call onChange
            expect(mockOnChange).not.toHaveBeenCalled();
        });
    });
});

describe('Quantity Picker Max Constraint', () => {
    const mockOnChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('should disable increment button when at max', () => {
        const { result } = renderHook(() =>
            useQuantityPicker({
                value: '3',
                onChange: mockOnChange,
                max: 3,
            })
        );

        expect(result.current.isIncrementDisabled).toBe(true);
    });

    test('should enable increment when below max', () => {
        const { result } = renderHook(() =>
            useQuantityPicker({
                value: '2',
                onChange: mockOnChange,
                max: 5,
            })
        );

        expect(result.current.isIncrementDisabled).toBe(false);
    });

    test('should clamp value on blur when exceeding max', () => {
        const { result } = renderHook(() =>
            useQuantityPicker({
                value: '10',
                onChange: mockOnChange,
                max: 3,
            })
        );

        act(() => {
            result.current.handleInputBlur({
                target: { value: '10' },
            } as React.FocusEvent<HTMLInputElement>);
        });

        expect(mockOnChange).toHaveBeenCalledWith('3', 3);
    });

    test('should allow typing max value exactly', () => {
        const { result } = renderHook(() =>
            useQuantityPicker({
                value: '5',
                onChange: mockOnChange,
                max: 5,
            })
        );

        act(() => {
            result.current.handleInputBlur({
                target: { value: '5' },
            } as React.FocusEvent<HTMLInputElement>);
        });

        expect(result.current.isIncrementDisabled).toBe(true);
    });

    test('should keep increment disabled when at max after incrementing', () => {
        const { result, rerender } = renderHook(
            ({ value }) =>
                useQuantityPicker({
                    value,
                    onChange: mockOnChange,
                    max: 3,
                }),
            { initialProps: { value: '2' } }
        );

        expect(result.current.isIncrementDisabled).toBe(false);

        act(() => {
            result.current.handleIncrement();
        });

        expect(mockOnChange).toHaveBeenCalledWith('3', 3);

        rerender({ value: '3' });

        expect(result.current.isIncrementDisabled).toBe(true);
    });

    test('should NOT clamp when onBlur handler is provided', () => {
        const mockOnBlur = vi.fn();
        const { result } = renderHook(() =>
            useQuantityPicker({
                value: '10',
                onChange: mockOnChange,
                max: 3,
                onBlur: mockOnBlur,
            })
        );

        act(() => {
            result.current.handleInputBlur({
                target: { value: '10' },
            } as React.FocusEvent<HTMLInputElement>);
        });

        expect(mockOnBlur).toHaveBeenCalled();
        expect(mockOnChange).not.toHaveBeenCalled();
    });

    test('should constrain increment to max', () => {
        const { result, rerender } = renderHook(
            ({ value }) =>
                useQuantityPicker({
                    value,
                    onChange: mockOnChange,
                    max: 3,
                }),
            { initialProps: { value: '2' } }
        );

        act(() => {
            result.current.handleIncrement();
        });

        expect(mockOnChange).toHaveBeenCalledWith('3', 3);

        rerender({ value: '3' });
        mockOnChange.mockClear();

        act(() => {
            result.current.handleIncrement();
        });

        expect(mockOnChange).not.toHaveBeenCalled();
    });

    test('should handle max of undefined (no limit)', () => {
        const { result } = renderHook(() =>
            useQuantityPicker({
                value: '100',
                onChange: mockOnChange,
                max: undefined,
            })
        );

        expect(result.current.isIncrementDisabled).toBe(false);

        act(() => {
            result.current.handleIncrement();
        });

        expect(mockOnChange).toHaveBeenCalledWith('101', 101);
    });

    test('should clamp between min and max on blur', () => {
        const { result } = renderHook(() =>
            useQuantityPicker({
                value: '0',
                onChange: mockOnChange,
                min: 1,
                max: 5,
            })
        );

        act(() => {
            result.current.handleInputBlur({
                target: { value: '0' },
            } as React.FocusEvent<HTMLInputElement>);
        });

        expect(mockOnChange).toHaveBeenCalledWith('1', 1);

        mockOnChange.mockClear();

        const { result: result2 } = renderHook(() =>
            useQuantityPicker({
                value: '10',
                onChange: mockOnChange,
                min: 1,
                max: 5,
            })
        );

        act(() => {
            result2.current.handleInputBlur({
                target: { value: '10' },
            } as React.FocusEvent<HTMLInputElement>);
        });

        expect(mockOnChange).toHaveBeenCalledWith('5', 5);
    });
});
