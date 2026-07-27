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

import type { Cookie } from 'react-router';

/**
 * Extract a string value from the URL path segment at the given index.
 */
export function lookupFromPath(pathname: string, pathIndex: number): string | null {
    const pathSegments = pathname.split('/').filter(Boolean);

    if (pathSegments.length <= pathIndex) return null;

    return pathSegments[pathIndex];
}

/**
 * Detect a string value from cookie using the given cookie parser.
 *
 * Returns a promise that resolves to the cookie value.
 */
export async function readCookieFromRequest(request: Request, cookie: Cookie): Promise<string | null> {
    const cookies = request.headers.get('Cookie');
    if (!cookies) return null;

    const cookieValue = await cookie.parse(cookies);
    return cookieValue;
}
