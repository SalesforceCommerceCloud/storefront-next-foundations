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

/** Default max page buttons before showing ellipsis (e.g. 1 … 4 [5] 6 … 20) */
const DEFAULT_MAX_VISIBLE = 5;

export type PaginationItem = number | { type: 'ellipsis'; key: 'left' | 'right' };

/**
 * Pagination state derived from offset/limit/total (e.g. from SCAPI list endpoints).
 * Use for "Viewing X–Y of Z" text and prev/next offset links.
 */
export type OffsetLimitPaginationState = {
    /** Effective page size (limit or default) */
    safeLimit: number;
    /** 1-based start index for display (e.g. "Viewing 1–10 of 25") */
    startIndex: number;
    /** 1-based end index for display */
    endIndex: number;
    /** 1-based current page number */
    currentPage: number;
    /** Total number of pages */
    totalPages: number;
    /** Whether there is a next page */
    hasNext: boolean;
    /** Whether there is a previous page */
    hasPrevious: boolean;
    /** Offset for next page (use in URL) */
    nextOffset: number;
    /** Offset for previous page (use in URL) */
    prevOffset: number;
};

/**
 * Derives pagination state from offset/limit/total for list APIs that use offset-based paging.
 * Use for "Viewing X–Y of Z" and prev/next navigation.
 *
 * @param params.offset - Current offset (0-based)
 * @param params.limit - Page size
 * @param params.total - Total number of items
 * @param params.defaultLimit - Fallback when limit is 0 (default 10)
 * @param params.currentPageSize - Optional actual number of items on this page (e.g. orders.length); when set, endIndex uses it for accurate "Viewing 1–3 of 25" on partial pages
 */
export function getOffsetLimitPaginationState(params: {
    offset: number;
    limit: number;
    total: number;
    defaultLimit?: number;
    currentPageSize?: number;
}): OffsetLimitPaginationState {
    const { offset, limit, total, defaultLimit = 10, currentPageSize } = params;
    const safeLimit = limit > 0 ? limit : defaultLimit;
    const startIndex = offset + 1;
    const endIndex = Math.min(offset + (currentPageSize !== undefined ? currentPageSize : safeLimit), total);
    const currentPage = safeLimit > 0 ? Math.floor(offset / safeLimit) + 1 : 1;
    const totalPagesRaw = safeLimit > 0 ? Math.ceil(total / safeLimit) : 1;
    const totalPages = Math.max(1, totalPagesRaw);
    return {
        safeLimit,
        startIndex,
        endIndex,
        currentPage,
        totalPages,
        hasNext: currentPage < totalPagesRaw,
        hasPrevious: currentPage > 1,
        nextOffset: offset + safeLimit,
        prevOffset: Math.max(0, offset - safeLimit),
    };
}

/**
 * Returns an array of page numbers and ellipsis for truncated pagination.
 * When totalPages <= maxVisible, returns [1, 2, ..., totalPages].
 * Otherwise returns a compact set like [1, { ellipsis: 'left' }, 5, 6, 7, 8, 9, { ellipsis: 'right' }, 20].
 *
 * @param totalPages - Total number of pages
 * @param currentPage - 1-based current page
 * @param maxVisible - Max page numbers to show before using ellipsis (default 7)
 */
export function getPaginationItems(
    totalPages: number,
    currentPage: number,
    maxVisible: number = DEFAULT_MAX_VISIBLE
): PaginationItem[] {
    if (totalPages <= maxVisible) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const current = Math.max(1, Math.min(totalPages, currentPage));
    const pages = new Set<number>([1, totalPages, current, current - 1, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    const result: PaginationItem[] = [];
    let ellipsisCount = 0;
    for (let i = 0; i < sorted.length; i++) {
        const curr = sorted[i];
        const prev = i > 0 ? sorted[i - 1] : undefined;
        if (curr !== undefined && prev !== undefined && curr - prev > 1) {
            result.push({ type: 'ellipsis', key: ellipsisCount === 0 ? 'left' : 'right' });
            ellipsisCount++;
        }
        if (curr !== undefined) {
            result.push(curr);
        }
    }
    return result;
}
