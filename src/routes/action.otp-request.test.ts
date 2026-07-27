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

import { action } from './action.otp-request';
import { requestOtp } from '@/middlewares/auth.server';

vi.mock('@/middlewares/auth.server', () => ({
    requestOtp: vi.fn(),
}));
vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() })),
}));

const mockRequestOtp = vi.mocked(requestOtp);

describe('action.otp-request', () => {
    let mockContext: ActionFunctionArgs['context'];

    const createActionArgs = (email?: string, method = 'POST'): ActionFunctionArgs => {
        const formData = new FormData();
        if (email !== undefined) {
            formData.append('email', email);
        }

        const requestInit: RequestInit = { method };
        // GET/HEAD requests cannot have body
        if (method === 'POST') {
            requestInit.body = formData;
        }

        return {
            request: new Request('http://localhost/action/otp-request', requestInit),
            params: {},
            context: mockContext,
            pattern: '/action/otp-request',
        } as ActionFunctionArgs;
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockContext = {
            get: vi.fn().mockReturnValue({ locale: { id: 'en-US' } }),
        } as any;

        mockRequestOtp.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns error when method is not POST', async () => {
        const response = await action(createActionArgs('test@example.com', 'GET'));

        expect(response.status).toBe(405);
        const result = await response.json();
        expect(result).toEqual({
            success: false,
            error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
        });
        expect(mockRequestOtp).not.toHaveBeenCalled();
    });

    it('returns error when email is missing', async () => {
        const response = await action(createActionArgs(undefined));

        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result).toEqual({
            success: false,
            error: { code: 'REQUIRED_FIELD', message: 'Email is required' },
        });
        expect(mockRequestOtp).not.toHaveBeenCalled();
    });

    it('returns error when email is empty', async () => {
        const response = await action(createActionArgs('  '));

        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result).toEqual({
            success: false,
            error: { code: 'REQUIRED_FIELD', message: 'Email is required' },
        });
        expect(mockRequestOtp).not.toHaveBeenCalled();
    });

    it('returns success when OTP request succeeds', async () => {
        const response = await action(createActionArgs('test@example.com'));

        expect(mockRequestOtp).toHaveBeenCalledTimes(1);
        expect(mockRequestOtp).toHaveBeenCalledWith(mockContext, { email: 'test@example.com' });

        const result = await response.json();
        expect(result).toEqual({
            success: true,
            email: 'test@example.com',
        });
    });

    it('trims email whitespace', async () => {
        const response = await action(createActionArgs('  test@example.com  '));

        expect(mockRequestOtp).toHaveBeenCalledWith(mockContext, { email: 'test@example.com' });
        const result = await response.json();
        expect(result.email).toBe('test@example.com');
    });

    it('returns error when OTP request fails', async () => {
        const apiError = new Error('Request failed');
        mockRequestOtp.mockRejectedValue(apiError);

        const response = await action(createActionArgs('test@example.com'));

        expect(response.status).toBe(500);
        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.error).toEqual({ code: 'OPERATION_FAILED', message: 'Request failed' });
    });
});
