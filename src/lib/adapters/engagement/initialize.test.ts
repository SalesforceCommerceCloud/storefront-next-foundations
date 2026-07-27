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

/**
 * Initialize Adapters Tests
 *
 * Tests the ensureAdaptersInitialized function including:
 * - Early exit when adapters are already initialized
 * - Successful initialization
 * - Error handling
 * - Idempotency (multiple calls)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ensureAdaptersInitialized, resetAdaptersInitialization } from './initialize';
import type { AppConfig } from '@/types/config';

// Mock dependencies
const mockGetAllAdapters = vi.fn();
const mockInitializeEngagementAdapters = vi.fn();

vi.mock('./store', () => ({
    getAllAdapters: () => mockGetAllAdapters(),
}));

vi.mock('@/lib/adapters/engagement/register', () => ({
    initializeEngagementAdapters: mockInitializeEngagementAdapters,
}));

const mockAppConfig = {
    engagement: {
        adapters: {
            einstein: {
                enabled: true,
                siteId: 'test-site',
                realm: 'test-realm',
                host: 'https://test.example.com',
            },
        },
    },
} as unknown as AppConfig;

describe('ensureAdaptersInitialized', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset module state - clear the cached initialization promise
        resetAdaptersInitialization();
        // Ensure getAllAdapters returns empty array initially
        mockGetAllAdapters.mockReturnValue([]);
        mockInitializeEngagementAdapters.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('early exit', () => {
        it('should return immediately when adapters are already initialized', async () => {
            // Mock that adapters are already initialized
            const mockAdapter = { name: 'test-adapter', sendEvent: vi.fn() };
            mockGetAllAdapters.mockReturnValue([mockAdapter]);

            await ensureAdaptersInitialized(mockAppConfig);

            // Should not import or call initializeEngagementAdapters
            expect(mockInitializeEngagementAdapters).not.toHaveBeenCalled();
        });
    });

    describe('successful initialization', () => {
        it('should initialize adapters when none are present', async () => {
            mockGetAllAdapters.mockReturnValue([]);
            mockInitializeEngagementAdapters.mockResolvedValue(undefined);

            await ensureAdaptersInitialized(mockAppConfig);

            expect(mockInitializeEngagementAdapters).toHaveBeenCalledWith(mockAppConfig);
        });

        it('should not call initializeEngagementAdapters when appConfig is undefined', async () => {
            mockGetAllAdapters.mockReturnValue([]);
            mockInitializeEngagementAdapters.mockResolvedValue(undefined);

            await ensureAdaptersInitialized(undefined as any);

            // The function checks if appConfig exists before calling initializeEngagementAdapters
            expect(mockInitializeEngagementAdapters).not.toHaveBeenCalled();
        });
    });

    describe('concurrent initialization', () => {
        it('should be idempotent - multiple concurrent calls should only initialize once', async () => {
            mockGetAllAdapters.mockReturnValue([]);
            mockInitializeEngagementAdapters.mockResolvedValue(undefined);

            // Call multiple times concurrently
            await Promise.all([
                ensureAdaptersInitialized(mockAppConfig),
                ensureAdaptersInitialized(mockAppConfig),
                ensureAdaptersInitialized(mockAppConfig),
            ]);

            // Should only initialize once (the promise is shared)
            expect(mockInitializeEngagementAdapters).toHaveBeenCalledTimes(1);
        });
    });

    describe('error handling', () => {
        it('should handle errors gracefully and not throw', async () => {
            mockGetAllAdapters.mockReturnValue([]);
            mockInitializeEngagementAdapters.mockRejectedValue(new Error('Initialization failed'));

            // initializeEngagementAdapters is called with void (fire-and-forget), so its rejection
            // is not awaited. ensureAdaptersInitialized still resolves and does not throw.
            await expect(ensureAdaptersInitialized(mockAppConfig)).resolves.toBeUndefined();
        });
    });

    describe('idempotency', () => {
        it('should exit early when adapters are already initialized', async () => {
            mockGetAllAdapters.mockReturnValue([]);
            mockInitializeEngagementAdapters.mockResolvedValue(undefined);

            // First initialization
            await ensureAdaptersInitialized(mockAppConfig);
            expect(mockInitializeEngagementAdapters).toHaveBeenCalledTimes(1);

            // Simulate adapters being initialized (early exit path)
            const mockAdapter = { name: 'test-adapter', sendEvent: vi.fn() };
            mockGetAllAdapters.mockReturnValue([mockAdapter]);

            // Should exit early without calling initializeEngagementAdapters again
            await ensureAdaptersInitialized(mockAppConfig);
            expect(mockInitializeEngagementAdapters).toHaveBeenCalledTimes(1);
        });
    });
});
