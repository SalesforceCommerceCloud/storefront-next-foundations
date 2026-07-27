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
import { action } from './action.update-marketing-consent';
import { createActionArgs, createTestContext, expectStatus } from '@/lib/test-utils';
import { ApiError } from '@/scapi';

const mockUpdateSubscriptionsBulk = vi.fn();
vi.mock('@/lib/api/consent.server', () => ({
    updateSubscriptionsBulk: (...args: unknown[]) => mockUpdateSubscriptionsBulk(...args),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    })),
}));

type SingleUpdate = Record<string, string>;

function createJsonRequest(updates: SingleUpdate | SingleUpdate[], method: 'GET' | 'POST' = 'POST'): Request {
    if (method === 'GET') {
        return new Request('http://localhost/action/update-marketing-consent', { method: 'GET' });
    }
    const list = Array.isArray(updates) ? updates : [updates];
    return new Request('http://localhost/action/update-marketing-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: list }),
    });
}

describe('action.update-marketing-consent', () => {
    const mockContext = createTestContext();

    const validBody = {
        subscriptionId: 'sub-123',
        channel: 'email',
        contactPointValue: 'user@example.com',
        status: 'opt_in',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUpdateSubscriptionsBulk.mockResolvedValue({ results: [] });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('method and validation', () => {
        it('returns 405 for non-POST requests', async () => {
            const request = createJsonRequest([], 'GET');
            const result = await action(
                createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' })
            );
            expect(result.data).toEqual({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
            });
            expectStatus(result, 405);
            expect(mockUpdateSubscriptionsBulk).not.toHaveBeenCalled();
        });

        it('returns 400 when updates is empty', async () => {
            const request = createJsonRequest([]);
            const result = await action(
                createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' })
            );
            expect(result.data).toEqual({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'updates is required and must not be empty' },
            });
            expectStatus(result, 400);
            expect(mockUpdateSubscriptionsBulk).not.toHaveBeenCalled();
        });

        it('returns 400 when subscriptionId is missing', async () => {
            const request = createJsonRequest({
                channel: validBody.channel,
                contactPointValue: validBody.contactPointValue,
                status: validBody.status,
            });
            const result = await action(
                createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' })
            );
            expect(result.data).toEqual({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'subscriptionId is required' },
            });
            expectStatus(result, 400);
            expect(mockUpdateSubscriptionsBulk).not.toHaveBeenCalled();
        });

        it('returns 400 when subscriptionId is blank', async () => {
            const request = createJsonRequest({
                subscriptionId: '   ',
                channel: validBody.channel,
                contactPointValue: validBody.contactPointValue,
                status: validBody.status,
            });
            const result = await action(
                createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' })
            );
            expect(result.data).toEqual({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'subscriptionId is required' },
            });
            expectStatus(result, 400);
            expect(mockUpdateSubscriptionsBulk).not.toHaveBeenCalled();
        });

        it('returns 400 when channel is invalid', async () => {
            const request = createJsonRequest({
                subscriptionId: validBody.subscriptionId,
                channel: 'invalid',
                contactPointValue: validBody.contactPointValue,
                status: validBody.status,
            });
            const result = await action(
                createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' })
            );
            const json = result.data;
            expect(json.success).toBe(false);
            expect(json.error?.message).toContain('channel must be one of');
            expect(mockUpdateSubscriptionsBulk).not.toHaveBeenCalled();
        });

        it('returns 400 when contactPointValue is missing', async () => {
            const request = createJsonRequest({
                subscriptionId: validBody.subscriptionId,
                channel: validBody.channel,
                status: validBody.status,
            });
            const result = await action(
                createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' })
            );
            expect(result.data).toEqual({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'contactPointValue is required' },
            });
            expectStatus(result, 400);
            expect(mockUpdateSubscriptionsBulk).not.toHaveBeenCalled();
        });

        it('returns 400 when contactPointValue is blank', async () => {
            const request = createJsonRequest({
                subscriptionId: validBody.subscriptionId,
                channel: validBody.channel,
                contactPointValue: '   ',
                status: validBody.status,
            });
            const result = await action(
                createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' })
            );
            expect(result.data).toEqual({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'contactPointValue is required' },
            });
            expectStatus(result, 400);
            expect(mockUpdateSubscriptionsBulk).not.toHaveBeenCalled();
        });

        it('returns 400 when status is invalid', async () => {
            const request = createJsonRequest({
                subscriptionId: validBody.subscriptionId,
                channel: validBody.channel,
                contactPointValue: validBody.contactPointValue,
                status: 'invalid',
            });
            const result = await action(
                createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' })
            );
            const json = result.data;
            expect(json.success).toBe(false);
            expect(json.error?.message).toContain('status must be one of');
            expect(mockUpdateSubscriptionsBulk).not.toHaveBeenCalled();
        });
    });

    describe('success', () => {
        it('calls updateSubscriptionsBulk and returns 200 with success true', async () => {
            const request = createJsonRequest(validBody);
            const result = await action(
                createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' })
            );
            expect(result.data).toEqual({ success: true });
            expect(result.init?.status).toBeUndefined();

            expect(mockUpdateSubscriptionsBulk).toHaveBeenCalledTimes(1);
            expect(mockUpdateSubscriptionsBulk).toHaveBeenCalledWith(mockContext, [
                {
                    subscriptionId: 'sub-123',
                    channel: 'email',
                    contactPointValue: 'user@example.com',
                    status: 'opt_in',
                },
            ]);
        });

        it('trims subscriptionId and contactPointValue', async () => {
            const request = createJsonRequest({
                subscriptionId: '  sub-123  ',
                channel: 'sms',
                contactPointValue: '  +15551234567  ',
                status: 'opt_out',
            });
            await action(createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' }));

            expect(mockUpdateSubscriptionsBulk).toHaveBeenCalledWith(mockContext, [
                {
                    subscriptionId: 'sub-123',
                    channel: 'sms',
                    contactPointValue: '+15551234567',
                    status: 'opt_out',
                },
            ]);
        });

        it('accepts whatsapp channel', async () => {
            const request = createJsonRequest({
                ...validBody,
                channel: 'whatsapp',
                contactPointValue: '+15559876543',
            });
            await action(createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' }));
            expect(mockUpdateSubscriptionsBulk).toHaveBeenCalledWith(mockContext, [
                {
                    subscriptionId: validBody.subscriptionId,
                    channel: 'whatsapp',
                    contactPointValue: '+15559876543',
                    status: 'opt_in',
                },
            ]);
        });

        it('accepts JSON batch and calls updateSubscriptionsBulk once', async () => {
            const updates = [
                { subscriptionId: 'a', channel: 'email', contactPointValue: 'a@b.com', status: 'opt_in' },
                { subscriptionId: 'b', channel: 'sms', contactPointValue: '+1', status: 'opt_out' },
            ];
            const request = createJsonRequest(updates);
            await action(createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' }));
            expect(mockUpdateSubscriptionsBulk).toHaveBeenCalledTimes(1);
            expect(mockUpdateSubscriptionsBulk).toHaveBeenCalledWith(mockContext, [
                { subscriptionId: 'a', channel: 'email', contactPointValue: 'a@b.com', status: 'opt_in' },
                { subscriptionId: 'b', channel: 'sms', contactPointValue: '+1', status: 'opt_out' },
            ]);
        });

        it('returns 207 and success false when bulk response has partial failures', async () => {
            mockUpdateSubscriptionsBulk.mockResolvedValueOnce({
                results: [
                    {
                        subscriptionId: 'sub-1',
                        channel: 'email',
                        contactPointValue: 'a@b.com',
                        status: 'opt_in',
                        success: true,
                    },
                    {
                        subscriptionId: 'sub-2',
                        channel: 'sms',
                        contactPointValue: 'invalid',
                        status: 'opt_out',
                        success: false,
                        error: { code: 'INVALID_CONTACT_POINT', message: 'Invalid phone' },
                    },
                ],
            });

            const request = createJsonRequest([
                { subscriptionId: 'sub-1', channel: 'email', contactPointValue: 'a@b.com', status: 'opt_in' },
                { subscriptionId: 'sub-2', channel: 'sms', contactPointValue: 'invalid', status: 'opt_out' },
            ]);
            const result = await action(
                createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' })
            );
            expect(result.data).toEqual({
                success: false,
                error: { code: 'OPERATION_FAILED', message: '1 of 2 update(s) failed' },
                partialSuccess: true,
            });
            expectStatus(result, 207);
        });

        it('returns 500 and "All updates failed" when every item in bulk response fails', async () => {
            mockUpdateSubscriptionsBulk.mockResolvedValueOnce({
                results: [
                    {
                        subscriptionId: 'sub-1',
                        channel: 'email',
                        contactPointValue: 'bad',
                        status: 'opt_in',
                        success: false,
                        error: { code: 'INVALID', message: 'Invalid' },
                    },
                    {
                        subscriptionId: 'sub-2',
                        channel: 'sms',
                        contactPointValue: 'invalid',
                        status: 'opt_out',
                        success: false,
                        error: { code: 'INVALID_CONTACT_POINT', message: 'Invalid phone' },
                    },
                ],
            });

            const request = createJsonRequest([
                { subscriptionId: 'sub-1', channel: 'email', contactPointValue: 'bad', status: 'opt_in' },
                { subscriptionId: 'sub-2', channel: 'sms', contactPointValue: 'invalid', status: 'opt_out' },
            ]);
            const result = await action(
                createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' })
            );
            expect(result.data).toEqual({
                success: false,
                error: { code: 'OPERATION_FAILED', message: 'All updates failed' },
                partialSuccess: false,
            });
            expectStatus(result, 500);
        });
    });

    describe('error handling', () => {
        it('returns 500 and structured error when updateSubscriptionsBulk throws ApiError', async () => {
            const apiError = new ApiError({
                status: 403,
                statusText: 'Forbidden',
                headers: new Headers(),
                body: { type: 'Forbidden', title: 'Forbidden', detail: 'Forbidden' },
                rawBody: '{}',
                url: 'https://api.example.com/test',
                method: 'POST',
            });
            mockUpdateSubscriptionsBulk.mockRejectedValueOnce(apiError);

            const request = createJsonRequest(validBody);
            const result = await action(
                createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' })
            );
            const json = result.data;
            expect(json.success).toBe(false);
            expect(json.error).toBeDefined();
            expect(json.error?.code).toBeDefined();
            expect(json.error?.message).toBeDefined();
        });

        it('returns 500 and structured error when updateSubscriptionsBulk throws generic Error', async () => {
            mockUpdateSubscriptionsBulk.mockRejectedValueOnce(new Error('Network error'));

            const request = createJsonRequest(validBody);
            const result = await action(
                createActionArgs(request, mockContext, { pattern: '/action/update-marketing-consent' })
            );
            const json = result.data;
            expect(json.success).toBe(false);
            expect(json.error).toEqual({ code: 'OPERATION_FAILED', message: 'Network error' });
        });
    });
});
