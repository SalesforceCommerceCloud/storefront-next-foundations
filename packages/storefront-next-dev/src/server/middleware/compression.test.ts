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
import type { Request, Response } from 'express';
import zlib from 'node:zlib';

// Mock the logger module
vi.mock('../../logger', () => ({
    logger: {
        warn: vi.fn(),
    },
}));

// Mock the compression module
vi.mock('compression', () => {
    const mockCompressionFn = vi.fn((options) => {
        const middleware = (req: Request, res: Response, next: () => void) => {
            // Store the options for testing
            (middleware as any).options = options;
            next();
        };
        (middleware as any).options = options;
        return middleware;
    });

    // Add the filter method to the mock
    (mockCompressionFn as any).filter = vi.fn((_req: Request, _res: Response) => true);

    return {
        default: mockCompressionFn,
    };
});

// Import after mock is set up
import { createCompressionMiddleware } from './compression';
import compression from 'compression';
import { logger } from '../../logger';

const logWarnSpy = vi.spyOn(logger, 'warn');

describe('compression middleware', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        vi.clearAllMocks();
        // Reset the filter to return true by default
        (compression as any).filter.mockReturnValue(true);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('createCompressionMiddleware', () => {
        it('should create a compression middleware', () => {
            const middleware = createCompressionMiddleware();
            expect(middleware).toBeTypeOf('function');
        });

        it('should use default compression level when COMPRESSION_LEVEL is not set', () => {
            delete process.env.COMPRESSION_LEVEL;
            const middleware = createCompressionMiddleware() as any;

            expect(middleware.options).toBeDefined();
            expect(middleware.options.level).toBe(zlib.constants.Z_DEFAULT_COMPRESSION);
        });

        it('should use custom compression level from COMPRESSION_LEVEL environment variable', () => {
            process.env.COMPRESSION_LEVEL = '9';
            const middleware = createCompressionMiddleware() as any;

            expect(middleware.options).toBeDefined();
            expect(middleware.options.level).toBe(9);
        });

        it('should use compression level 0 when COMPRESSION_LEVEL is set to 0', () => {
            process.env.COMPRESSION_LEVEL = '0';
            const middleware = createCompressionMiddleware() as any;

            expect(middleware.options).toBeDefined();
            expect(middleware.options.level).toBe(0);
        });

        it('should use compression level 5 when COMPRESSION_LEVEL is set to 5', () => {
            process.env.COMPRESSION_LEVEL = '5';
            const middleware = createCompressionMiddleware() as any;

            expect(middleware.options).toBeDefined();
            expect(middleware.options.level).toBe(5);
        });

        describe('invalid COMPRESSION_LEVEL validation', () => {
            it('should use default compression level and warn when COMPRESSION_LEVEL is non-numeric string', () => {
                process.env.COMPRESSION_LEVEL = 'invalid';
                const middleware = createCompressionMiddleware() as any;

                expect(middleware.options.level).toBe(zlib.constants.Z_DEFAULT_COMPRESSION);
                expect(logWarnSpy).toHaveBeenCalledWith(
                    '[compression] Invalid COMPRESSION_LEVEL="invalid". Using default (-1).'
                );
            });

            it('should use default compression level and warn when COMPRESSION_LEVEL is negative', () => {
                process.env.COMPRESSION_LEVEL = '-5';
                const middleware = createCompressionMiddleware() as any;

                expect(middleware.options.level).toBe(zlib.constants.Z_DEFAULT_COMPRESSION);
                expect(logWarnSpy).toHaveBeenCalledWith(
                    '[compression] Invalid COMPRESSION_LEVEL="-5". Using default (-1).'
                );
            });

            it('should use default compression level and warn when COMPRESSION_LEVEL is greater than 9', () => {
                process.env.COMPRESSION_LEVEL = '10';
                const middleware = createCompressionMiddleware() as any;

                expect(middleware.options.level).toBe(zlib.constants.Z_DEFAULT_COMPRESSION);
                expect(logWarnSpy).toHaveBeenCalledWith(
                    '[compression] Invalid COMPRESSION_LEVEL="10". Using default (-1).'
                );
            });

            it('should use default compression level and warn when COMPRESSION_LEVEL is a large number', () => {
                process.env.COMPRESSION_LEVEL = '100';
                const middleware = createCompressionMiddleware() as any;

                expect(middleware.options.level).toBe(zlib.constants.Z_DEFAULT_COMPRESSION);
                expect(logWarnSpy).toHaveBeenCalledWith(
                    '[compression] Invalid COMPRESSION_LEVEL="100". Using default (-1).'
                );
            });

            it('should use default compression level and warn when COMPRESSION_LEVEL is a decimal number', () => {
                process.env.COMPRESSION_LEVEL = '5.5';
                const middleware = createCompressionMiddleware() as any;

                expect(middleware.options.level).toBe(zlib.constants.Z_DEFAULT_COMPRESSION);
                expect(logWarnSpy).toHaveBeenCalledWith(
                    '[compression] Invalid COMPRESSION_LEVEL="5.5". Using default (-1).'
                );
            });

            it('should use default compression level without warning when COMPRESSION_LEVEL is empty string', () => {
                process.env.COMPRESSION_LEVEL = '';
                const middleware = createCompressionMiddleware() as any;

                expect(middleware.options.level).toBe(zlib.constants.Z_DEFAULT_COMPRESSION);
                expect(logWarnSpy).not.toHaveBeenCalled();
            });

            it('should use default compression level without warning when COMPRESSION_LEVEL contains only whitespace', () => {
                process.env.COMPRESSION_LEVEL = '  ';
                const middleware = createCompressionMiddleware() as any;

                expect(middleware.options.level).toBe(zlib.constants.Z_DEFAULT_COMPRESSION);
                expect(logWarnSpy).not.toHaveBeenCalled();
            });

            it('should use default compression level and warn when COMPRESSION_LEVEL is alphabetic', () => {
                process.env.COMPRESSION_LEVEL = 'abc';
                const middleware = createCompressionMiddleware() as any;

                expect(middleware.options.level).toBe(zlib.constants.Z_DEFAULT_COMPRESSION);
                expect(logWarnSpy).toHaveBeenCalledWith(
                    '[compression] Invalid COMPRESSION_LEVEL="abc". Using default (-1).'
                );
            });

            it('should use default compression level and warn when COMPRESSION_LEVEL is mixed alphanumeric', () => {
                process.env.COMPRESSION_LEVEL = '5abc';
                const middleware = createCompressionMiddleware() as any;

                expect(middleware.options.level).toBe(zlib.constants.Z_DEFAULT_COMPRESSION);
                expect(logWarnSpy).toHaveBeenCalledWith(
                    '[compression] Invalid COMPRESSION_LEVEL="5abc". Using default (-1).'
                );
            });
        });

        it('should have a filter function in options', () => {
            const middleware = createCompressionMiddleware() as any;

            expect(middleware.options).toBeDefined();
            expect(middleware.options.filter).toBeTypeOf('function');
        });

        it('should return false from filter when x-no-compression header is present', () => {
            const middleware = createCompressionMiddleware() as any;
            const mockRequest = {
                headers: { 'x-no-compression': 'true' },
            } as Partial<Request>;
            const mockResponse = {} as Partial<Response>;

            const result = middleware.options.filter(mockRequest, mockResponse);
            expect(result).toBe(false);
        });

        it('should call compression.filter when x-no-compression header is not present', () => {
            const middleware = createCompressionMiddleware() as any;
            const mockRequest = {
                headers: {},
            } as Partial<Request>;
            const mockResponse = {} as Partial<Response>;

            middleware.options.filter(mockRequest, mockResponse);
            expect((compression as any).filter).toHaveBeenCalledWith(mockRequest, mockResponse);
        });

        it('should return result from compression.filter when x-no-compression header is not present', () => {
            (compression as any).filter.mockReturnValueOnce(true);

            const middleware = createCompressionMiddleware() as any;
            const mockRequest = {
                headers: {},
            } as Partial<Request>;
            const mockResponse = {} as Partial<Response>;

            const result = middleware.options.filter(mockRequest, mockResponse);
            expect(result).toBe(true);
        });

        it('should return false from compression.filter when it returns false', () => {
            (compression as any).filter.mockReturnValueOnce(false);

            const middleware = createCompressionMiddleware() as any;
            const mockRequest = {
                headers: {},
            } as Partial<Request>;
            const mockResponse = {} as Partial<Response>;

            const result = middleware.options.filter(mockRequest, mockResponse);
            expect(result).toBe(false);
        });

        it('should call compression.filter when x-no-compression header is empty string', () => {
            const middleware = createCompressionMiddleware() as any;
            const mockRequest = {
                headers: { 'x-no-compression': '' },
            } as Partial<Request>;
            const mockResponse = {} as Partial<Response>;

            const result = middleware.options.filter(mockRequest, mockResponse);
            // Empty string is falsy, so it calls compression.filter
            expect(result).toBe(true);
            expect((compression as any).filter).toHaveBeenCalledWith(mockRequest, mockResponse);
        });

        it('should handle headers as string array for x-no-compression', () => {
            const middleware = createCompressionMiddleware() as any;
            const mockRequest = {
                headers: { 'x-no-compression': ['true', 'false'] },
            } as Partial<Request>;
            const mockResponse = {} as Partial<Response>;

            const result = middleware.options.filter(mockRequest, mockResponse);
            expect(result).toBe(false);
        });
    });
});
