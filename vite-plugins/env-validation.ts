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
import type { Plugin } from 'vite';

/**
 * Preflight plugin that fails the build early in development if the Commerce API
 * short code is missing (and there is no SCAPI_PROXY_HOST override).
 *
 * Runs in the `config` hook so the error surfaces before any other plugin work.
 *
 * Env vars:
 * - PUBLIC__app__commerce__api__shortCode: required in development (string)
 *   Example: PUBLIC__app__commerce__api__shortCode=kv7kzm78
 * - SCAPI_PROXY_HOST: optional override that bypasses the shortCode requirement (string)
 *   Example: SCAPI_PROXY_HOST=https://internal-proxy.example.com
 */
export function envValidation(env: Record<string, string>, mode: string): Plugin {
    return {
        name: 'template:env-validation',
        config() {
            const shortCode = env.PUBLIC__app__commerce__api__shortCode;
            const scapiProxyHost = process.env.SCAPI_PROXY_HOST;

            if (!shortCode && !scapiProxyHost && mode === 'development') {
                throw new Error(
                    'Missing required Commerce API short code.\n\n' +
                        'Set PUBLIC__app__commerce__api__shortCode in your .env file:\n' +
                        '  PUBLIC__app__commerce__api__shortCode=your-short-code\n\n' +
                        'See .env.default for the required vars and docs/README-CONFIG.md for the full reference.'
                );
            }
        },
    };
}
