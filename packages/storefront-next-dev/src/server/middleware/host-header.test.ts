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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createHostHeaderMiddleware } from './host-header';

describe('host-header middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        // Save original env
        originalEnv = { ...process.env };

        mockRequest = {
            method: 'POST',
            url: '/api/action',
            headers: {},
            get: vi.fn((name: string) => {
                const headerName = name.toLowerCase();
                const value = mockRequest.headers?.[headerName];
                if (Array.isArray(value)) {
                    return value.join(', ');
                }
                return value;
            }) as any,
        };

        mockResponse = {};
        nextFunction = vi.fn();
    });

    afterEach(() => {
        // Restore original env
        process.env = originalEnv;
        vi.clearAllMocks();
    });

    describe('createHostHeaderMiddleware', () => {
        it('should create a middleware function', () => {
            const middleware = createHostHeaderMiddleware();
            expect(middleware).toBeTypeOf('function');
        });

        it('should always call next()', () => {
            const middleware = createHostHeaderMiddleware();
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);
            expect(nextFunction).toHaveBeenCalledOnce();
        });
    });

    describe('X-Forwarded-Host handling', () => {
        it('should use existing X-Forwarded-Host when present', () => {
            mockRequest.headers = {
                'x-forwarded-host': 'www.example.com',
                origin: 'https://different.com',
            };
            process.env.EXTERNAL_DOMAIN_NAME = 'fallback.com';

            const middleware = createHostHeaderMiddleware();
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockRequest.headers?.['x-forwarded-host']).toBe('www.example.com');
            expect(nextFunction).toHaveBeenCalled();
        });

        it('should leave multiple X-Forwarded-Host values untouched (React Router handles splitting)', () => {
            mockRequest.headers = {
                'x-forwarded-host': 'first.com, second.com',
            };

            const middleware = createHostHeaderMiddleware();
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            // Logic: If set, do nothing.
            expect(mockRequest.headers?.['x-forwarded-host']).toBe('first.com, second.com');
        });
    });

    describe('EXTERNAL_DOMAIN_NAME fallback', () => {
        it('should use EXTERNAL_DOMAIN_NAME only when X-Forwarded-Host is missing', () => {
            mockRequest.headers = {};
            process.env.EXTERNAL_DOMAIN_NAME = 'mrt-domain.com';

            const middleware = createHostHeaderMiddleware();
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockRequest.headers?.['x-forwarded-host']).toBe('mrt-domain.com');
        });

        it('should handle missing EXTERNAL_DOMAIN_NAME gracefully', () => {
            mockRequest.headers = {};
            delete process.env.EXTERNAL_DOMAIN_NAME;

            const middleware = createHostHeaderMiddleware();
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockRequest.headers?.['x-forwarded-host']).toBeUndefined();
        });
    });

    describe('Security and CSRF Protection', () => {
        it('should NOT use Origin header to set X-Forwarded-Host', () => {
            mockRequest.headers = {
                origin: 'https://attacker.com',
            };
            process.env.EXTERNAL_DOMAIN_NAME = 'trusted.com';

            const middleware = createHostHeaderMiddleware();
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockRequest.headers?.['x-forwarded-host']).toBe('trusted.com');
        });
    });

    describe('Real-world scenarios', () => {
        it('should handle vanity domain via eCDN/CloudFront (Already set)', () => {
            mockRequest.headers = {
                'x-forwarded-host': 'www.mystore.com',
                host: 'internal-lambda.amazonaws.com',
            };
            process.env.EXTERNAL_DOMAIN_NAME = 'abc123.cloudfront.net';

            const middleware = createHostHeaderMiddleware();
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockRequest.headers?.['x-forwarded-host']).toBe('www.mystore.com');
            expect(mockRequest.headers?.host).toBe('internal-lambda.amazonaws.com');
        });

        it('should handle local development using EXTERNAL_DOMAIN_NAME', () => {
            mockRequest.headers = {};
            process.env.EXTERNAL_DOMAIN_NAME = 'localhost:5173';

            const middleware = createHostHeaderMiddleware();
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockRequest.headers?.['x-forwarded-host']).toBe('localhost:5173');
        });
    });
});
