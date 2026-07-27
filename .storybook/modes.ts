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
 * Chromatic viewport modes for visual testing.
 *
 * Use these modes via parameters.chromatic.modes to capture snapshots at
 * different viewport sizes without creating separate story exports.
 * Each mode creates an independent snapshot with its own baseline.
 *
 * @example
 * parameters: {
 *   chromatic: {
 *     modes: {
 *       mobile: allModes.mobile,
 *       desktop: allModes.desktop,
 *     },
 *   },
 * }
 */
export const allModes = {
    /** Mobile viewport (414px - matches Storybook mobile2) */
    mobile: {
        viewport: 414,
    },
    /** Tablet viewport (834px - matches Storybook tablet) */
    tablet: {
        viewport: 834,
    },
    /** Desktop viewport (1280px) */
    desktop: {
        viewport: 1280,
    },
} as const;
