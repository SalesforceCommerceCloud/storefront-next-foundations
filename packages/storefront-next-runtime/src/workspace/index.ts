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
 * Detects if the application is running in a Salesforce Workspace environment.
 *
 * Salesforce Workspaces set specific SFW_* environment variables that are only present
 * in workspace environments. This detection method is inspired by the ecom gradle build
 * which checks `environmentName == 'ws'`.
 *
 * The presence of these environment variables reliably indicates a workspace environment:
 * - SFW_FALCON_INSTANCE: The Falcon instance ID (e.g., 'aws-dev2-uswest2')
 * - SFW_SERVICE_INSTANCE: The service instance name
 * - SFW_LOCATION: The workspace location code
 *
 * @returns true if running in a Salesforce Workspace environment, false otherwise
 */
export function isWorkspaceEnvironment(): boolean {
    // Only check on server-side
    if (typeof window !== 'undefined') {
        return false;
    }

    // Check for Salesforce Workspace environment variables
    // These are only set when running in a workspace environment
    const hasSfwVars =
        !!process.env.SFW_FALCON_INSTANCE || !!process.env.SFW_SERVICE_INSTANCE || !!process.env.SFW_LOCATION;

    return hasSfwVars;
}

/**
 * Strips the 'f_ecom_' prefix from organization ID for SLAS authentication in workspace environments.
 *
 * In Salesforce Commerce Cloud Workspace (SCW) environments, organization IDs have different formats
 * depending on the API endpoint:
 * - SLAS auth endpoints: Use base organization ID without prefix (e.g., 'zzzz_s01')
 * - Product/Search APIs: Use full organization ID with prefix (e.g., 'f_ecom_zzzz_s01')
 *
 * @param orgId - The full organization ID (e.g., 'f_ecom_zzzz_s01')
 * @returns The base organization ID without prefix (e.g., 'zzzz_s01')
 */
export function getWorkspaceSlasOrgId(orgId: string): string {
    // Strip the 'f_ecom_' prefix if present
    return orgId.replace(/^f_ecom_/, '');
}
