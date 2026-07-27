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
import type { RequestHandler } from 'express';

/**
 * Normalizes the X-Forwarded-Host header to support React Router's CSRF validation features.
 *
 * NOTE: This middleware performs header manipulation as a temporary, internal
 * solution for MRT/Lambda environments. It may be updated or removed if React Router
 * introduces a first-class configuration for validating against forwarded headers.
 *
 * React Router v7.12+ uses the X-Forwarded-Host header (preferring it over Host)
 * to validate request origins for security. In Managed Runtime (MRT) with a vanity
 * domain, the eCDN automatically sets the X-Forwarded-Host to the vanity domain.
 * React Router handles cases where this header contains multiple comma-separated
 * values by prioritizing the first entry.
 *
 * This middleware ensures that X-Forwarded-Host is always present by falling back
 * to a configured public domain if the header is missing (e.g., local development).
 * By only modifying X-Forwarded-Host, we provide a consistent environment for
 * React Router's security checks without modifying the internal 'Host' header,
 * which is required for environment-specific routing logic (e.g., Hybrid Proxy).
 *
 * Priority order:
 * 1. X-Forwarded-Host: Automatically set by eCDN for vanity domains.
 * 2. EXTERNAL_DOMAIN_NAME: Fallback environment variable for the public domain
 *    used when no forwarded headers are present (e.g., local development).
 */
export function createHostHeaderMiddleware(): RequestHandler {
    return (req, _res, next) => {
        // If X-Forwarded-Host is missing, populate it from the trusted fallback.
        // React Router v7 uses this header (preferring it over Host) to validate
        // against the 'Origin' for CSRF protection.
        if (!req.get('x-forwarded-host') && process.env.EXTERNAL_DOMAIN_NAME) {
            req.headers['x-forwarded-host'] = process.env.EXTERNAL_DOMAIN_NAME;
        }

        next();
    };
}
