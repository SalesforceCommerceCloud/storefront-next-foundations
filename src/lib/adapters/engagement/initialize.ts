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
import type { AppConfig } from '@/types/config';
import { getAllAdapters } from './store';
import { createLogger } from '@/lib/logger';

const logger = createLogger();

let adaptersInitializationPromise: Promise<void> | undefined;

/**
 * Ensures engagement adapters are initialized.
 *
 * This function handles the lazy initialization of engagement adapters.
 * The function is idempotent - it's safe to call multiple times.
 * If initialization is already in progress, it returns the existing promise.
 *
 * Adapter initialization code (Einstein, etc.) is dynamically imported to keep it out of the initial bundle.
 *
 * @param appConfig - The application configuration needed to initialize adapters
 * @returns Promise that resolves when adapters are initialized, or undefined on error
 */
export async function ensureAdaptersInitialized(appConfig: AppConfig): Promise<void> {
    // Early exit: check if adapters are already initialized
    if (getAllAdapters().length > 0) {
        return;
    }

    // If initialization is already in progress, wait for it
    if (adaptersInitializationPromise) {
        try {
            await adaptersInitializationPromise;
            return;
        } catch (error) {
            if (import.meta.env.DEV) {
                logger.warn('Failed to initialize engagement adapters', { error });
            }
            return;
        }
    }

    // Start initialization with lazy loading
    adaptersInitializationPromise = (async () => {
        // Dynamically import adapter initialization code to keep it out of initial bundle
        const { initializeEngagementAdapters } = await import('./register');

        // Initialize adapters only if config is available
        if (appConfig) {
            initializeEngagementAdapters(appConfig);
        }
    })().catch((error) => {
        // Clear promise on error to allow retry
        adaptersInitializationPromise = undefined;
        if (import.meta.env.DEV) {
            logger.warn('Failed to initialize engagement adapters', { error });
        }
        throw error;
    });

    try {
        await adaptersInitializationPromise;
    } catch {
        // Error already logged above
    }
}

/**
 * Reset the adapters initialization promise (for testing only)
 *
 * This function clears the cached initialization promise, allowing tests to create
 * a fresh initialization state. This should only be used in test environments.
 */
export function resetAdaptersInitialization(): void {
    adaptersInitializationPromise = undefined;
}
