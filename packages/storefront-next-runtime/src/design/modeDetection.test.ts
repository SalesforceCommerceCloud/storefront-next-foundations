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

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { getUrlMode, isDesignModeActive, isPreviewModeActive } from './modeDetection';

// Mock window object for client-side tests
const mockWindow = {
    location: {
        search: '',
    },
};

describe('modeDetection', () => {
    beforeEach(() => {
        // Reset window mock
        vi.stubGlobal('window', mockWindow);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('getUrlMode', () => {
        describe('server-side usage with URL string', () => {
            const testCases = [
                {
                    description: 'returns EDIT mode from URL string',
                    url: 'https://example.com/page?mode=EDIT',
                    expected: 'EDIT',
                },
                {
                    description: 'returns PREVIEW mode from URL string',
                    url: 'https://example.com/page?mode=PREVIEW',
                    expected: 'PREVIEW',
                },
                {
                    description: 'returns custom mode from URL string',
                    url: 'https://example.com/page?mode=CUSTOM',
                    expected: 'CUSTOM',
                },
                {
                    description: 'returns null when no mode parameter in URL string',
                    url: 'https://example.com/page',
                    expected: null,
                },
                {
                    description: 'returns null when mode parameter is empty in URL string',
                    url: 'https://example.com/page?mode=',
                    expected: '',
                },
                {
                    description: 'handles URL string with multiple parameters',
                    url: 'https://example.com/page?foo=bar&mode=EDIT&baz=qux',
                    expected: 'EDIT',
                },
                {
                    description: 'handles URL string with hash fragment',
                    url: 'https://example.com/page?mode=PREVIEW#section',
                    expected: 'PREVIEW',
                },
            ];

            test.each(testCases)('$description', ({ url, expected }) => {
                expect(getUrlMode(url)).toBe(expected);
            });
        });

        describe('server-side usage with URL object', () => {
            const testCases = [
                {
                    description: 'returns EDIT mode from URL object',
                    url: new URL('https://example.com/page?mode=EDIT'),
                    expected: 'EDIT',
                },
                {
                    description: 'returns PREVIEW mode from URL object',
                    url: new URL('https://example.com/page?mode=PREVIEW'),
                    expected: 'PREVIEW',
                },
                {
                    description: 'returns null when no mode parameter in URL object',
                    url: new URL('https://example.com/page'),
                    expected: null,
                },
                {
                    description: 'handles URL object with multiple parameters',
                    url: new URL('https://example.com/page?foo=bar&mode=EDIT&baz=qux'),
                    expected: 'EDIT',
                },
            ];

            test.each(testCases)('$description', ({ url, expected }) => {
                expect(getUrlMode(url)).toBe(expected);
            });
        });

        describe('server-side usage with Request object', () => {
            const testCases = [
                {
                    description: 'returns EDIT mode from Request object',
                    request: new Request('https://example.com/page?mode=EDIT'),
                    expected: 'EDIT',
                },
                {
                    description: 'returns PREVIEW mode from Request object',
                    request: new Request('https://example.com/page?mode=PREVIEW'),
                    expected: 'PREVIEW',
                },
                {
                    description: 'returns null when no mode parameter in Request object',
                    request: new Request('https://example.com/page'),
                    expected: null,
                },
                {
                    description: 'handles Request object with multiple parameters',
                    request: new Request('https://example.com/page?foo=bar&mode=EDIT&baz=qux'),
                    expected: 'EDIT',
                },
                {
                    description: 'handles POST Request object with mode in URL',
                    request: new Request('https://example.com/page?mode=PREVIEW', { method: 'POST' }),
                    expected: 'PREVIEW',
                },
            ];

            test.each(testCases)('$description', ({ request, expected }) => {
                expect(getUrlMode(request)).toBe(expected);
            });
        });

        describe('client-side usage with window.location', () => {
            const testCases = [
                {
                    description: 'returns EDIT mode from window.location.search',
                    search: '?mode=EDIT',
                    expected: 'EDIT',
                },
                {
                    description: 'returns PREVIEW mode from window.location.search',
                    search: '?mode=PREVIEW',
                    expected: 'PREVIEW',
                },
                {
                    description: 'returns null when no mode parameter in window.location.search',
                    search: '',
                    expected: null,
                },
                {
                    description: 'returns null when mode parameter is empty in window.location.search',
                    search: '?mode=',
                    expected: '',
                },
                {
                    description: 'handles window.location.search with multiple parameters',
                    search: '?foo=bar&mode=EDIT&baz=qux',
                    expected: 'EDIT',
                },
                {
                    description: 'handles window.location.search without leading question mark',
                    search: 'mode=PREVIEW&other=value',
                    expected: 'PREVIEW',
                },
            ];

            test.each(testCases)('$description', ({ search, expected }) => {
                mockWindow.location.search = search;
                expect(getUrlMode()).toBe(expected);
            });
        });

        describe('server-side environment without window', () => {
            test('returns null when window is undefined and no URL provided', () => {
                vi.stubGlobal('window', undefined);
                expect(getUrlMode()).toBe(null);
            });
        });
    });

    describe('isDesignModeActive', () => {
        describe('server-side usage', () => {
            const testCases = [
                {
                    description: 'returns true when mode=EDIT in URL string',
                    url: 'https://example.com/page?mode=EDIT',
                    expected: true,
                },
                {
                    description: 'returns false when mode=PREVIEW in URL string',
                    url: 'https://example.com/page?mode=PREVIEW',
                    expected: false,
                },
                {
                    description: 'returns false when no mode parameter in URL string',
                    url: 'https://example.com/page',
                    expected: false,
                },
                {
                    description: 'returns false when mode is different value in URL string',
                    url: 'https://example.com/page?mode=CUSTOM',
                    expected: false,
                },
                {
                    description: 'returns true when mode=EDIT in URL object',
                    url: new URL('https://example.com/page?mode=EDIT'),
                    expected: true,
                },
                {
                    description: 'returns true when mode=EDIT in Request object',
                    url: new Request('https://example.com/page?mode=EDIT'),
                    expected: true,
                },
            ];

            test.each(testCases)('$description', ({ url, expected }) => {
                expect(isDesignModeActive(url)).toBe(expected);
            });
        });

        describe('client-side usage', () => {
            const testCases = [
                {
                    description: 'returns true when mode=EDIT in window.location.search',
                    search: '?mode=EDIT',
                    expected: true,
                },
                {
                    description: 'returns false when mode=PREVIEW in window.location.search',
                    search: '?mode=PREVIEW',
                    expected: false,
                },
                {
                    description: 'returns false when no mode parameter in window.location.search',
                    search: '',
                    expected: false,
                },
                {
                    description: 'returns false when mode is different value in window.location.search',
                    search: '?mode=CUSTOM',
                    expected: false,
                },
            ];

            test.each(testCases)('$description', ({ search, expected }) => {
                mockWindow.location.search = search;
                expect(isDesignModeActive()).toBe(expected);
            });
        });

        test('returns false in server environment without window and no URL', () => {
            vi.stubGlobal('window', undefined);
            expect(isDesignModeActive()).toBe(false);
        });
    });

    describe('isPreviewModeActive', () => {
        describe('server-side usage', () => {
            const testCases = [
                {
                    description: 'returns true when mode=PREVIEW in URL string',
                    url: 'https://example.com/page?mode=PREVIEW',
                    expected: true,
                },
                {
                    description: 'returns false when mode=EDIT in URL string',
                    url: 'https://example.com/page?mode=EDIT',
                    expected: false,
                },
                {
                    description: 'returns false when no mode parameter in URL string',
                    url: 'https://example.com/page',
                    expected: false,
                },
                {
                    description: 'returns false when mode is different value in URL string',
                    url: 'https://example.com/page?mode=CUSTOM',
                    expected: false,
                },
                {
                    description: 'returns true when mode=PREVIEW in URL object',
                    url: new URL('https://example.com/page?mode=PREVIEW'),
                    expected: true,
                },
                {
                    description: 'returns true when mode=PREVIEW in Request object',
                    url: new Request('https://example.com/page?mode=PREVIEW'),
                    expected: true,
                },
            ];

            test.each(testCases)('$description', ({ url, expected }) => {
                expect(isPreviewModeActive(url)).toBe(expected);
            });
        });

        describe('client-side usage', () => {
            const testCases = [
                {
                    description: 'returns true when mode=PREVIEW in window.location.search',
                    search: '?mode=PREVIEW',
                    expected: true,
                },
                {
                    description: 'returns false when mode=EDIT in window.location.search',
                    search: '?mode=EDIT',
                    expected: false,
                },
                {
                    description: 'returns false when no mode parameter in window.location.search',
                    search: '',
                    expected: false,
                },
                {
                    description: 'returns false when mode is different value in window.location.search',
                    search: '?mode=CUSTOM',
                    expected: false,
                },
            ];

            test.each(testCases)('$description', ({ search, expected }) => {
                mockWindow.location.search = search;
                expect(isPreviewModeActive()).toBe(expected);
            });
        });

        test('returns false in server environment without window and no URL', () => {
            vi.stubGlobal('window', undefined);
            expect(isPreviewModeActive()).toBe(false);
        });
    });
});
