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

import { describe, it, expect } from 'vitest';
import { getPaginationItems, getOffsetLimitPaginationState } from './pagination-utils';

describe('getOffsetLimitPaginationState', () => {
    it('returns correct state for first page', () => {
        const state = getOffsetLimitPaginationState({ offset: 0, limit: 10, total: 25 });
        expect(state.safeLimit).toBe(10);
        expect(state.startIndex).toBe(1);
        expect(state.endIndex).toBe(10);
        expect(state.currentPage).toBe(1);
        expect(state.totalPages).toBe(3);
        expect(state.hasNext).toBe(true);
        expect(state.hasPrevious).toBe(false);
        expect(state.nextOffset).toBe(10);
        expect(state.prevOffset).toBe(0);
    });

    it('returns correct state for middle page', () => {
        const state = getOffsetLimitPaginationState({ offset: 10, limit: 10, total: 25 });
        expect(state.startIndex).toBe(11);
        expect(state.endIndex).toBe(20);
        expect(state.currentPage).toBe(2);
        expect(state.hasNext).toBe(true);
        expect(state.hasPrevious).toBe(true);
        expect(state.nextOffset).toBe(20);
        expect(state.prevOffset).toBe(0);
    });

    it('returns correct state for last page (partial)', () => {
        const state = getOffsetLimitPaginationState({ offset: 20, limit: 10, total: 25 });
        expect(state.startIndex).toBe(21);
        expect(state.endIndex).toBe(25);
        expect(state.currentPage).toBe(3);
        expect(state.totalPages).toBe(3);
        expect(state.hasNext).toBe(false);
        expect(state.hasPrevious).toBe(true);
        expect(state.nextOffset).toBe(30);
        expect(state.prevOffset).toBe(10);
    });

    it('uses defaultLimit when limit is 0', () => {
        const state = getOffsetLimitPaginationState({ offset: 0, limit: 0, total: 15, defaultLimit: 10 });
        expect(state.safeLimit).toBe(10);
        expect(state.totalPages).toBe(2);
    });

    it('handles single page', () => {
        const state = getOffsetLimitPaginationState({ offset: 0, limit: 10, total: 5 });
        expect(state.totalPages).toBe(1);
        expect(state.hasNext).toBe(false);
        expect(state.hasPrevious).toBe(false);
        expect(state.endIndex).toBe(5);
    });

    it('uses currentPageSize for endIndex when provided (partial page)', () => {
        const state = getOffsetLimitPaginationState({
            offset: 0,
            limit: 10,
            total: 25,
            currentPageSize: 3,
        });
        expect(state.startIndex).toBe(1);
        expect(state.endIndex).toBe(3);
    });
});

describe('getPaginationItems', () => {
    it('returns all pages when totalPages <= maxVisible', () => {
        expect(getPaginationItems(5, 1)).toEqual([1, 2, 3, 4, 5]);
        expect(getPaginationItems(7, 4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('returns truncated list with ellipsis when many pages', () => {
        const items = getPaginationItems(20, 7, 7);
        expect(items).toContain(1);
        expect(items).toContain(20);
        expect(items).toContain(6);
        expect(items).toContain(7);
        expect(items).toContain(8);
        expect(items.filter((i) => typeof i === 'object' && i.type === 'ellipsis')).toHaveLength(2);
    });

    it('clamps currentPage to valid range', () => {
        expect(getPaginationItems(10, 0, 7)[0]).toBe(1);
        expect(getPaginationItems(10, 99, 7).slice(-1)[0]).toBe(10);
    });
});
