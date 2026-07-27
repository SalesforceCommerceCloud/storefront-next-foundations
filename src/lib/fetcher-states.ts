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
 * React Router fetcher state constants.
 *
 * These constants represent the possible states of a React Router fetcher.
 * They are based on the string literals used by React Router internally.
 *
 * @see https://reactrouter.com/en/main/hooks/use-fetcher
 */
export const FETCHER_STATES = {
    /** No fetcher operation is in progress */
    IDLE: 'idle',
    /** A fetcher submission is in progress */
    SUBMITTING: 'submitting',
    /** A fetcher is loading data from a loader */
    LOADING: 'loading',
} as const;

/**
 * Type for React Router fetcher states.
 *
 * This type represents all possible states a fetcher can be in.
 */
export type FetcherState = (typeof FETCHER_STATES)[keyof typeof FETCHER_STATES];
