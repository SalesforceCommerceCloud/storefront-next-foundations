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
import type { APIGatewayProxyEvent } from 'aws-lambda';

const MRT_BUNDLE_TYPE_SSR = 'ssr' as const;
const MRT_STREAMING_ENTRY_FILE = 'streamingHandler' as const;
export type MrtBundleType = typeof MRT_BUNDLE_TYPE_SSR | typeof MRT_STREAMING_ENTRY_FILE;
/**
 * Gets the MRT entry file for the given mode
 * @param mode - The mode to get the MRT entry file for
 * @returns The MRT entry file for the given mode
 */
export const getMrtEntryFile = (mode: string): MrtBundleType => {
    // TODO: Move the MRT_BUNDLE_TYPE env var to a command line option with sfnext
    // Streaming is enabled by default in production unless explicitly set to 'ssr'
    const enableStreaming = process.env.MRT_BUNDLE_TYPE !== MRT_BUNDLE_TYPE_SSR && mode === 'production';
    return enableStreaming ? MRT_STREAMING_ENTRY_FILE : MRT_BUNDLE_TYPE_SSR;
};

/**
 * Merges headers from event.headers into event.multiValueHeaders.
 *
 * @codegenie/serverless-express prefers multiValueHeaders over headers when both exist.
 * However, some headers (like x-correlation-id added by CloudFront/MRT) may only exist
 * in event.headers and not in event.multiValueHeaders, causing them to be lost.
 *
 * This function ensures all headers from event.headers are present in multiValueHeaders.
 */
export function mergeHeadersIntoMultiValueHeaders(event: APIGatewayProxyEvent): APIGatewayProxyEvent {
    if (!event.headers || !event.multiValueHeaders) {
        return event;
    }

    const mergedMultiValueHeaders = { ...event.multiValueHeaders };

    for (const [key, value] of Object.entries(event.headers)) {
        // Only add if not already in multiValueHeaders (case-insensitive check)
        const existingKey = Object.keys(mergedMultiValueHeaders).find((k) => k.toLowerCase() === key.toLowerCase());

        if (!existingKey && value !== undefined) {
            mergedMultiValueHeaders[key] = [value];
        }
    }

    return {
        ...event,
        multiValueHeaders: mergedMultiValueHeaders,
    };
}
