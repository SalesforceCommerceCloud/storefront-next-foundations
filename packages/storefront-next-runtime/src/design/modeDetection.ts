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
 * Utility functions for detecting active design/preview modes
 */

export type PageDesignerMode = 'EDIT' | 'PREVIEW';

/**
 * Get the mode parameter from URL search params
 * @param url - Optional URL string or Request object for server-side usage. If not provided, uses window.location on client-side
 * @returns The mode parameter value or null if not found
 */
export const getUrlMode = (url?: string | URL | Request): PageDesignerMode | null => {
    let searchParams: URLSearchParams;

    if (url) {
        // Server-side: extract search params from provided URL or Request
        if (url instanceof Request) {
            searchParams = new URL(url.url).searchParams;
        } else {
            searchParams = new URL(url).searchParams;
        }
    } else {
        // Client-side: use window.location
        if (typeof window === 'undefined') {
            return null;
        }
        searchParams = new URLSearchParams(window.location.search);
    }

    return searchParams.get('mode') as PageDesignerMode | null;
};

/**
 * Check if design mode is active
 * @param url - Optional URL string or Request object for server-side usage
 * @returns True if mode=EDIT is present in URL
 */
export const isDesignModeActive = (url?: string | URL | Request): boolean => getUrlMode(url) === 'EDIT';

/**
 * Check if preview mode is active
 * @param url - Optional URL string or Request object for server-side usage
 * @returns True if mode=PREVIEW is present in URL
 */
export const isPreviewModeActive = (url?: string | URL | Request): boolean => getUrlMode(url) === 'PREVIEW';
