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
import { renderHook, act } from '@testing-library/react';
import { CorrelationProvider, useCorrelationId } from './correlation';
import type { ReactNode } from 'react';

// Track the mock location to allow updates during tests
let mockLocation = { pathname: '/initial', search: '' };

// Mock react-router's useLocation
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        useLocation: () => mockLocation,
    };
});

// Mock generateCorrelationId
vi.mock('@/lib/correlation', () => ({
    generateCorrelationId: vi.fn(() => 'generated-correlation-id'),
}));

describe('providers/correlation.tsx', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocation = { pathname: '/initial', search: '' };
    });

    describe('CorrelationProvider', () => {
        it('should provide correlation ID from value prop', () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <CorrelationProvider value="server-correlation-id">{children}</CorrelationProvider>
            );

            const { result } = renderHook(() => useCorrelationId(), { wrapper });

            expect(result.current).toBe('server-correlation-id');
        });

        it('should handle null value and convert to undefined', () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <CorrelationProvider value={null}>{children}</CorrelationProvider>
            );

            const { result } = renderHook(() => useCorrelationId(), { wrapper });

            // Initial render with null value should result in undefined
            expect(result.current).toBeUndefined();
        });

        it('should update correlation ID when value prop changes to a new ID', () => {
            let correlationValue: string | null = 'initial-id';

            const wrapper = ({ children }: { children: ReactNode }) => (
                <CorrelationProvider value={correlationValue}>{children}</CorrelationProvider>
            );

            const { result, rerender } = renderHook(() => useCorrelationId(), { wrapper });
            expect(result.current).toBe('initial-id');

            // Update the value
            correlationValue = 'updated-id';
            rerender();

            expect(result.current).toBe('updated-id');
        });

        it('should generate new ID on navigation when value is null', async () => {
            const { generateCorrelationId } = await import('@/lib/correlation');

            let correlationValue: string | null = 'initial-id';

            const wrapper = ({ children }: { children: ReactNode }) => (
                <CorrelationProvider value={correlationValue}>{children}</CorrelationProvider>
            );

            const { result, rerender } = renderHook(() => useCorrelationId(), { wrapper });
            expect(result.current).toBe('initial-id');

            // Simulate navigation: change location AND value becomes null (clientLoader without correlationId)
            mockLocation = { pathname: '/new-page', search: '' };
            correlationValue = null;

            act(() => {
                rerender();
            });

            expect(generateCorrelationId).toHaveBeenCalled();
            expect(result.current).toBe('generated-correlation-id');
        });

        it('should NOT generate new ID during hydration when value becomes undefined', async () => {
            const { generateCorrelationId } = await import('@/lib/correlation');
            vi.mocked(generateCorrelationId).mockClear();

            let correlationValue: string | null = 'server-id';

            const wrapper = ({ children }: { children: ReactNode }) => (
                <CorrelationProvider value={correlationValue}>{children}</CorrelationProvider>
            );

            const { result, rerender } = renderHook(() => useCorrelationId(), { wrapper });
            expect(result.current).toBe('server-id');

            // Simulate hydration: value becomes null but location stays the same
            // This happens when clientLoader.hydrate = true runs after SSR
            correlationValue = null;

            act(() => {
                rerender();
            });

            // Should NOT generate new ID - preserve the server-rendered one
            expect(generateCorrelationId).not.toHaveBeenCalled();
            expect(result.current).toBe('server-id');
        });

        it('should use provided value even on navigation', async () => {
            const { generateCorrelationId } = await import('@/lib/correlation');
            vi.mocked(generateCorrelationId).mockClear();

            let correlationValue: string | null = 'initial-id';

            const wrapper = ({ children }: { children: ReactNode }) => (
                <CorrelationProvider value={correlationValue}>{children}</CorrelationProvider>
            );

            const { result, rerender } = renderHook(() => useCorrelationId(), { wrapper });
            expect(result.current).toBe('initial-id');

            // Simulate navigation with new server-provided ID
            mockLocation = { pathname: '/new-page', search: '' };
            correlationValue = 'new-server-id';

            act(() => {
                rerender();
            });

            // Should use the provided ID, not generate a new one
            expect(generateCorrelationId).not.toHaveBeenCalled();
            expect(result.current).toBe('new-server-id');
        });

        it('should detect navigation based on pathname change', async () => {
            const { generateCorrelationId } = await import('@/lib/correlation');
            vi.mocked(generateCorrelationId).mockClear();

            let correlationValue: string | null = 'initial-id';

            const wrapper = ({ children }: { children: ReactNode }) => (
                <CorrelationProvider value={correlationValue}>{children}</CorrelationProvider>
            );

            const { result, rerender } = renderHook(() => useCorrelationId(), { wrapper });
            expect(result.current).toBe('initial-id');

            // Navigate to different pathname
            mockLocation = { pathname: '/different-page', search: '' };
            correlationValue = null;

            act(() => {
                rerender();
            });

            expect(generateCorrelationId).toHaveBeenCalled();
            expect(result.current).toBe('generated-correlation-id');
        });

        it('should detect navigation based on search change', async () => {
            const { generateCorrelationId } = await import('@/lib/correlation');
            vi.mocked(generateCorrelationId).mockClear();

            let correlationValue: string | null = 'initial-id';

            const wrapper = ({ children }: { children: ReactNode }) => (
                <CorrelationProvider value={correlationValue}>{children}</CorrelationProvider>
            );

            const { result, rerender } = renderHook(() => useCorrelationId(), { wrapper });
            expect(result.current).toBe('initial-id');

            // Navigate with different search params (same pathname)
            mockLocation = { pathname: '/initial', search: '?q=test' };
            correlationValue = null;

            act(() => {
                rerender();
            });

            expect(generateCorrelationId).toHaveBeenCalled();
            expect(result.current).toBe('generated-correlation-id');
        });
    });

    describe('useCorrelationId', () => {
        it('should return undefined when used outside CorrelationProvider', () => {
            const { result } = renderHook(() => useCorrelationId());
            expect(result.current).toBeUndefined();
        });

        it('should return the correlation ID from context', () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <CorrelationProvider value="test-correlation-id">{children}</CorrelationProvider>
            );

            const { result } = renderHook(() => useCorrelationId(), { wrapper });
            expect(result.current).toBe('test-correlation-id');
        });
    });
});
