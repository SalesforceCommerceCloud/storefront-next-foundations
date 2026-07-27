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
import { type ReactElement } from 'react';
import { createLogger } from '@/lib/logger';

const logger = createLogger();

/**
 * Logs an error message only in development mode
 */
function devError(...args: unknown[]): void {
    if (import.meta.env.DEV) {
        logger.error(args.map(String).join(' '));
    }
}

/**
 * Props for the JsonLd component
 */
export interface JsonLdProps {
    /** The JSON-LD structured data object to inject into the page */
    data: Record<string, unknown>;
    /** Optional unique identifier for the script tag (useful when multiple JSON-LD scripts are on the same page) */
    id?: string;
    /**
     * Optional CSP nonce. When the security-headers middleware is enabled with a
     * nonce-bearing CSP, browsers block any inline `<script>` (including JSON-LD)
     * that lacks a matching nonce. Read the per-request value from the root
     * loader and forward it here. Read from `useRouteLoaderData('root').nonce`.
     */
    nonce?: string;
}

/**
 * JsonLd component that injects structured data into the page for SEO and AI systems.
 *
 * This component renders a `<script type="application/ld+json">` tag containing
 * structured data following the JSON-LD format. The structured data helps search
 * engines and AI systems understand the content of the page.
 *
 * The component should be placed in page components (e.g., PDP, PLP) and will be
 * rendered during server-side rendering, ensuring crawlers can immediately see the
 * structured data in the HTML response.
 *
 * **Important Notes:**
 * - The component renders in the page body (not in `<head>`), which is acceptable
 *   for JSON-LD as it works in both locations
 * - The data object will be stringified as JSON, so ensure it's a valid JSON-serializable object
 * - For best SEO results, ensure the data follows schema.org specifications
 *
 * @param props - Component props
 * @param props.data - The JSON-LD structured data object (will be stringified to JSON)
 * @param props.id - Optional unique identifier for the script tag
 *
 * @returns A script element with JSON-LD structured data
 *
 */
export function JsonLd({ data, id, nonce }: JsonLdProps): ReactElement | null {
    // Validate data is an object (not null, undefined, or primitive)
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        devError(
            '[JsonLd] Invalid data provided. Expected a plain object, but received:',
            typeof data === 'object' ? (Array.isArray(data) ? 'array' : 'null') : typeof data
        );
        return null;
    }

    let jsonString: string;
    try {
        jsonString = JSON.stringify(data);
    } catch (error) {
        devError('[JsonLd] Failed to stringify data:', error);
        return null;
    }

    return (
        <script id={id} type="application/ld+json" nonce={nonce}>
            {jsonString}
        </script>
    );
}
