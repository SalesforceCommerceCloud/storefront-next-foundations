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
 * Helper to create a request with URL-encoded body for testing action handlers.
 *
 * Uses URLSearchParams with 'application/x-www-form-urlencoded' Content-Type,
 * which is what request.formData() parses. This matches how HTML forms submit
 * data by default and how React Router's fetcher.submit() sends form data.
 *
 * Node 24's Request.formData() requires an explicit Content-Type header to
 * parse the body correctly, unlike Node 22 which was more lenient.
 *
 * @param url - The URL for the request
 * @param method - The HTTP method (POST, PATCH, etc.)
 * @param data - Key-value pairs to include in the request body
 * @returns A Request object with proper Content-Type header
 */
export function createFormDataRequest(url: string, method: string, data: Record<string, string>): Request {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
        params.append(key, value);
    }
    return new Request(url, {
        method,
        body: params.toString(),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
}
