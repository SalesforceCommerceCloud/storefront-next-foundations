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
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { RouterContextProvider } from 'react-router';
import { correlationMiddleware } from './correlation.server';
import { correlationContext, generateCorrelationId } from '@/lib/correlation';
import { createLoaderArgs, createTestContext } from '@/lib/test-utils';

vi.mock('@/lib/correlation', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        generateCorrelationId: vi.fn(() => 'mock-correlation-id-12345'),
    };
});

vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    })),
}));

describe('middlewares/correlation.server.ts', () => {
    let mockContext: Readonly<RouterContextProvider>;
    let mockNext: Mock<() => Promise<Response>>;
    let mockRequest: Request;

    beforeEach(() => {
        vi.clearAllMocks();
        mockContext = createTestContext();
        mockNext = vi.fn<() => Promise<Response>>().mockResolvedValue(new Response('test'));
        mockRequest = new Request('https://example.com/test');
    });

    describe('correlationMiddleware', () => {
        it('should use x-correlation-id header when present', async () => {
            const requestWithHeader = new Request('https://example.com/test', {
                headers: { 'x-correlation-id': 'incoming-correlation-id' },
            });

            await correlationMiddleware(createLoaderArgs(requestWithHeader, mockContext, { pattern: '/' }), mockNext);

            expect(generateCorrelationId).not.toHaveBeenCalled();
            expect(mockContext.get(correlationContext)).toBe('incoming-correlation-id');
        });

        it('should generate a correlation ID when no headers are present', async () => {
            await correlationMiddleware(createLoaderArgs(mockRequest, mockContext, { pattern: '/' }), mockNext);

            expect(generateCorrelationId).toHaveBeenCalledOnce();
            expect(mockContext.get(correlationContext)).toBe('mock-correlation-id-12345');
        });

        it('should call next() and return its response', async () => {
            const expectedResponse = new Response('expected response');
            mockNext.mockResolvedValue(expectedResponse);

            const result = await correlationMiddleware(
                { request: mockRequest, context: mockContext, params: {}, pattern: '/', url: new URL(mockRequest.url) },
                mockNext
            );

            expect(mockNext).toHaveBeenCalledOnce();
            expect(result).toBe(expectedResponse);
        });

        it('should set correlation ID before calling next()', async () => {
            let correlationIdDuringNext: string | undefined;

            mockNext.mockImplementation(() => {
                correlationIdDuringNext = mockContext.get(correlationContext);
                return Promise.resolve(new Response('test'));
            });

            await correlationMiddleware(createLoaderArgs(mockRequest, mockContext, { pattern: '/' }), mockNext);

            expect(correlationIdDuringNext).toBe('mock-correlation-id-12345');
        });

        it('should work with different request URLs', async () => {
            const requests = [
                new Request('https://example.com/'),
                new Request('https://example.com/products/123'),
                new Request('https://example.com/search?q=test'),
            ];

            for (const request of requests) {
                vi.clearAllMocks();
                mockContext = createTestContext();

                await correlationMiddleware(createLoaderArgs(request, mockContext, { pattern: '/' }), mockNext);

                expect(generateCorrelationId).toHaveBeenCalledOnce();
                expect(mockContext.get(correlationContext)).toBe('mock-correlation-id-12345');
            }
        });

        it('should generate a unique ID for each request', async () => {
            let callCount = 0;
            vi.mocked(generateCorrelationId).mockImplementation(() => `id-${++callCount}`);

            const context1 = createTestContext();
            const context2 = createTestContext();

            await correlationMiddleware(createLoaderArgs(mockRequest, context1, { pattern: '/' }), mockNext);
            await correlationMiddleware(createLoaderArgs(mockRequest, context2, { pattern: '/' }), mockNext);

            expect(context1.get(correlationContext)).toBe('id-1');
            expect(context2.get(correlationContext)).toBe('id-2');
        });
    });
});
