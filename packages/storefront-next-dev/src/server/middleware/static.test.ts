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
import express, { type Request, type Response } from 'express';
import { normalizePath, createPathRegex } from '../../test-utils';

// Mock express.static
vi.mock('express', async () => {
    const actual = await vi.importActual('express');
    return {
        ...actual,
        default: {
            static: vi.fn((root: string, options: any) => {
                const middleware = (req: Request, res: Response, next: () => void) => {
                    // Store the options and root for testing
                    (middleware as any).root = root;
                    (middleware as any).options = options;

                    // Call setHeaders if provided
                    if (options?.setHeaders) {
                        options.setHeaders(res);
                    }

                    next();
                };
                (middleware as any).root = root;
                (middleware as any).options = options;
                return middleware;
            }),
        },
    };
});

// Mock the paths module
vi.mock('../../utils/paths', () => ({
    getBundlePath: vi.fn((bundleId: string) => `/mobify/bundle/${bundleId}/client/`),
}));

// Mock the logger
vi.mock('../../logger', () => ({
    logger: {
        info: vi.fn(),
    },
}));

// Import after mocks are set up
import { createStaticMiddleware } from './static';
import { getBundlePath } from '../../utils/paths';
import { logger } from '../../logger';

const logInfoSpy = vi.spyOn(logger, 'info');

describe('static middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createStaticMiddleware', () => {
        it('should create a static middleware', () => {
            const middleware = createStaticMiddleware('test-bundle', '/project/path');
            expect(middleware).toBeTypeOf('function');
        });

        it('should call getBundlePath with the provided bundleId', () => {
            createStaticMiddleware('my-bundle-id', '/project/path');
            expect(getBundlePath).toHaveBeenCalledWith('my-bundle-id');
        });

        it('should call express.static with correct client build directory', () => {
            createStaticMiddleware('test-bundle', '/project/path');
            // Use normalizePath for cross-platform comparison
            const staticCall = vi.mocked(express.static).mock.calls[0];
            expect(normalizePath(staticCall[0])).toBe('/project/path/build/client');
            expect(staticCall[1]).toEqual(expect.any(Object));
        });

        it('should log the static serving configuration', () => {
            vi.mocked(getBundlePath).mockReturnValue('/mobify/bundle/test-123/client/');
            createStaticMiddleware('test-123', '/my/project');

            // Use regex to match both Unix (/) and Windows (\) path separators
            expect(logInfoSpy).toHaveBeenCalledWith(
                expect.stringMatching(
                    createPathRegex(
                        'Serving static assets from /my/project/build/client at /mobify/bundle/test-123/client/'
                    )
                )
            );
        });

        it('should configure setHeaders callback in options', () => {
            const middleware = createStaticMiddleware('test-bundle', '/project/path') as any;

            expect(middleware.options).toBeDefined();
            expect(middleware.options.setHeaders).toBeTypeOf('function');
        });

        it('should set Cache-Control header with correct value', () => {
            const middleware = createStaticMiddleware('test-bundle', '/project/path') as any;
            const setHeaderMock = vi.fn();
            const mockResponse = {
                setHeader: setHeaderMock,
            } as unknown as Response;

            middleware.options.setHeaders(mockResponse);

            expect(setHeaderMock).toHaveBeenCalledWith('Cache-Control', 'public, max-age=31536000, immutable');
        });

        it('should set x-local-static-cache-control header', () => {
            const middleware = createStaticMiddleware('test-bundle', '/project/path') as any;
            const setHeaderMock = vi.fn();
            const mockResponse = {
                setHeader: setHeaderMock,
            } as unknown as Response;

            middleware.options.setHeaders(mockResponse);

            expect(setHeaderMock).toHaveBeenCalledWith('x-local-static-cache-control', '1');
        });

        it('should set both headers when setHeaders is called', () => {
            const middleware = createStaticMiddleware('test-bundle', '/project/path') as any;
            const setHeaderMock = vi.fn();
            const mockResponse = {
                setHeader: setHeaderMock,
            } as unknown as Response;

            middleware.options.setHeaders(mockResponse);

            expect(setHeaderMock).toHaveBeenCalledTimes(2);
        });

        it('should handle different bundleId values correctly', () => {
            const testCases = [
                { bundleId: 'prod-bundle-123', path: '/prod/project' },
                { bundleId: 'dev-bundle-456', path: '/dev/project' },
                { bundleId: 'staging-789', path: '/staging/project' },
            ];

            testCases.forEach(({ bundleId, path }) => {
                vi.clearAllMocks();
                createStaticMiddleware(bundleId, path);

                expect(getBundlePath).toHaveBeenCalledWith(bundleId);
                // Use normalizePath for cross-platform comparison
                const staticCall = vi.mocked(express.static).mock.calls[0];
                expect(normalizePath(staticCall[0])).toBe(`${path}/build/client`);
            });
        });

        it('should handle different project directory paths correctly', () => {
            const testPaths = ['/absolute/path/to/project', '/home/user/my-app', '/var/www/storefront'];

            testPaths.forEach((projectPath) => {
                vi.clearAllMocks();
                createStaticMiddleware('bundle-id', projectPath);

                // Use normalizePath for cross-platform comparison
                const staticCall = vi.mocked(express.static).mock.calls[0];
                expect(normalizePath(staticCall[0])).toBe(`${projectPath}/build/client`);
            });
        });

        it('should use path.join to construct client build directory', () => {
            // Test that path separators are handled correctly
            createStaticMiddleware('test', '/project/root');

            const staticCall = vi.mocked(express.static).mock.calls[0];
            const clientDir = staticCall[0];

            // Should contain proper path separators
            expect(clientDir).toContain('build');
            expect(clientDir).toContain('client');
        });

        it('should create middleware with correct root path for nested project structures', () => {
            const middleware = createStaticMiddleware('nested-bundle', '/deep/nested/project/structure') as any;

            // Use normalizePath for cross-platform comparison
            expect(normalizePath(middleware.root)).toBe('/deep/nested/project/structure/build/client');
        });

        it('should maintain immutability in Cache-Control header', () => {
            const middleware = createStaticMiddleware('test-bundle', '/project/path') as any;
            const setHeaderMock = vi.fn();
            const mockResponse = {
                setHeader: setHeaderMock,
            } as unknown as Response;

            middleware.options.setHeaders(mockResponse);

            const cacheControlCall = setHeaderMock.mock.calls.find((call) => call[0] === 'Cache-Control');

            expect(cacheControlCall?.[1]).toContain('immutable');
        });

        it('should set max-age to 1 year in seconds', () => {
            const middleware = createStaticMiddleware('test-bundle', '/project/path') as any;
            const setHeaderMock = vi.fn();
            const mockResponse = {
                setHeader: setHeaderMock,
            } as unknown as Response;

            middleware.options.setHeaders(mockResponse);

            const cacheControlCall = setHeaderMock.mock.calls.find((call) => call[0] === 'Cache-Control');

            // 31536000 seconds = 365 days
            expect(cacheControlCall?.[1]).toContain('max-age=31536000');
        });

        it('should set Cache-Control as public', () => {
            const middleware = createStaticMiddleware('test-bundle', '/project/path') as any;
            const setHeaderMock = vi.fn();
            const mockResponse = {
                setHeader: setHeaderMock,
            } as unknown as Response;

            middleware.options.setHeaders(mockResponse);

            const cacheControlCall = setHeaderMock.mock.calls.find((call) => call[0] === 'Cache-Control');

            expect(cacheControlCall?.[1]).toContain('public');
        });
    });
});
