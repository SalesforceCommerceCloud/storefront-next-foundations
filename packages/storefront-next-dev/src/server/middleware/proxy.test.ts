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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ServerConfig } from '../config';

// Mock http-proxy-middleware
vi.mock('http-proxy-middleware', () => {
    const mockMiddleware = vi.fn();
    return {
        createProxyMiddleware: vi.fn((options) => {
            const middleware = mockMiddleware;
            (middleware as any).options = options;
            return middleware;
        }),
    };
});

// Import after mock is set up
import { createCommerceProxyMiddleware } from './proxy';
import { createProxyMiddleware } from 'http-proxy-middleware';

describe('proxy middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createCommerceProxyMiddleware', () => {
        it('should create a proxy middleware', () => {
            const config: ServerConfig = {
                commerce: {
                    api: {
                        shortCode: 'test-short-code',
                        organizationId: 'test-org-id',
                        clientId: 'test-client-id',
                        proxy: '/mobify/proxy/api',
                    },
                },
            };

            const middleware = createCommerceProxyMiddleware(config);

            expect(middleware).toBeDefined();
            expect(createProxyMiddleware).toHaveBeenCalledTimes(1);
        });

        it('should configure proxy with correct target', () => {
            const config: ServerConfig = {
                commerce: {
                    api: {
                        shortCode: 'my-short-code',
                        organizationId: 'org-123',
                        clientId: 'client-456',
                        proxy: '/mobify/proxy/api',
                    },
                },
            };

            const middleware = createCommerceProxyMiddleware(config) as any;

            expect(createProxyMiddleware).toHaveBeenCalledWith({
                target: 'https://my-short-code.api.commercecloud.salesforce.com',
                changeOrigin: true,
                secure: true,
            });
            expect(middleware.options.target).toBe('https://my-short-code.api.commercecloud.salesforce.com');
        });

        it('should enable changeOrigin option', () => {
            const config: ServerConfig = {
                commerce: {
                    api: {
                        shortCode: 'test-code',
                        organizationId: 'test-org',
                        clientId: 'test-client',
                        proxy: '/mobify/proxy/api',
                    },
                },
            };

            const middleware = createCommerceProxyMiddleware(config) as any;

            expect(middleware.options.changeOrigin).toBe(true);
        });

        it('should handle different short codes correctly', () => {
            const testCases = ['prod-us-01', 'staging-eu-02', 'dev-ap-03', 'test-123-abc'];

            testCases.forEach((shortCode) => {
                vi.clearAllMocks();

                const config: ServerConfig = {
                    commerce: {
                        api: {
                            shortCode,
                            organizationId: 'org',
                            clientId: 'client',
                            proxy: '/mobify/proxy/api',
                        },
                    },
                };

                const middleware = createCommerceProxyMiddleware(config) as any;

                expect(middleware.options.target).toBe(`https://${shortCode}.api.commercecloud.salesforce.com`);
            });
        });

        it('should create middleware with minimal config', () => {
            const config: ServerConfig = {
                commerce: {
                    api: {
                        shortCode: 'minimal',
                        organizationId: 'org',
                        clientId: 'client',
                        proxy: '/api',
                    },
                },
            };

            const middleware = createCommerceProxyMiddleware(config);

            expect(middleware).toBeDefined();
            expect(createProxyMiddleware).toHaveBeenCalledTimes(1);
        });

        it('should only pass target, changeOrigin, and secure to createProxyMiddleware', () => {
            const config: ServerConfig = {
                commerce: {
                    api: {
                        shortCode: 'test',
                        organizationId: 'org',
                        clientId: 'client',
                        proxy: '/mobify/proxy/api',
                    },
                },
            };

            createCommerceProxyMiddleware(config);

            expect(createProxyMiddleware).toHaveBeenCalledWith({
                target: 'https://test.api.commercecloud.salesforce.com',
                changeOrigin: true,
                secure: true,
            });

            // Verify no other options were passed
            const callArgs = (createProxyMiddleware as any).mock.calls[0][0];
            expect(Object.keys(callArgs)).toEqual(['target', 'changeOrigin', 'secure']);
        });

        it('should use proxyHost when provided', () => {
            const config: ServerConfig = {
                commerce: {
                    api: {
                        shortCode: '',
                        organizationId: 'org',
                        clientId: 'client',
                        proxy: '/mobify/proxy/api',
                        proxyHost: 'https://scw:25010',
                    },
                },
            };

            const middleware = createCommerceProxyMiddleware(config) as any;

            expect(middleware.options.target).toBe('https://scw:25010');
            expect(middleware.options.secure).toBe(false);
        });
    });
});
