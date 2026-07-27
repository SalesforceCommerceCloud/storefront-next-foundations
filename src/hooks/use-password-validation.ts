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
import { useState } from 'react';
import { isPasswordValid } from '@/lib/utils';

/**
 * Custom hook for password validation and matching
 * Handles password and confirm password state, validation, and mismatch detection
 *
 * @returns Object containing password state, handlers, and validation state
 *
 * @example
 * ```tsx
 * const {
 *   password,
 *   confirmPassword,
 *   showPasswordMismatch,
 *   handlePasswordChange,
 *   handleConfirmPasswordChange,
 *   isFormValid
 * } = usePasswordValidation();
 * ```
 */
export function usePasswordValidation({ defaultPassword = '', defaultConfirmPassword = '' } = {}) {
    const [password, setPassword] = useState(defaultPassword);
    const [confirmPassword, setConfirmPassword] = useState(defaultConfirmPassword);
    const [showPasswordMismatch, setShowPasswordMismatch] = useState(false);

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
        if (confirmPassword && e.target.value !== confirmPassword) {
            setShowPasswordMismatch(true);
        } else {
            setShowPasswordMismatch(false);
        }
    };

    const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfirmPassword(e.target.value);
        if (password && e.target.value !== password) {
            setShowPasswordMismatch(true);
        } else {
            setShowPasswordMismatch(false);
        }
    };

    const isFormValid = isPasswordValid(password) && password === confirmPassword && password.length > 0;

    return {
        password,
        confirmPassword,
        showPasswordMismatch,
        handlePasswordChange,
        handleConfirmPasswordChange,
        isFormValid,
    };
}
