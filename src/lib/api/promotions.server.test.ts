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
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ApiError } from '@/scapi';
import { NormalizedApiError } from './normalized-api-error';
import { fetchPromotionsByIds } from './promotions.server';

const mockGetPromotions = vi.fn();
const mockLoggerError = vi.fn();

vi.mock('@/lib/api-clients.server', () => ({
    createApiClients: vi.fn(() => ({
        shopperPromotions: {
            getPromotions: mockGetPromotions,
        },
    })),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({
        error: mockLoggerError,
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    })),
}));

describe('fetchPromotionsByIds', () => {
    const mockContext = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockLoggerError.mockClear();
    });

    test('returns empty array for empty input without calling the API', async () => {
        const result = await fetchPromotionsByIds(mockContext, []);
        expect(result).toEqual([]);
        expect(mockGetPromotions).not.toHaveBeenCalled();
    });

    test('returns promotion array from response', async () => {
        const mockPromotions = [
            { id: 'promo-1', name: 'Promo One' },
            { id: 'promo-2', name: 'Promo Two' },
        ];
        mockGetPromotions.mockResolvedValue({ data: { data: mockPromotions } });

        const result = await fetchPromotionsByIds(mockContext, ['promo-1', 'promo-2']);

        expect(result).toEqual(mockPromotions);
        expect(mockGetPromotions).toHaveBeenCalledWith({
            params: {
                query: {
                    ids: ['promo-1', 'promo-2'],
                },
            },
        });
    });

    test('returns empty array when API returns no data', async () => {
        mockGetPromotions.mockResolvedValue({});

        const result = await fetchPromotionsByIds(mockContext, ['promo-1']);

        expect(result).toEqual([]);
    });

    test('throws NormalizedApiError when API call fails with ApiError', async () => {
        const apiError = new ApiError({
            status: 500,
            statusText: 'Server Error',
            headers: new Headers(),
            body: { type: 'Server Error', title: 'Server Error', detail: 'Promotions service down' },
            rawBody: JSON.stringify({ detail: 'Promotions service down' }),
            url: 'https://api.example.com/promotions',
            method: 'GET',
        });
        mockGetPromotions.mockRejectedValue(apiError);

        await expect(fetchPromotionsByIds(mockContext, ['promo-1'])).rejects.toThrow(NormalizedApiError);
        await expect(fetchPromotionsByIds(mockContext, ['promo-1'])).rejects.toMatchObject({ status: 500 });
    });

    test('throws NormalizedApiError when API call fails with non-API error', async () => {
        mockGetPromotions.mockRejectedValue(new TypeError('Network failure'));

        await expect(fetchPromotionsByIds(mockContext, ['promo-1'])).rejects.toThrow(NormalizedApiError);
        await expect(fetchPromotionsByIds(mockContext, ['promo-1'])).rejects.toThrow('Network failure');
    });

    test('logs operation context when API call fails', async () => {
        mockGetPromotions.mockRejectedValue(new Error('boom'));

        await fetchPromotionsByIds(mockContext, ['promo-a', 'promo-b']).catch(() => {});

        expect(mockLoggerError).toHaveBeenCalledWith(
            'shopperPromotions.getPromotions failed',
            expect.objectContaining({ ids: ['promo-a', 'promo-b'] })
        );
    });
});
