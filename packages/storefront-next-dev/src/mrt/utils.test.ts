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
import { describe, it, expect } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { mergeHeadersIntoMultiValueHeaders } from './utils';

describe('mrt/utils', () => {
    describe('mergeHeadersIntoMultiValueHeaders', () => {
        const createMockEvent = (
            headers: Record<string, string> | null,
            multiValueHeaders: Record<string, string[]> | null
        ): APIGatewayProxyEvent =>
            ({
                headers,
                multiValueHeaders,
                httpMethod: 'GET',
                path: '/',
                resource: '/',
                queryStringParameters: null,
                multiValueQueryStringParameters: null,
                pathParameters: null,
                stageVariables: null,
                requestContext: {} as APIGatewayProxyEvent['requestContext'],
                body: null,
                isBase64Encoded: false,
            }) as APIGatewayProxyEvent;

        it('should return event unchanged when headers is null', () => {
            const event = createMockEvent(null, { Accept: ['*/*'] });
            const result = mergeHeadersIntoMultiValueHeaders(event);
            expect(result).toBe(event);
        });

        it('should return event unchanged when multiValueHeaders is null', () => {
            const event = createMockEvent({ Accept: '*/*' }, null);
            const result = mergeHeadersIntoMultiValueHeaders(event);
            expect(result).toBe(event);
        });

        it('should merge headers that only exist in event.headers', () => {
            const event = createMockEvent(
                {
                    Accept: '*/*',
                    'x-correlation-id': '12345-abcde',
                },
                {
                    Accept: ['*/*'],
                }
            );

            const result = mergeHeadersIntoMultiValueHeaders(event);

            expect(result.multiValueHeaders).toEqual({
                Accept: ['*/*'],
                'x-correlation-id': ['12345-abcde'],
            });
        });

        it('should not overwrite existing multiValueHeaders', () => {
            const event = createMockEvent(
                {
                    Accept: 'text/html',
                    'Content-Type': 'application/json',
                },
                {
                    Accept: ['*/*', 'text/html'],
                    'Content-Type': ['text/plain'],
                }
            );

            const result = mergeHeadersIntoMultiValueHeaders(event);

            // Should keep original multiValueHeaders values
            expect(result.multiValueHeaders).toEqual({
                Accept: ['*/*', 'text/html'],
                'Content-Type': ['text/plain'],
            });
        });

        it('should handle case-insensitive header matching', () => {
            const event = createMockEvent(
                {
                    'X-Correlation-Id': '12345',
                    'content-type': 'application/json',
                },
                {
                    'x-correlation-id': ['existing-id'],
                    'Content-Type': ['text/html'],
                }
            );

            const result = mergeHeadersIntoMultiValueHeaders(event);

            // Should not duplicate headers with different casing
            expect(result.multiValueHeaders).toEqual({
                'x-correlation-id': ['existing-id'],
                'Content-Type': ['text/html'],
            });
        });

        it('should skip undefined header values', () => {
            const event = createMockEvent(
                {
                    Accept: '*/*',
                    'x-undefined-header': undefined as unknown as string,
                },
                {
                    Accept: ['*/*'],
                }
            );

            const result = mergeHeadersIntoMultiValueHeaders(event);

            expect(result.multiValueHeaders).toEqual({
                Accept: ['*/*'],
            });
            expect(result.multiValueHeaders['x-undefined-header']).toBeUndefined();
        });

        it('should preserve other event properties', () => {
            const event = createMockEvent({ 'x-correlation-id': '12345' }, { Accept: ['*/*'] });
            event.httpMethod = 'POST';
            event.path = '/api/test';
            event.body = '{"test": true}';

            const result = mergeHeadersIntoMultiValueHeaders(event);

            expect(result.httpMethod).toBe('POST');
            expect(result.path).toBe('/api/test');
            expect(result.body).toBe('{"test": true}');
            expect(result.headers).toEqual({ 'x-correlation-id': '12345' });
        });

        it('should handle empty headers object', () => {
            const event = createMockEvent({}, { Accept: ['*/*'] });

            const result = mergeHeadersIntoMultiValueHeaders(event);

            expect(result.multiValueHeaders).toEqual({
                Accept: ['*/*'],
            });
        });

        it('should handle empty multiValueHeaders object', () => {
            const event = createMockEvent({ 'x-correlation-id': '12345' }, {});

            const result = mergeHeadersIntoMultiValueHeaders(event);

            expect(result.multiValueHeaders).toEqual({
                'x-correlation-id': ['12345'],
            });
        });
    });
});
