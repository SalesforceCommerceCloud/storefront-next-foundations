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
import { createContext, use, useSyncExternalStore } from 'react';
import type { ShopperProducts } from '@/scapi';

/**
 * A lightweight store for enriched subcategory data. The store instance is referentially stable so the context value
 * never changes, which means the context provider never triggers re-renders of its consumer tree. Instead, only
 * components that subscribe via {@link useSubCategory} re-render when the store is updated.
 */
export type SubCategoryStore = ReturnType<typeof createSubCategoryStore>;

export function createSubCategoryStore() {
    let data = new Map<string, ShopperProducts.schemas['Category']>();
    const listeners = new Set<() => void>();

    return {
        update(this: void, entries: Map<string, ShopperProducts.schemas['Category']>): void {
            data = entries;
            listeners.forEach((l) => l());
        },
        subscribe(this: void, listener: () => void): () => void {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        getSnapshot(this: void): Map<string, ShopperProducts.schemas['Category']> {
            return data;
        },
    };
}

export const SubCategoryContext = createContext<SubCategoryStore>(createSubCategoryStore());

/**
 * Hook that subscribes to the {@link SubCategoryStore} via context and returns the enriched category for the given ID,
 * or `undefined` if not yet available. Re-renders only when the entry for the given `id` changes identity,
 * not on every store update or context value change.
 */
export function useSubCategory(id: string): ShopperProducts.schemas['Category'] | undefined {
    const store = use(SubCategoryContext);
    return useSyncExternalStore(
        store.subscribe,
        () => store.getSnapshot().get(id),
        () => store.getSnapshot().get(id)
    );
}
