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
import { renderHook, act } from '@testing-library/react';
import { useProductReviews } from './product-reviews-context';

describe('ProductReviewsContext', () => {
    describe('useProductReviews outside provider', () => {
        it('returns default no-op values when used outside ProductReviewsProvider', () => {
            const { result } = renderHook(() => useProductReviews());
            expect(result.current.reviewsSummary).toBeNull();
            expect(result.current.reviewsSummaryLoading).toBe(false);
            expect(result.current.reviews).toEqual([]);
            expect(result.current.reviewsLoading).toBe(false);
            expect(result.current.aiSummary).toBe('');
        });

        it('no-op callbacks do not throw when called outside provider', () => {
            const { result } = renderHook(() => useProductReviews());
            expect(() => {
                act(() => {
                    result.current.loadReviewsIfNeeded();
                    result.current.addReviewOptimistic({
                        id: '1',
                        authorName: 'A',
                        verifiedPurchase: false,
                        date: '',
                        rating: 5,
                        headline: 'H',
                        body: 'B',
                        helpfulCount: 0,
                    });
                    result.current.expandReviews();
                    result.current.registerExpand(null);
                    result.current.registerOnExpanded(null);
                    result.current.triggerOnExpanded();
                });
            }).not.toThrow();
        });
    });
});
