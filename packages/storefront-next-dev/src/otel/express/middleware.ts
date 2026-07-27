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
 * Express middleware that creates server and streaming OTel spans.
 *
 * - **`sfnext.request`** (`SpanKind.SERVER`) wraps the entire Express request
 *   lifecycle (receive → response close). It is the single SERVER span for the
 *   storefront service — the inbound entry point that backends use to build the
 *   service topology and RED metrics. The request method and path live in
 *   attributes (`http.request.method`, `url.path`), not the span name, keeping the
 *   name low-cardinality so traces aggregate cleanly.
 * - **`sfnext.response_streaming`** (`SpanKind.INTERNAL`) starts when the first byte
 *   is written (first `writeHead` or `write`) and ends when the response stream closes.
 *
 * Uses `startActiveSpan` for the server span so all downstream spans (React Router's
 * `request`, loaders, middleware) automatically become children via OTel context propagation.
 *
 * **Inbound trace continuation:** the server span is started in the context built from
 * the request's W3C `traceparent` header (stamped by MRT upstream). We parse the header
 * and build the parent context with `trace.setSpanContext` rather than the global
 * `propagation.extract`, because in the externalized MRT Lambda bundle the W3C propagator
 * registered in `../setup` is not visible to the `propagation` API as resolved from this
 * module (see the note at the continuation site below). When the inbound trace is sampled,
 * the server span — and every child span and outbound fetch — joins MRT's trace. When the
 * header is absent or malformed, the parent context stays ROOT_CONTEXT and a fresh root
 * trace is started instead. The sampler honors the inbound sampled flag (see `../setup`);
 * this middleware adds no sampling logic of its own.
 *
 * Listens to both `close` and `finish` events with a once-guard — dev server emits
 * `close`, MRT Lambda adapter emits `finish`.
 */

import type { RequestHandler } from 'express';
import { context, ROOT_CONTEXT, type Span, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { parseTraceParent } from '@opentelemetry/core';
import {
    ATTR_HTTP_REQUEST_METHOD,
    ATTR_HTTP_RESPONSE_STATUS_CODE,
    ATTR_URL_PATH,
} from '@opentelemetry/semantic-conventions';
import { initTelemetry } from '../setup';

export function createOtelExpressMiddleware(): RequestHandler {
    const maybeTracer = initTelemetry();
    if (!maybeTracer) return (_req, _res, next) => next();
    const tracer = maybeTracer;

    return (req, res, next) => {
        try {
            const url = new URL(req.originalUrl || req.url, 'http://localhost').pathname;
            const method = req.method;

            // Continue the trace described by the inbound `traceparent` header (stamped by
            // MRT upstream). We parse it with `@opentelemetry/core`'s `parseTraceParent`
            // (the W3C spec parser — rejects malformed, all-zero, and reserved-version
            // headers) and build the parent context via `trace.setSpanContext`, rather than
            // the global `propagation.extract`: in the externalized MRT Lambda bundle a
            // different `@opentelemetry/api` instance owns the global registry, so the W3C
            // propagator registered in `../setup` is invisible here — `propagation.fields()`
            // is `[]`, `propagation.extract` falls back to the no-op propagator and returns
            // ROOT_CONTEXT, and every request would start a fresh root trace split from MRT's.
            // (Confirmed in live Lambda logs; passes locally only because the dev server has a
            // single API instance.) `parseTraceParent` is a pure function (no global lookup),
            // and `setSpanContext` writes through the realm-global context-key symbols
            // (`Symbol.for(...)`) the provider's tracer reads — so both survive the split. A
            // missing/malformed header leaves ROOT_CONTEXT (→ fresh root).
            const traceparent = req.headers.traceparent;
            const inboundSpanContext = typeof traceparent === 'string' ? parseTraceParent(traceparent) : null;
            const parentContext = inboundSpanContext
                ? trace.setSpanContext(ROOT_CONTEXT, { ...inboundSpanContext, isRemote: true })
                : ROOT_CONTEXT;

            // Pass parentContext explicitly so the server span continues MRT's trace
            // (shared trace ID, parented to MRT's span) and becomes the active span
            // for all downstream children and outbound fetches.
            tracer.startActiveSpan(
                'sfnext.request',
                {
                    kind: SpanKind.SERVER,
                    attributes: { [ATTR_HTTP_REQUEST_METHOD]: method, [ATTR_URL_PATH]: url },
                },
                parentContext,
                (serverSpan) => {
                    try {
                        // Inject W3C traceparent header so trace ID is accessible from the browser
                        const spanContext = trace.getSpan(context.active())?.spanContext();
                        if (spanContext) {
                            const flags = spanContext.traceFlags.toString(16).padStart(2, '0');
                            const responseTraceparent = `00-${spanContext.traceId}-${spanContext.spanId}-${flags}`;
                            res.setHeader('traceparent', responseTraceparent);
                        }
                    } catch {
                        // traceparent header is non-essential — skip on failure
                    }

                    const serverCtx = context.active();
                    const startTime = performance.now();
                    let streamingSpan: Span | null = null;
                    let firstByteMs = 0;
                    let ended = false;

                    // Start the response-streaming span when the first byte is written.
                    function startStreamingSpan() {
                        if (streamingSpan) return;
                        try {
                            firstByteMs = Math.round(performance.now() - startTime);
                            streamingSpan = tracer.startSpan(
                                'sfnext.response_streaming',
                                {
                                    attributes: {
                                        [ATTR_HTTP_REQUEST_METHOD]: method,
                                        [ATTR_URL_PATH]: url,
                                    },
                                },
                                serverCtx
                            );
                        } catch {
                            // Span creation failure is non-fatal
                        }
                    }

                    // Patch writeHead + write to detect the first byte of the response
                    const origWriteHead = res.writeHead.bind(res);
                    res.writeHead = ((...args: Parameters<typeof origWriteHead>) => {
                        startStreamingSpan();
                        return origWriteHead(...args);
                    }) as typeof origWriteHead;
                    const origWrite = res.write.bind(res);
                    res.write = ((...args: Parameters<typeof origWrite>) => {
                        startStreamingSpan();
                        return origWrite(...args);
                    }) as typeof origWrite;

                    function endSpans() {
                        if (ended) return;
                        ended = true;
                        try {
                            const totalMs = Math.round(performance.now() - startTime);
                            const statusCode = res.statusCode;

                            if (streamingSpan) {
                                streamingSpan.setAttribute('http.streaming_duration_ms', totalMs - firstByteMs);
                                streamingSpan.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, statusCode);
                                if (statusCode >= 500) streamingSpan.setStatus({ code: SpanStatusCode.ERROR });
                                streamingSpan.end();
                            }
                            serverSpan.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, statusCode);
                            serverSpan.setAttribute('http.total_duration_ms', totalMs);
                            if (statusCode >= 500) serverSpan.setStatus({ code: SpanStatusCode.ERROR });
                            serverSpan.end();
                        } catch {
                            // Response is already closing — swallow OTel errors silently
                        }
                    }

                    res.once('close', endSpans);
                    res.once('finish', endSpans);
                    next();
                }
            );
        } catch {
            // OTel failure must never prevent the request from being handled
            next();
        }
    };
}
