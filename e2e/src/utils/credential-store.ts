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

import type { StoredCredentials } from '../types/auth.types';

/**
 * Credential Store Utility
 *
 * Manages test credentials that persist across test specs within a single worker process.
 * Credentials are held in memory — each worker process gets its own independent store,
 * so there are no cross-worker file races when running with `run-workers N`.
 *
 * This ensures login tests can reuse credentials created during signup without
 * creating duplicate accounts for each test spec within the same worker.
 */
class CredentialStore {
    private credentials: StoredCredentials | null = null;

    /**
     * Store credentials for the test session
     * @param credentials - Credentials to store
     */
    store(credentials: StoredCredentials): void {
        this.credentials = credentials;
    }

    /**
     * Retrieve stored credentials
     * @returns Stored credentials or null if not found
     */
    get(): StoredCredentials | null {
        return this.credentials;
    }

    /**
     * Check if credentials exist
     * @returns true if credentials are stored
     */
    hasCredentials(): boolean {
        return this.credentials !== null;
    }

    /**
     * Clear stored credentials
     */
    cleanup(): void {
        this.credentials = null;
    }
}

// Export singleton instance
export const credentialStore = new CredentialStore();
