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
import { getEventMediator, resetEventMediator } from './mediator';
import type { EventAdapter, AnalyticsEvent, EventSiteInfo, ConsentPreferences } from './types';

const createMockViewPageEvent = (path: string): AnalyticsEvent => ({
    eventType: 'view_page',
    path,
    payload: { userType: 'guest' },
});

describe('Analytics Mediator', () => {
    let mockAdapter: EventAdapter;
    let getAdapters: () => EventAdapter[];

    beforeEach(() => {
        mockAdapter = {
            name: 'test-adapter',
            sendEvent: vi.fn().mockResolvedValue({ success: true }),
        };

        getAdapters = vi.fn(() => []);
    });

    afterEach(() => {
        vi.clearAllMocks();
        // Reset the singleton between tests to ensure test isolation
        resetEventMediator();
    });

    describe('mediator initialization', () => {
        it('should return a mediator with track method', () => {
            const mediator = getEventMediator(getAdapters);

            expect(mediator).toBeDefined();
            expect(mediator?.track).toBeInstanceOf(Function);
        });

        it('should return the same singleton instance on multiple calls', () => {
            const mediator1 = getEventMediator(getAdapters);
            const mediator2 = getEventMediator(getAdapters);
            const mediator3 = getEventMediator(vi.fn(() => []));

            // All calls should return the same singleton instance
            expect(mediator1).toBe(mediator2);
            expect(mediator2).toBe(mediator3);
            expect(mediator1).toBe(mediator3);
        });

        it('should use the getAdapters function from first initialization', async () => {
            const adapters1: EventAdapter[] = [];
            const getAdapters1 = vi.fn(() => adapters1);
            const mediator = getEventMediator(getAdapters1);

            const event = createMockViewPageEvent('/test');
            mediator?.track(event);
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(getAdapters1).toHaveBeenCalled();

            // Reset and create with a different getAdapters function
            resetEventMediator();
            const adapters2: EventAdapter[] = [mockAdapter];
            const getAdapters2 = vi.fn(() => adapters2);
            const mediator2 = getEventMediator(getAdapters2);

            // Clear previous call
            vi.clearAllMocks();

            // Track with the new mediator - should use the new getAdapters function
            mediator2?.track(event);
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(getAdapters2).toHaveBeenCalled();
            expect(mockAdapter.sendEvent).toHaveBeenCalledWith(event, undefined, undefined);
        });
    });

    describe('event processing', () => {
        it('should process events with registered adapters', async () => {
            getAdapters = vi.fn(() => [mockAdapter]);
            const mediator = getEventMediator(getAdapters);

            const event = createMockViewPageEvent('/test');
            mediator?.track(event);

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockAdapter.sendEvent).toHaveBeenCalledWith(event, undefined, undefined);
            expect(mockAdapter.sendEvent).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple adapters in parallel', async () => {
            const adapter1 = { ...mockAdapter, name: 'adapter-1' };
            const adapter2 = { ...mockAdapter, name: 'adapter-2' };

            getAdapters = vi.fn(() => [adapter1, adapter2]);

            const mediator = getEventMediator(getAdapters);
            const event = createMockViewPageEvent('/test');

            mediator?.track(event);

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(adapter1.sendEvent).toHaveBeenCalledWith(event, undefined, undefined);
            expect(adapter2.sendEvent).toHaveBeenCalledWith(event, undefined, undefined);
        });

        it('should handle adapters without sendEvent method', async () => {
            const adapterWithoutSendEvent: EventAdapter = {
                name: 'no-send-event-adapter',
            };

            getAdapters = vi.fn(() => [adapterWithoutSendEvent]);
            const mediator = getEventMediator(getAdapters);

            const event = createMockViewPageEvent('/test');

            // Should not throw even when adapter doesn't implement sendEvent
            expect(() => mediator?.track(event)).not.toThrow();

            await new Promise((resolve) => setTimeout(resolve, 10));

            // Verify the adapter doesn't have sendEvent called (since it doesn't exist)
            expect(adapterWithoutSendEvent.sendEvent).toBeUndefined();
        });

        it('should handle adapter failures gracefully', async () => {
            const failingAdapter = {
                ...mockAdapter,
                name: 'failing-adapter',
                sendEvent: vi.fn().mockRejectedValue(new Error('Adapter failed')),
            };

            getAdapters = vi.fn(() => [failingAdapter]);
            const mediator = getEventMediator(getAdapters);

            const event = createMockViewPageEvent('/test');

            expect(() => mediator?.track(event)).not.toThrow();

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(failingAdapter.sendEvent).toHaveBeenCalledWith(event, undefined, undefined);
        });

        it('should handle events when no adapters are registered', async () => {
            getAdapters = vi.fn(() => []);
            const mediator = getEventMediator(getAdapters);
            const event = createMockViewPageEvent('/test');

            expect(() => mediator?.track(event)).not.toThrow();

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockAdapter.sendEvent).not.toHaveBeenCalled();
        });

        it('should react to adapter registry changes', async () => {
            // Use a mutable array that the function reads from
            const adapters: EventAdapter[] = [];
            getAdapters = vi.fn(() => adapters);
            const mediator = getEventMediator(getAdapters);
            const event = createMockViewPageEvent('/test');

            // First track - no adapters
            mediator?.track(event);
            await new Promise((resolve) => setTimeout(resolve, 10));
            expect(mockAdapter.sendEvent).not.toHaveBeenCalled();

            // Add adapter to registry
            adapters.push(mockAdapter);

            // Second track - should use new adapter
            mediator?.track(event);
            await new Promise((resolve) => setTimeout(resolve, 10));
            expect(mockAdapter.sendEvent).toHaveBeenCalledWith(event, undefined, undefined);
            expect(mockAdapter.sendEvent).toHaveBeenCalledTimes(1);
        });
    });

    describe('siteInfo forwarding', () => {
        it('should forward siteInfo to adapter sendEvent', async () => {
            getAdapters = vi.fn(() => [mockAdapter]);
            const mediator = getEventMediator(getAdapters);
            const event = createMockViewPageEvent('/test');
            const siteInfo: EventSiteInfo = { siteId: 'RefArchGlobal', localeId: 'en-GB' };

            mediator?.track(event, siteInfo);

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockAdapter.sendEvent).toHaveBeenCalledWith(event, siteInfo, undefined);
        });

        it('should forward undefined siteInfo without breaking adapters', async () => {
            getAdapters = vi.fn(() => [mockAdapter]);
            const mediator = getEventMediator(getAdapters);
            const event = createMockViewPageEvent('/test');

            mediator?.track(event);

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockAdapter.sendEvent).toHaveBeenCalledWith(event, undefined, undefined);
        });
    });

    describe('consentPreferences forwarding', () => {
        it('should forward consentPreferences to adapter sendEvent', async () => {
            getAdapters = vi.fn(() => [mockAdapter]);
            const mediator = getEventMediator(getAdapters);
            const event = createMockViewPageEvent('/test');
            const siteInfo: EventSiteInfo = { siteId: 'RefArchGlobal', localeId: 'en-GB' };
            const consentPreferences: ConsentPreferences = ['necessary', 'analytics'];

            mediator?.track(event, siteInfo, consentPreferences);

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockAdapter.sendEvent).toHaveBeenCalledWith(event, siteInfo, consentPreferences);
        });
    });
});
