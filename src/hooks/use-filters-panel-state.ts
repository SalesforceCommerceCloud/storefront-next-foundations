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
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useNavigate } from '@/hooks/use-navigate';

export const FILTERS_QUERY_PARAM = 'filters';
export const FILTERS_OPEN = 'open';
export const FILTERS_CLOSED = 'closed';

export function getInitialFiltersOpen(searchParams: URLSearchParams): boolean {
    return searchParams.get(FILTERS_QUERY_PARAM) === FILTERS_OPEN;
}

export const ACTION_PARAMS = ['action', 'actionParams'] as const;

function stripParams(search: string, keys: readonly string[]): string {
    const params = new URLSearchParams(search);
    for (const key of keys) {
        params.delete(key);
    }
    const serialized = params.toString();
    return serialized ? `?${serialized}` : '';
}

export function getSearchWithoutFiltersParam(search: string): string {
    return stripParams(search, [FILTERS_QUERY_PARAM]);
}

/** Strips pending action params (action, actionParams) while preserving search state. */
export function getSearchWithoutActionParams(search: string): string {
    return stripParams(search, ACTION_PARAMS);
}

/** Strips all client-only params (filters, pending action) for shouldRevalidate comparison. */
export function getSearchWithoutClientOnlyParams(search: string): string {
    return stripParams(search, [FILTERS_QUERY_PARAM, ...ACTION_PARAMS]);
}

function buildSearchWithFiltersState(search: string, isOpen: boolean): string {
    const params = new URLSearchParams(search);
    params.set(FILTERS_QUERY_PARAM, isOpen ? FILTERS_OPEN : FILTERS_CLOSED);
    return `?${params.toString()}`;
}

export function useFiltersPanelState(initialFiltersOpen?: boolean) {
    const location = useLocation();
    const navigate = useNavigate();
    const [filtersOpen, setFiltersOpen] = useState(Boolean(initialFiltersOpen));

    // Keep local state synchronized when user navigates via back/forward and query param changes.
    useEffect(() => {
        const nextFiltersOpen = getInitialFiltersOpen(new URLSearchParams(location.search));
        setFiltersOpen(nextFiltersOpen);
    }, [location.search]);

    const toggleFiltersOpen = useCallback(() => {
        const nextFiltersOpen = !filtersOpen;
        setFiltersOpen(nextFiltersOpen);
        void navigate(
            {
                pathname: location.pathname,
                search: buildSearchWithFiltersState(location.search, nextFiltersOpen),
            },
            { replace: true }
        );
    }, [filtersOpen, location.pathname, location.search, navigate]);

    return [filtersOpen, toggleFiltersOpen] as const;
}
