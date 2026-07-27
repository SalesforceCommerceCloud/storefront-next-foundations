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
 * Lambda-adapter carrier integration test.
 *
 * Drives the REAL adapter (`createExpressRequest`) + REAL middleware + REAL OTel
 * pipeline (no mocks) to prove that an inbound `traceparent` delivered through the
 * MRT streaming Lambda adapter is continued by the server span — i.e. the server
 * span lands on the inbound trace ID, parented to the inbound span.
 *
 * The carrier shape asserted here is the one observed on MRT: a lowercase,
 * single-value `traceparent` (the adapter lowercases single-value header keys in
 * `create-lambda-adapter.ts`). The middleware reads it with `req.headers.traceparent`
 * and builds the parent context via `trace.setSpanContext`.
 *
 * NOTE on environment: this runs in vitest's single `@opentelemetry/api` instance, so
 * the global propagator IS visible here and `propagation.extract` would parse the carrier
 * fine. That is NOT true in the externalized MRT Lambda bundle, where a different
 * `@opentelemetry/api` instance owns the global registry, `propagation.fields()` is `[]`,
 * and `propagation.extract` returns nothing even for this clean carrier (confirmed in live
 * Lambda logs). That split is the reason the middleware builds the parent context by hand
 * via `setSpanContext` instead of relying on the global propagator. See `express/middleware.ts`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { createExpressRequest } from '../mrt/create-lambda-adapter';
import { createOtelExpressMiddleware } from './express/middleware';
import { initTelemetry } from './setup';

const VALID_TRACE_ID = '11111111111111111111111111111111';
const VALID_PARENT_SPAN_ID = '2222222222222222';
const SAMPLED = `00-${VALID_TRACE_ID}-${VALID_PARENT_SPAN_ID}-01`;

interface EmittedSpan {
    traceId: string;
    id: string;
    parentId?: string;
    name: string;
}

/** Minimal API Gateway event with controllable headers. */
function buildEvent(opts: { headers?: Record<string, string> }): APIGatewayProxyEvent {
    return {
        httpMethod: 'GET',
        path: '/products',
        headers: opts.headers ?? {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        body: null,
        isBase64Encoded: false,
        resource: '',
        requestContext: { identity: { sourceIp: '127.0.0.1' } },
    } as unknown as APIGatewayProxyEvent;
}

function mockResponse(statusCode = 200) {
    const emitter = new EventEmitter();
    const res = Object.assign(emitter, {
        statusCode,
        writeHead: vi.fn(),
        write: vi.fn(),
        setHeader: vi.fn(),
    });
    return res as unknown as Parameters<ReturnType<typeof createOtelExpressMiddleware>>[1] & EventEmitter;
}

describe('W3C trace-context propagation through the MRT Lambda adapter', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;
    const savedEnv = process.env.SFNEXT_OTEL_ENABLED;

    beforeEach(() => {
        process.env.SFNEXT_OTEL_ENABLED = 'true';
        initTelemetry();
        consoleSpy = vi.spyOn(console, 'info').mockReturnValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        if (savedEnv === undefined) delete process.env.SFNEXT_OTEL_ENABLED;
        else process.env.SFNEXT_OTEL_ENABLED = savedEnv;
    });

    /** Drive a real adapter-built request through the middleware; return emitted spans. */
    function driveRequest(req: ReturnType<typeof createExpressRequest>): EmittedSpan[] {
        const middleware = createOtelExpressMiddleware();
        const res = mockResponse();
        middleware(req as never, res as never, vi.fn());
        res.writeHead(200);
        res.emit('finish');
        return consoleSpy.mock.calls
            .map((call: unknown[]): EmittedSpan | null => {
                try {
                    return JSON.parse(call[0] as string) as EmittedSpan;
                } catch {
                    return null;
                }
            })
            .filter(
                (s: EmittedSpan | null): s is EmittedSpan =>
                    !!s && typeof s.traceId === 'string' && typeof s.id === 'string'
            );
    }

    const serverSpan = (spans: EmittedSpan[]) => spans.find((s) => s.name === 'sfnext.request');

    it('continues the inbound trace for a lowercase single-value traceparent (the shape observed on MRT)', () => {
        const req = createExpressRequest(buildEvent({ headers: { traceparent: SAMPLED } }), {} as Context);

        expect(req.headers.traceparent).toBe(SAMPLED);

        const spans = driveRequest(req);
        expect(serverSpan(spans)?.traceId).toBe(VALID_TRACE_ID);
        expect(serverSpan(spans)?.parentId).toBe(VALID_PARENT_SPAN_ID);
    });
});
