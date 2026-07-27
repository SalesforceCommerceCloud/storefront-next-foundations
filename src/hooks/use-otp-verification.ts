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
import { useRef } from 'react';
import { useOtpInputs } from '@/hooks/use-otp-inputs';

interface UseOtpVerificationOptions {
    slotCount: number;
    onPasteComplete?: (code: string) => void;
}

export function useOtpVerification({ slotCount, onPasteComplete }: UseOtpVerificationOptions) {
    const otpInputs = useOtpInputs(slotCount, onPasteComplete);

    const otpInputsRef = useRef(otpInputs);
    otpInputsRef.current = otpInputs;

    const inputRefsStable = useRef(otpInputs.inputRefs);
    inputRefsStable.current = otpInputs.inputRefs;

    const refCallbacks = useRef<Array<(el: HTMLInputElement | null) => void> | null>(null);
    if (!refCallbacks.current || refCallbacks.current.length !== slotCount) {
        refCallbacks.current = Array.from({ length: slotCount }, (_, index) => {
            return (el: HTMLInputElement | null) => {
                inputRefsStable.current.current[index] = el;
            };
        });
    }

    return {
        otpInputs,
        otpInputsRef,
        refCallbacks: refCallbacks.current,
    };
}
