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
import { fetchComponent } from './component.server';
import { createApiClients } from '@/lib/api-clients.server';
import { createTestContext } from '@/lib/test-utils';

const mockGetComponent = vi.fn();

vi.mock('@/lib/api-clients.server', () => ({
    createApiClients: vi.fn(() => ({
        shopperExperience: {
            getComponent: mockGetComponent,
        },
    })),
}));

describe('fetchComponent', () => {
    const mockContext = createTestContext();
    const mockCreateApiClients = vi.mocked(createApiClients);

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetComponent.mockReset();
    });

    it('calls getComponent with componentId', async () => {
        const mockResult = { id: 'mini-cart', typeId: 'embedded.commerce.miniCart', regions: [] };
        mockGetComponent.mockResolvedValue({ data: mockResult });

        const result = await fetchComponent(mockContext, { componentId: 'mini-cart' });

        expect(mockCreateApiClients).toHaveBeenCalledWith(mockContext);
        expect(mockGetComponent).toHaveBeenCalledWith({
            params: {
                path: { componentId: 'mini-cart' },
                query: {},
            },
        });
        expect(result).toEqual(mockResult);
    });

    it('passes mode when provided', async () => {
        mockGetComponent.mockResolvedValue({ data: { id: 'x', typeId: 'test', regions: [] } });

        await fetchComponent(mockContext, { componentId: 'x', mode: 'EDIT' });

        expect(mockGetComponent).toHaveBeenCalledWith({
            params: {
                path: { componentId: 'x' },
                query: { mode: 'EDIT' },
            },
        });
    });

    it('passes pdToken when provided', async () => {
        mockGetComponent.mockResolvedValue({ data: { id: 'x', typeId: 'test', regions: [] } });

        await fetchComponent(mockContext, { componentId: 'x', pdToken: 'abc123' });

        expect(mockGetComponent).toHaveBeenCalledWith({
            params: {
                path: { componentId: 'x' },
                query: { pdToken: 'abc123' },
            },
        });
    });

    it('passes both mode and pdToken when provided', async () => {
        mockGetComponent.mockResolvedValue({ data: { id: 'x', typeId: 'test', regions: [] } });

        await fetchComponent(mockContext, { componentId: 'x', mode: 'EDIT', pdToken: 'token-456' });

        expect(mockGetComponent).toHaveBeenCalledWith({
            params: {
                path: { componentId: 'x' },
                query: { mode: 'EDIT', pdToken: 'token-456' },
            },
        });
    });

    describe('error handling', () => {
        it('propagates API errors', async () => {
            mockGetComponent.mockRejectedValue(new Error('Component not found'));

            await expect(fetchComponent(mockContext, { componentId: 'non-existent' })).rejects.toThrow(
                'Component not found'
            );
        });

        it('propagates network errors', async () => {
            mockGetComponent.mockRejectedValue(new Error('Network timeout'));

            await expect(fetchComponent(mockContext, { componentId: 'x' })).rejects.toThrow('Network timeout');
        });
    });

    describe('context usage', () => {
        it('creates a new client instance for each call', async () => {
            mockGetComponent.mockResolvedValue({ data: { id: 'x', typeId: 'test', regions: [] } });

            await fetchComponent(mockContext, { componentId: 'comp-1' });
            await fetchComponent(mockContext, { componentId: 'comp-2' });

            expect(mockCreateApiClients).toHaveBeenCalledTimes(2);
        });
    });
});
