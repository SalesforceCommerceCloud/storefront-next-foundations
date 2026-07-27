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
 * Global window object extensions for SFCC Storefront Next
 */
declare global {
    interface Window {
        /**
         * The unique identifier for the current bundle.
         * Injected from BUNDLE_ID environment variable, defaults to 'local'.
         * This property is injected by @salesforce/storefront-next-dev package.
         *
         * Note: In development mode, this is undefined since bundle config injection
         * is skipped to avoid React Router duplicate instance issues. Code should
         * fall back to 'local' when this is undefined.
         *
         * @example 'local' | '140' | undefined (in dev mode)
         */
        _BUNDLE_ID?: string;

        /**
         * The path to the client bundle assets.
         * Constructed as `/mobify/bundle/${bundleId}/client/`
         * This property is injected by @salesforce/storefront-next-dev package.
         *
         * Note: In development mode, this is undefined since bundle config injection
         * is skipped to avoid React Router duplicate instance issues. Code should
         * fall back to '/' when this is undefined.
         *
         * @example '/mobify/bundle/local/client/' | '/mobify/bundle/140/client/' | undefined (in dev mode)
         */
        _BUNDLE_PATH?: string;

        /**
         * The base path prefix for the current deployment.
         * This property is injected by @salesforce/storefront-next-dev package.
         *
         * Note: In local development, this is typically an empty string.
         *
         * @example '' | '/my-base-path'
         */
        _BASE_PATH?: string;
    }
}

export {};
