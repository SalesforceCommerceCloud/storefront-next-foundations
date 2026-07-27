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
import { modeDetectionMiddlewareServer, modeDetectionContext, type ModeDetectionContext } from './mode-detection';
import { createLoaderArgs, createTestContext } from '@/lib/test-utils';

vi.mock('@salesforce/storefront-next-runtime/design/mode', () => ({
    isDesignModeActive: vi.fn(),
    isPreviewModeActive: vi.fn(),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    })),
}));

describe('modeDetectionMiddleware', () => {
    let mockContext: Readonly<RouterContextProvider>;
    let mockNext: Mock<() => Promise<Response>>;
    let mockRequest: Request;
    let isDesignModeActive: ReturnType<typeof vi.fn>;
    let isPreviewModeActive: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockContext = createTestContext();
        mockNext = vi.fn<() => Promise<Response>>().mockResolvedValue(new Response('test'));
        mockRequest = new Request('https://example.com/test');

        const modeModule = await import('@salesforce/storefront-next-runtime/design/mode');
        isDesignModeActive = vi.mocked(modeModule.isDesignModeActive);
        isPreviewModeActive = vi.mocked(modeModule.isPreviewModeActive);

        isDesignModeActive.mockReturnValue(false);
        isPreviewModeActive.mockReturnValue(false);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('modeDetectionMiddlewareServer', () => {
        it('should call next() and return its response', async () => {
            const expectedResponse = new Response('expected response');
            mockNext.mockResolvedValue(expectedResponse);

            const result = await modeDetectionMiddlewareServer(
                createLoaderArgs(mockRequest, mockContext, { pattern: '*' }),
                mockNext
            );

            expect(mockNext).toHaveBeenCalledOnce();
            expect(result).toBe(expectedResponse);
        });

        it('should detect design mode when mode=EDIT is in URL', async () => {
            isDesignModeActive.mockReturnValue(true);
            isPreviewModeActive.mockReturnValue(false);

            await modeDetectionMiddlewareServer(createLoaderArgs(mockRequest, mockContext, { pattern: '*' }), mockNext);

            expect(isDesignModeActive).toHaveBeenCalledWith(mockRequest);
            expect(isPreviewModeActive).toHaveBeenCalledWith(mockRequest);

            const modeContext = mockContext.get(modeDetectionContext) as ModeDetectionContext;
            expect(modeContext).toEqual({
                isDesignMode: true,
                isPreviewMode: false,
            });
        });

        it('should detect preview mode when mode=PREVIEW is in URL', async () => {
            isDesignModeActive.mockReturnValue(false);
            isPreviewModeActive.mockReturnValue(true);

            await modeDetectionMiddlewareServer(createLoaderArgs(mockRequest, mockContext, { pattern: '*' }), mockNext);

            expect(isDesignModeActive).toHaveBeenCalledWith(mockRequest);
            expect(isPreviewModeActive).toHaveBeenCalledWith(mockRequest);

            const modeContext = mockContext.get(modeDetectionContext) as ModeDetectionContext;
            expect(modeContext).toEqual({
                isDesignMode: false,
                isPreviewMode: true,
            });
        });

        it('should set both modes to false when no mode parameter is present', async () => {
            isDesignModeActive.mockReturnValue(false);
            isPreviewModeActive.mockReturnValue(false);

            await modeDetectionMiddlewareServer(createLoaderArgs(mockRequest, mockContext, { pattern: '*' }), mockNext);

            expect(isDesignModeActive).toHaveBeenCalledWith(mockRequest);
            expect(isPreviewModeActive).toHaveBeenCalledWith(mockRequest);

            const modeContext = mockContext.get(modeDetectionContext) as ModeDetectionContext;
            expect(modeContext).toEqual({
                isDesignMode: false,
                isPreviewMode: false,
            });
        });

        it('should set mode context before calling next()', async () => {
            isDesignModeActive.mockReturnValue(true);
            isPreviewModeActive.mockReturnValue(false);

            let contextDuringNext: ModeDetectionContext | null = null;

            mockNext.mockImplementation(() => {
                contextDuringNext = mockContext.get(modeDetectionContext);
                return Promise.resolve(new Response('test'));
            });

            await modeDetectionMiddlewareServer(createLoaderArgs(mockRequest, mockContext, { pattern: '*' }), mockNext);

            expect(contextDuringNext).toEqual({
                isDesignMode: true,
                isPreviewMode: false,
            });
        });
    });
});
