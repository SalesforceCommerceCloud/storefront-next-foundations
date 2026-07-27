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
import { useOtpVerification } from './use-otp-verification';

describe('useOtpVerification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('return value shape', () => {
        test('returns otpInputs, otpInputsRef, and refCallbacks', () => {
            const { result } = renderHook(() => useOtpVerification({ slotCount: 6 }));

            expect(result.current.otpInputs).toBeDefined();
            expect(result.current.otpInputsRef).toBeDefined();
            expect(result.current.refCallbacks).toBeDefined();
        });

        test('refCallbacks has the correct length matching slotCount', () => {
            const { result } = renderHook(() => useOtpVerification({ slotCount: 6 }));

            expect(result.current.refCallbacks).toHaveLength(6);
        });

        test('refCallbacks length matches different slotCount values', () => {
            const { result: result4 } = renderHook(() => useOtpVerification({ slotCount: 4 }));
            const { result: result8 } = renderHook(() => useOtpVerification({ slotCount: 8 }));

            expect(result4.current.refCallbacks).toHaveLength(4);
            expect(result8.current.refCallbacks).toHaveLength(8);
        });

        test('each refCallback is a function', () => {
            const { result } = renderHook(() => useOtpVerification({ slotCount: 6 }));

            result.current.refCallbacks.forEach((cb: (el: HTMLInputElement | null) => void) => {
                expect(typeof cb).toBe('function');
            });
        });

        test('otpInputsRef.current is in sync with otpInputs', () => {
            const { result } = renderHook(() => useOtpVerification({ slotCount: 6 }));

            expect(result.current.otpInputsRef.current).toBe(result.current.otpInputs);
        });
    });

    describe('refCallbacks', () => {
        test('refCallback assigns element to inputRefs at the correct index', () => {
            const { result } = renderHook(() => useOtpVerification({ slotCount: 4 }));

            const mockEl0 = document.createElement('input');
            const mockEl2 = document.createElement('input');

            act(() => {
                result.current.refCallbacks[0](mockEl0);
                result.current.refCallbacks[2](mockEl2);
            });

            expect(result.current.otpInputs.inputRefs.current[0]).toBe(mockEl0);
            expect(result.current.otpInputs.inputRefs.current[1]).toBeNull();
            expect(result.current.otpInputs.inputRefs.current[2]).toBe(mockEl2);
        });

        test('refCallback accepts null (unmount cleanup)', () => {
            const { result } = renderHook(() => useOtpVerification({ slotCount: 4 }));

            const mockEl = document.createElement('input');

            act(() => {
                result.current.refCallbacks[0](mockEl);
            });
            expect(result.current.otpInputs.inputRefs.current[0]).toBe(mockEl);

            act(() => {
                result.current.refCallbacks[0](null);
            });
            expect(result.current.otpInputs.inputRefs.current[0]).toBeNull();
        });

        test('refCallbacks array is recreated when slotCount changes', () => {
            const { result, rerender } = renderHook(
                ({ slotCount }: { slotCount: number }) => useOtpVerification({ slotCount }),
                { initialProps: { slotCount: 4 } }
            );

            const firstCallbacks = result.current.refCallbacks;

            rerender({ slotCount: 6 });

            expect(result.current.refCallbacks).not.toBe(firstCallbacks);
            expect(result.current.refCallbacks).toHaveLength(6);
        });
    });

    describe('otpInputs passthrough', () => {
        test('exposes values array initialized to empty strings', () => {
            const { result } = renderHook(() => useOtpVerification({ slotCount: 4 }));

            expect(result.current.otpInputs.values).toEqual(['', '', '', '']);
        });

        test('clear resets all values', () => {
            const { result } = renderHook(() => useOtpVerification({ slotCount: 4 }));

            act(() => {
                result.current.otpInputs.setValue(0, '5');
                result.current.otpInputs.setValue(1, '6');
            });

            act(() => {
                result.current.otpInputs.clear();
            });

            expect(result.current.otpInputs.values).toEqual(['', '', '', '']);
        });

        test('setValue returns the assembled code string', () => {
            const { result } = renderHook(() => useOtpVerification({ slotCount: 4 }));

            let code: string | null = null;
            act(() => {
                result.current.otpInputs.setValue(0, '7');
                code = result.current.otpInputs.setValue(1, '8');
            });

            expect(code).toBe('78');
        });
    });
});
