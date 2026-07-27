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
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock objects so they can be referenced inside vi.mock() factories.
// Set SFNEXT_OTEL_ENABLED before the module loads so the module-level tracer
// is non-null (initTelemetry is called instead of returning null).
const { mockSpan, mockTracer } = vi.hoisted(() => {
    process.env.SFNEXT_OTEL_ENABLED = 'true';
    const span = {
        setStatus: vi.fn(),
        recordException: vi.fn(),
        end: vi.fn(),
    };
    const tracer = {
        // Immediately invoke the callback with the mock span, mirroring real OTel behaviour.
        startActiveSpan: vi.fn((_name: string, _options: unknown, callback: (s: typeof span) => unknown) =>
            callback(span)
        ),
    };
    return { mockSpan: span, mockTracer: tracer };
});

vi.mock('../setup', () => ({
    initTelemetry: vi.fn(() => mockTracer),
}));

// Mirror the real numeric enum values used in assertions.
vi.mock('@opentelemetry/api', async (importOriginal) => {
    const original = await importOriginal<typeof import('@opentelemetry/api')>();
    return {
        ...original,
        SpanStatusCode: { UNSET: 0, OK: 1, ERROR: 2 },
    };
});

import { platformInstrumentation } from './instrumentation';
import type { ServerInstrumentation } from 'react-router';

describe('platformInstrumentation', () => {
    const GET = 'GET';
    const testUrl = 'http://example.com/products';
    const testRequest = new Request(testUrl, { method: GET });

    type InstrumentCallbacks = Record<string, (...args: unknown[]) => Promise<void>>;

    // Call platformInstrumentation.handler() and return the captured instrument callbacks.
    function getHandlerCallbacks(platformInstr: ServerInstrumentation): InstrumentCallbacks {
        let callbacks: InstrumentCallbacks | undefined;
        const mockHandler = {
            instrument: vi.fn((cbs: InstrumentCallbacks) => {
                callbacks = cbs;
            }),
        };
        if (!platformInstr.handler) throw new Error('platform handler not present');
        platformInstr.handler(mockHandler as never);
        if (!callbacks) throw new Error('instrument() was not called');
        return callbacks;
    }

    // Call platformInstrumentation.route() and return the captured instrument callbacks.
    function getRouteCallbacks(platformInstr: ServerInstrumentation, routeId = 'routes/products'): InstrumentCallbacks {
        let callbacks: InstrumentCallbacks | undefined;
        const mockRoute = {
            id: routeId,
            instrument: vi.fn((cbs: InstrumentCallbacks) => {
                callbacks = cbs;
            }),
        };
        if (!platformInstr.route) throw new Error('platform route not present');
        platformInstr.route(mockRoute as never);
        if (!callbacks) throw new Error('instrument() was not called');
        return callbacks;
    }

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── handler / request ───────────────────────────────────────────────────

    describe('handler request span', () => {
        it('starts a span named "sfnext.ssr" with http.request.method and url.path attributes', async () => {
            const { request } = getHandlerCallbacks(platformInstrumentation);

            await request(vi.fn().mockResolvedValue({ status: 'ok' }), { request: testRequest });

            expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
                'sfnext.ssr',
                { attributes: { 'http.request.method': GET, 'url.path': '/products' } },
                expect.any(Function)
            );
        });

        it('ends the span after a successful request without setting an error status', async () => {
            const { request } = getHandlerCallbacks(platformInstrumentation);

            await request(vi.fn().mockResolvedValue({ status: 'ok' }), { request: testRequest });

            expect(mockSpan.end).toHaveBeenCalledOnce();
            expect(mockSpan.setStatus).not.toHaveBeenCalled();
            expect(mockSpan.recordException).not.toHaveBeenCalled();
        });

        it('sets ERROR status and records exception on an error result', async () => {
            const { request } = getHandlerCallbacks(platformInstrumentation);
            const error = new Error('handler failed');

            await request(vi.fn().mockResolvedValue({ status: 'error', error }), { request: testRequest });

            expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 2, message: 'handler failed' });
            expect(mockSpan.recordException).toHaveBeenCalledWith(error);
            expect(mockSpan.end).toHaveBeenCalledOnce();
        });
    });

    // ─── route / loader ───────────────────────────────────────────────────────

    describe('route loader span', () => {
        const pattern = '/products';
        const routeId = 'routes/products';

        it('starts a span named "sfnext.loader" with rr.route.id + http.route (method/path on parent server span)', async () => {
            const { loader } = getRouteCallbacks(platformInstrumentation, routeId);

            await loader(vi.fn().mockResolvedValue({ status: 'ok' }), {
                request: testRequest,
                pattern,
            });

            expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
                'sfnext.loader',
                {
                    attributes: {
                        'rr.route.id': routeId,
                        'http.route': pattern,
                    },
                },
                expect.any(Function)
            );
        });

        it('ends the span on success without setting an error status', async () => {
            const { loader } = getRouteCallbacks(platformInstrumentation, routeId);

            await loader(vi.fn().mockResolvedValue({ status: 'ok' }), {
                request: testRequest,
                pattern,
            });

            expect(mockSpan.end).toHaveBeenCalledOnce();
            expect(mockSpan.setStatus).not.toHaveBeenCalled();
        });

        it('sets ERROR status and records exception on an error result', async () => {
            const { loader } = getRouteCallbacks(platformInstrumentation, routeId);
            const error = new Error('loader failed');

            await loader(vi.fn().mockResolvedValue({ status: 'error', error }), {
                request: testRequest,
                pattern,
            });

            expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 2, message: 'loader failed' });
            expect(mockSpan.recordException).toHaveBeenCalledWith(error);
            expect(mockSpan.end).toHaveBeenCalledOnce();
        });
    });

    // ─── route / action ───────────────────────────────────────────────────────

    describe('route action span', () => {
        const pattern = '/cart';
        const routeId = 'routes/cart';

        it('starts a span named "sfnext.action" with rr.route.id + http.route (method/path on parent server span)', async () => {
            const { action } = getRouteCallbacks(platformInstrumentation, routeId);

            await action(vi.fn().mockResolvedValue({ status: 'ok' }), {
                request: testRequest,
                pattern,
            });

            expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
                'sfnext.action',
                {
                    attributes: {
                        'rr.route.id': routeId,
                        'http.route': pattern,
                    },
                },
                expect.any(Function)
            );
        });

        it('sets ERROR status and records exception on an error result', async () => {
            const { action } = getRouteCallbacks(platformInstrumentation, routeId);
            const error = new Error('action failed');

            await action(vi.fn().mockResolvedValue({ status: 'error', error }), {
                request: testRequest,
                pattern,
            });

            expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 2, message: 'action failed' });
            expect(mockSpan.recordException).toHaveBeenCalledWith(error);
            expect(mockSpan.end).toHaveBeenCalledOnce();
        });
    });

    // ─── route / middleware ───────────────────────────────────────────────────

    describe('route middleware span', () => {
        const pattern = '/account';
        const routeId = 'routes/account';

        it('creates an active span named "sfnext.middleware" via startActiveSpan', async () => {
            const { middleware } = getRouteCallbacks(platformInstrumentation, routeId);

            await middleware(vi.fn().mockResolvedValue({ status: 'ok' }), {
                request: testRequest,
                pattern,
            });

            expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
                'sfnext.middleware',
                {
                    attributes: {
                        'rr.route.id': routeId,
                        'http.route': pattern,
                    },
                },
                expect.any(Function)
            );
        });

        it('sets ERROR status and records exception on an error result', async () => {
            const { middleware } = getRouteCallbacks(platformInstrumentation, routeId);
            const error = new Error('middleware failed');

            await middleware(vi.fn().mockResolvedValue({ status: 'error', error }), {
                request: testRequest,
                pattern,
            });

            expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 2, message: 'middleware failed' });
            expect(mockSpan.recordException).toHaveBeenCalledWith(error);
            expect(mockSpan.end).toHaveBeenCalledOnce();
        });
    });

    // ─── disabled path ────────────────────────────────────────────────────────

    describe('disabled path (SFNEXT_OTEL_ENABLED !== "true")', () => {
        it('calls through directly without starting a span when OTel is disabled', async () => {
            vi.resetModules();
            const savedEnv = process.env.SFNEXT_OTEL_ENABLED;
            delete process.env.SFNEXT_OTEL_ENABLED;

            try {
                const { platformInstrumentation: disabledInstr } = await import('./instrumentation');

                // handler.request calls through without touching the tracer
                let handlerCallbacks: Record<string, (...args: unknown[]) => Promise<void>> | undefined;
                const mockHandler = {
                    instrument: vi.fn((cbs) => {
                        handlerCallbacks = cbs;
                    }),
                };
                if (!disabledInstr.handler) throw new Error('handler not present on disabled instrumentation');
                disabledInstr.handler(mockHandler as never);
                if (!handlerCallbacks) throw new Error('instrument() was not called on handler');
                const handleRequest = vi.fn().mockResolvedValue({ status: 'ok' });
                await handlerCallbacks.request(handleRequest, { request: testRequest });
                expect(handleRequest).toHaveBeenCalledOnce();

                // route.loader calls through without touching the tracer
                let routeCallbacks: Record<string, (...args: unknown[]) => Promise<void>> | undefined;
                const mockRoute = {
                    id: 'routes/test',
                    instrument: vi.fn((cbs) => {
                        routeCallbacks = cbs;
                    }),
                };
                if (!disabledInstr.route) throw new Error('route not present on disabled instrumentation');
                disabledInstr.route(mockRoute as never);
                if (!routeCallbacks) throw new Error('instrument() was not called on route');
                const handleLoader = vi.fn().mockResolvedValue({ status: 'ok' });
                await routeCallbacks.loader(handleLoader, {
                    request: testRequest,
                    pattern: '/test',
                });
                expect(handleLoader).toHaveBeenCalledOnce();

                expect(mockTracer.startActiveSpan).not.toHaveBeenCalled();
            } finally {
                process.env.SFNEXT_OTEL_ENABLED = savedEnv;
            }
        });
    });
});
