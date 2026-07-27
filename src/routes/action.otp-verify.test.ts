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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionFunctionArgs } from 'react-router';
import { ApiError } from '@/scapi';

import { action } from './action.otp-verify';
import { verifyOtp } from '@/middlewares/auth.server';

vi.mock('@/middlewares/auth.server', () => ({
    verifyOtp: vi.fn(),
}));
vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() })),
}));

const mockVerifyOtp = vi.mocked(verifyOtp);

describe('action.otp-verify', () => {
    let mockContext: ActionFunctionArgs['context'];

    const createActionArgs = (otpCode?: string, email?: string): ActionFunctionArgs => {
        const formData = new FormData();
        if (otpCode !== undefined) {
            formData.append('otpCode', otpCode);
        }
        if (email !== undefined) {
            formData.append('email', email);
        }

        return {
            request: new Request('http://localhost/action/otp-verify', {
                method: 'POST',
                body: formData,
            }),
            params: {},
            context: mockContext,
            pattern: '/action/otp-verify',
        } as ActionFunctionArgs;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockContext = {} as ActionFunctionArgs['context'];
        mockVerifyOtp.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns error when otpCode is missing', async () => {
        const response = await action(createActionArgs(undefined, 'test@example.com'));

        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result).toEqual({
            success: false,
            error: { code: 'REQUIRED_FIELD', message: 'OTP code is required' },
        });
        expect(mockVerifyOtp).not.toHaveBeenCalled();
    });

    it('returns error when email is missing', async () => {
        const response = await action(createActionArgs('12345678', undefined));

        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result).toEqual({
            success: false,
            error: { code: 'REQUIRED_FIELD', message: 'Email is required' },
        });
        expect(mockVerifyOtp).not.toHaveBeenCalled();
    });

    it('returns success on valid OTP', async () => {
        const response = await action(createActionArgs('12345678', 'test@example.com'));

        expect(mockVerifyOtp).toHaveBeenCalledTimes(1);
        expect(mockVerifyOtp).toHaveBeenCalledWith(mockContext, {
            pwdActionToken: '12345678',
            email: 'test@example.com',
        });

        const result = await response.json();
        expect(result).toEqual({ success: true });
    });

    it('extracts error message from ApiError.rawBody JSON', async () => {
        const rawBody = JSON.stringify({ message: 'Invalid or expired OTP code' });
        const apiError = new ApiError({
            status: 400,
            statusText: 'Bad Request',
            headers: new Headers(),
            body: { type: '', title: '', detail: '' },
            rawBody,
            url: 'http://test.com',
            method: 'POST',
        });

        mockVerifyOtp.mockRejectedValue(apiError);

        const response = await action(createActionArgs('12345678', 'test@example.com'));

        expect(response.status).toBe(500);
        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.error).toEqual({ code: 'OPERATION_FAILED', message: 'Invalid or expired OTP code' });
    });
});
