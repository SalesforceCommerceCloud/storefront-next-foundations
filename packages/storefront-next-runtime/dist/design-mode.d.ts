//#region src/design/modeDetection.d.ts
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
type PageDesignerMode = 'EDIT' | 'PREVIEW';
/**
 * Get the mode parameter from URL search params
 * @param url - Optional URL string or Request object for server-side usage. If not provided, uses window.location on client-side
 * @returns The mode parameter value or null if not found
 */
declare const getUrlMode: (url?: string | URL | Request) => PageDesignerMode | null;
/**
 * Check if design mode is active
 * @param url - Optional URL string or Request object for server-side usage
 * @returns True if mode=EDIT is present in URL
 */
declare const isDesignModeActive: (url?: string | URL | Request) => boolean;
/**
 * Check if preview mode is active
 * @param url - Optional URL string or Request object for server-side usage
 * @returns True if mode=PREVIEW is present in URL
 */
declare const isPreviewModeActive: (url?: string | URL | Request) => boolean;
//#endregion
export { PageDesignerMode, getUrlMode, isDesignModeActive, isPreviewModeActive };
//# sourceMappingURL=design-mode.d.ts.map