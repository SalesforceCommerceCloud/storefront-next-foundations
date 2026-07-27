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
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDeferredRender, useDeferredRenderSequence } from './use-deferred-render';

describe('useDeferredRender', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('should return true immediately when disabled', () => {
        const { result } = renderHook(() => useDeferredRender(false));
        expect(result.current).toBe(true);
    });

    it('should return false initially when enabled', () => {
        const { result } = renderHook(() => useDeferredRender(true));
        expect(result.current).toBe(false);
    });

    it('should return true after idle callback when requestIdleCallback is available', async () => {
        // Mock requestIdleCallback
        const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
            // Simulate immediate idle callback
            setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline), 0);
            return 1;
        });
        const mockCancelIdleCallback = vi.fn();

        global.requestIdleCallback = mockRequestIdleCallback;
        global.cancelIdleCallback = mockCancelIdleCallback;

        const { result } = renderHook(() => useDeferredRender(true));

        expect(result.current).toBe(false);

        // Fast-forward timers
        await vi.runAllTimersAsync();

        await waitFor(() => {
            expect(result.current).toBe(true);
        });

        expect(mockRequestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 });

        // Cleanup
        delete (global as any).requestIdleCallback;
        delete (global as any).cancelIdleCallback;
    });

    it('should use setTimeout fallback when requestIdleCallback is not available', async () => {
        // Ensure requestIdleCallback is not available
        const originalRequestIdleCallback = global.requestIdleCallback;
        delete (global as any).requestIdleCallback;

        const { result } = renderHook(() => useDeferredRender(true));

        expect(result.current).toBe(false);

        // Fast-forward timers
        await vi.runAllTimersAsync();

        await waitFor(() => {
            expect(result.current).toBe(true);
        });

        // Restore
        if (originalRequestIdleCallback) {
            global.requestIdleCallback = originalRequestIdleCallback;
        }
    });

    it('should cleanup idle callback on unmount', () => {
        const mockCancelIdleCallback = vi.fn();
        global.requestIdleCallback = vi.fn(() => 123);
        global.cancelIdleCallback = mockCancelIdleCallback;

        const { unmount } = renderHook(() => useDeferredRender(true));

        unmount();

        expect(mockCancelIdleCallback).toHaveBeenCalledWith(123);

        // Cleanup
        delete (global as any).requestIdleCallback;
        delete (global as any).cancelIdleCallback;
    });

    it('should cleanup timeout on unmount when using fallback', () => {
        delete (global as any).requestIdleCallback;

        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

        const { unmount } = renderHook(() => useDeferredRender(true));

        unmount();

        expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should forward custom idleTimeout to requestIdleCallback', () => {
        const mockRequestIdleCallback = vi.fn(() => 1);
        global.requestIdleCallback = mockRequestIdleCallback;
        global.cancelIdleCallback = vi.fn();

        const { unmount } = renderHook(() => useDeferredRender(true, { idleTimeout: 500 }));

        expect(mockRequestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 500 });

        unmount();
        delete (global as any).requestIdleCallback;
        delete (global as any).cancelIdleCallback;
    });

    it('should use custom fallbackTimeout when requestIdleCallback is unavailable', () => {
        delete (global as any).requestIdleCallback;

        const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

        const { unmount } = renderHook(() => useDeferredRender(true, { fallbackTimeout: 32 }));

        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 32);

        unmount();
    });

    it('should respect idleTimeout: 0 (not fall back to default)', () => {
        const mockRequestIdleCallback = vi.fn(() => 1);
        global.requestIdleCallback = mockRequestIdleCallback;
        global.cancelIdleCallback = vi.fn();

        const { unmount } = renderHook(() => useDeferredRender(true, { idleTimeout: 0 }));

        expect(mockRequestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 0 });

        unmount();
        delete (global as any).requestIdleCallback;
        delete (global as any).cancelIdleCallback;
    });

    it('should respect fallbackTimeout: 0 (not fall back to default)', () => {
        delete (global as any).requestIdleCallback;

        const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

        const { unmount } = renderHook(() => useDeferredRender(true, { fallbackTimeout: 0 }));

        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0);

        unmount();
    });
});

describe('useDeferredRenderSequence', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
        delete (global as any).requestIdleCallback;
        delete (global as any).cancelIdleCallback;
    });

    // Drives the RIC mock so each call eventually fires its callback. Tests can advance fake timers to step the
    // sequence one tick at a time. The cancellation test passes a custom `handle` so it can assert that exact value
    // is forwarded to `cancelIdleCallback`.
    const installImmediateRic = (handle = 1) => {
        const mockRic = vi.fn((callback: IdleRequestCallback) => {
            setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline), 0);
            return handle;
        });
        const mockCancel = vi.fn();
        global.requestIdleCallback = mockRic;
        global.cancelIdleCallback = mockCancel;
        return { mockRic, mockCancel };
    };

    it('returns 0 immediately when n is 0 and never schedules an idle frame', () => {
        const { mockRic } = installImmediateRic();

        const { result } = renderHook(() => useDeferredRenderSequence(0));

        expect(result.current).toBe(0);
        expect(mockRic).not.toHaveBeenCalled();
    });

    it('grows the cursor by 1 per idle frame up to n', async () => {
        installImmediateRic();

        const { result } = renderHook(() => useDeferredRenderSequence(3));

        expect(result.current).toBe(0);

        await vi.runAllTimersAsync();
        await waitFor(() => expect(result.current).toBe(3));
    });

    it('stops scheduling once the cursor reaches n', async () => {
        const { mockRic } = installImmediateRic();

        const { result } = renderHook(() => useDeferredRenderSequence(2));

        await vi.runAllTimersAsync();
        await waitFor(() => expect(result.current).toBe(2));

        // Two ticks — one per increment — and no further scheduling once we hit the cap.
        const callsAtCap = mockRic.mock.calls.length;
        await vi.runAllTimersAsync();
        expect(mockRic.mock.calls.length).toBe(callsAtCap);
    });

    it('clamps the returned value when n shrinks below the current cursor', async () => {
        installImmediateRic();

        const { result, rerender } = renderHook(({ n }) => useDeferredRenderSequence(n), { initialProps: { n: 3 } });

        await vi.runAllTimersAsync();
        await waitFor(() => expect(result.current).toBe(3));

        rerender({ n: 1 });
        expect(result.current).toBe(1);
    });

    it('cancels the pending idle callback on unmount', () => {
        const { mockCancel } = installImmediateRic(42);

        const { unmount } = renderHook(() => useDeferredRenderSequence(2));

        unmount();
        expect(mockCancel).toHaveBeenCalledWith(42);
    });

    it('falls back to setTimeout when requestIdleCallback is unavailable', async () => {
        delete (global as any).requestIdleCallback;

        const { result } = renderHook(() => useDeferredRenderSequence(2));

        await vi.runAllTimersAsync();
        await waitFor(() => expect(result.current).toBe(2));
    });

    it('forwards custom idleTimeout to requestIdleCallback', () => {
        const { mockRic } = installImmediateRic();

        const { unmount } = renderHook(() => useDeferredRenderSequence(2, { idleTimeout: 500 }));

        expect(mockRic).toHaveBeenCalledWith(expect.any(Function), { timeout: 500 });
        unmount();
    });
});
