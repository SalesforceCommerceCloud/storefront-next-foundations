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
import { act, renderHook } from '@testing-library/react';
import { type ReactNode, useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ShopperProducts } from '@/scapi';
import { SubCategoryContext, createSubCategoryStore, useSubCategory } from './context';
import { createMockCategory } from './__tests__/data';

type Category = ShopperProducts.schemas['Category'];

describe('createSubCategoryStore', () => {
    it('should return undefined for unknown keys', () => {
        const store = createSubCategoryStore();
        expect(store.getSnapshot().get('unknown')).toBeUndefined();
    });

    it('should store and retrieve entries after update', () => {
        const store = createSubCategoryStore();
        const category = createMockCategory({ id: 'cat-1', name: 'Category 1' });

        store.update(new Map([['cat-1', category]]));

        expect(store.getSnapshot().get('cat-1')).toBe(category);
    });

    it('should replace all entries on update', () => {
        const store = createSubCategoryStore();
        const cat1 = createMockCategory({ id: 'cat-1', name: 'Category 1' });
        const cat2 = createMockCategory({ id: 'cat-2', name: 'Category 2' });

        store.update(new Map([['cat-1', cat1]]));
        store.update(new Map([['cat-2', cat2]]));

        expect(store.getSnapshot().get('cat-1')).toBeUndefined();
        expect(store.getSnapshot().get('cat-2')).toBe(cat2);
    });

    it('should notify listeners on update', () => {
        const store = createSubCategoryStore();
        const listener = vi.fn();

        store.subscribe(listener);
        store.update(new Map());

        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should not notify unsubscribed listeners', () => {
        const store = createSubCategoryStore();
        const listener = vi.fn();

        const unsubscribe = store.subscribe(listener);
        unsubscribe();
        store.update(new Map());

        expect(listener).not.toHaveBeenCalled();
    });

    it('should return a stable snapshot reference until updated', () => {
        const store = createSubCategoryStore();
        const snap1 = store.getSnapshot();
        const snap2 = store.getSnapshot();

        expect(snap1).toBe(snap2);

        store.update(new Map());
        const snap3 = store.getSnapshot();

        expect(snap3).not.toBe(snap1);
    });

    it('should notify multiple listeners on update', () => {
        const store = createSubCategoryStore();
        const listener1 = vi.fn();
        const listener2 = vi.fn();

        store.subscribe(listener1);
        store.subscribe(listener2);
        store.update(new Map());

        expect(listener1).toHaveBeenCalledTimes(1);
        expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should store and retrieve multiple entries from a single update', () => {
        const store = createSubCategoryStore();
        const cat1 = createMockCategory({ id: 'cat-1', name: 'Category 1' });
        const cat2 = createMockCategory({ id: 'cat-2', name: 'Category 2' });

        store.update(
            new Map([
                ['cat-1', cat1],
                ['cat-2', cat2],
            ])
        );

        expect(store.getSnapshot().get('cat-1')).toBe(cat1);
        expect(store.getSnapshot().get('cat-2')).toBe(cat2);
    });
});

describe('useSubCategory', () => {
    function createWrapper(store: ReturnType<typeof createSubCategoryStore>) {
        return function Wrapper({ children }: { children: ReactNode }) {
            return <SubCategoryContext value={store}>{children}</SubCategoryContext>;
        };
    }

    it('should return undefined when the store is empty', () => {
        const store = createSubCategoryStore();
        const { result } = renderHook(() => useSubCategory('cat-1'), { wrapper: createWrapper(store) });

        expect(result.current).toBeUndefined();
    });

    it('should return the category after the store is updated', () => {
        const store = createSubCategoryStore();
        const category = createMockCategory({ id: 'cat-1', name: 'Category 1' });

        const { result } = renderHook(() => useSubCategory('cat-1'), { wrapper: createWrapper(store) });
        expect(result.current).toBeUndefined();

        act(() => {
            store.update(new Map<string, Category>([['cat-1', category]]));
        });

        expect(result.current).toBe(category);
    });

    it('should return undefined for a non-matching ID after update', () => {
        const store = createSubCategoryStore();
        const category = createMockCategory({ id: 'cat-1', name: 'Category 1' });

        const { result } = renderHook(() => useSubCategory('cat-2'), { wrapper: createWrapper(store) });

        act(() => {
            store.update(new Map<string, Category>([['cat-1', category]]));
        });

        expect(result.current).toBeUndefined();
    });

    it('should update when the store replaces entries', () => {
        const store = createSubCategoryStore();
        const cat1 = createMockCategory({ id: 'cat-1', name: 'Category 1' });
        const cat1Updated = createMockCategory({ id: 'cat-1', name: 'Category 1 Updated' });

        const { result } = renderHook(() => useSubCategory('cat-1'), { wrapper: createWrapper(store) });

        act(() => {
            store.update(new Map<string, Category>([['cat-1', cat1]]));
        });
        expect(result.current).toBe(cat1);

        act(() => {
            store.update(new Map<string, Category>([['cat-1', cat1Updated]]));
        });
        expect(result.current).toBe(cat1Updated);
    });

    it('should return undefined when a previously present entry is removed', () => {
        const store = createSubCategoryStore();
        const cat1 = createMockCategory({ id: 'cat-1', name: 'Category 1' });
        const cat2 = createMockCategory({ id: 'cat-2', name: 'Category 2' });

        const { result } = renderHook(() => useSubCategory('cat-1'), { wrapper: createWrapper(store) });

        act(() => {
            store.update(new Map<string, Category>([['cat-1', cat1]]));
        });
        expect(result.current).toBe(cat1);

        act(() => {
            store.update(new Map<string, Category>([['cat-2', cat2]]));
        });
        expect(result.current).toBeUndefined();
    });

    it('should work with the default context when no provider is mounted', () => {
        const { result } = renderHook(() => useSubCategory('cat-1'));

        expect(result.current).toBeUndefined();
    });

    it('should not re-render when an unrelated entry changes', () => {
        const store = createSubCategoryStore();
        const cat1 = createMockCategory({ id: 'cat-1', name: 'Category 1' });
        const cat2 = createMockCategory({ id: 'cat-2', name: 'Category 2' });

        function useSubCategoryWithRenderCount(id: string) {
            const renderCount = useRef(0);
            renderCount.current++;
            const category = useSubCategory(id);
            return { category, renderCount };
        }

        const { result } = renderHook(() => useSubCategoryWithRenderCount('cat-1'), {
            wrapper: createWrapper(store),
        });

        act(() => {
            store.update(new Map<string, Category>([['cat-1', cat1]]));
        });
        const rendersAfterOwnUpdate = result.current.renderCount.current;

        act(() => {
            store.update(
                new Map<string, Category>([
                    ['cat-1', cat1],
                    ['cat-2', cat2],
                ])
            );
        });

        expect(result.current.renderCount.current).toBe(rendersAfterOwnUpdate);
        expect(result.current.category).toBe(cat1);
    });
});
