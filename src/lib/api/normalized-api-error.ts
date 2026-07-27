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
import { ApiError } from '@/scapi';
import { getErrorMessage } from '@/lib/utils';

/**
 * Normalized error for API call failures.
 *
 * Wraps any error (ApiError, Error, unknown) into a consistent shape:
 * - `.message` — human-readable, extracted via `getErrorMessage()`
 * - `.status` — HTTP status from ApiError, or `undefined` for non-API errors
 * - `.cause` — the original error, preserved for advanced consumers (Sentry, DataDog, etc.)
 */
export class NormalizedApiError extends Error {
    readonly status: number | undefined;

    constructor(error: unknown) {
        super(getErrorMessage(error), { cause: error });
        this.name = 'NormalizedApiError';
        this.status = error instanceof ApiError ? error.status : undefined;
    }
}
