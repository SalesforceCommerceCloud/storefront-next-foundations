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
 * Empirical test for the order-confirmation streaming hang with React Router 7.18.
 *
 * BACKGROUND: order-confirmation's loader returns `{ orderData: deferredPromise }` — a
 * deferred promise. React Router streams this as a turbo-stream: an initial shell chunk
 * (route data with a placeholder for the unresolved promise), an async gap while the
 * loader resolves, then a second chunk (the resolved promise value). The suspicion: the
 * adapter's res.write backpressure signal stalls RR 7.18's new drain-aware writer after
 * the first chunk, so the second chunk never flushes, the navigation hangs, and CI times
 * out at 30s.
 *
 * THE FIX: res.write now returns "accepted" (true) instead of relaying the underlying
 * compression stream's backpressure bool. RR's writer never awaits drain, so the loop
 * flows without stalling — behaviorally identical to RR <=7.15.
 *
 * THIS TEST: drives the REAL React Router 7.18 writeReadableStreamToWritable against the
 * adapter's res object (brotli compression + MRT sink model) on a realistic deferred-
 * Suspense stream shape: shell chunk, async gap, large incompressible second chunk. The
 * MRT sink accepts every write and emits 'drain' on itself (so the compression → sink
 * pipe drains), but res never gets a usable 'drain' event. If the stream completes (all
 * chunks reach the sink + end() fires) within the deadline, the fix WORKS. If it stalls,
 * the fix is incomplete.
 */

import { describe, it, expect, vi } from 'vitest';
import { writeReadableStreamToWritable } from '@react-router/node';
import { EventEmitter } from 'events';
import type { Writable } from 'stream';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { createExpressResponse, createExpressRequest } from './create-lambda-adapter';

// Mock awslambda global (identity transform)
(globalThis as any).awslambda = {
    HttpResponseStream: {
        from: (stream: Writable) => stream,
    },
};

// MRT sink: real backpressure (returns false when saturated, emits 'drain' on itself
// after the write settles). The compression → sink pipe drains on this 'drain', so all
// bytes reach the sink. res, however, is a separate object that does not receive this
// 'drain' — the adapter does not forward it, and the real Lambda response stream does
// not reliably emit it.
function makeMrtSink() {
    const sink = new EventEmitter() as any;
    let inflight = 0;
    let received = 0;
    let saturated = false;

    sink.writable = true;
    sink.writableEnded = false;
    sink.destroyed = false;

    sink.write = (chunk: any, encOrCb?: any, cb?: any) => {
        if (typeof encOrCb === 'function') cb = encOrCb;
        inflight++;
        received += chunk.length;
        setTimeout(() => {
            inflight--;
            if (cb) cb();
            if (saturated && inflight < 4) {
                saturated = false;
                sink.emit('drain'); // emitted on the sink itself, NOT on res
            }
        }, 2);
        if (inflight >= 4) {
            saturated = true;
            return false; // backpressure
        }
        return true; // accepted
    };

    sink.end = (cb?: any) => {
        sink.writableEnded = true;
        sink.writable = false;
        if (typeof cb === 'function') cb();
        sink.emit('finish');
        return sink;
    };

    sink.bytesReceived = () => received;

    return sink as Writable & { bytesReceived: () => number };
}

// Order-confirmation loader shape: shell chunk (with <Suspense> placeholder for deferred
// orderData), async gap (loader awaits order + product), then the large resolved chunk
// (Suspense subtree with the order details). The second chunk is incompressible so brotli
// output stays large and genuinely backpressures the sink.
function deferredOrderConfirmationStream() {
    const enc = new TextEncoder();
    const shell = enc.encode(
        `<!doctype html><html><body><div id="root"><div>Order Confirmation...</div>${'x'.repeat(8 * 1024)}` // enough to start compression
    );

    // Incompressible second chunk (order + product data rendered) — use a PRNG so brotli
    // can't compress it, forcing the output to be large enough to backpressure the sink.
    let seed = 0x9e3779b9;
    const nextByte = () => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return 32 + (Math.abs(seed) % 95);
    };
    const resolvedChunk = Buffer.allocUnsafe(192 * 1024);
    for (let i = 0; i < resolvedChunk.length; i++) resolvedChunk[i] = nextByte();

    return new ReadableStream({
        async start(controller) {
            controller.enqueue(new Uint8Array(shell));
            // Async gap: loader awaits fetchOrder() + fetchProduct()
            await new Promise((r) => setTimeout(r, 50));
            controller.enqueue(new Uint8Array(resolvedChunk));
            controller.close();
        },
    });
}

// Mock API Gateway event + context for createExpressResponse
function mockEvent(overrides?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent {
    return {
        httpMethod: 'GET',
        path: '/order-confirmation/123.data',
        pathParameters: null,
        queryStringParameters: null,
        headers: {
            'Accept-Encoding': 'br,gzip,deflate',
            Host: 'example.com',
        },
        multiValueHeaders: {},
        body: null,
        isBase64Encoded: false,
        requestContext: {
            requestId: 'test-request-id',
            accountId: '123456789012',
            apiId: 'test-api-id',
            protocol: 'HTTP/1.1',
            httpMethod: 'GET',
            path: '/order-confirmation/123.data',
            stage: 'test',
            requestTime: '09/Apr/2015:12:34:56 +0000',
            requestTimeEpoch: 1428582896000,
            identity: {
                sourceIp: '127.0.0.1',
                userAgent: 'test-agent',
                accessKey: null,
                accountId: null,
                apiKey: null,
                apiKeyId: null,
                caller: null,
                cognitoAuthenticationProvider: null,
                cognitoAuthenticationType: null,
                cognitoIdentityId: null,
                cognitoIdentityPoolId: null,
                principalOrgId: null,
                user: null,
                userArn: null,
                clientCert: null,
            },
            resourceId: 'test-resource-id',
            resourcePath: '/order-confirmation/{id}',
        },
        resource: '/order-confirmation/{id}',
        stageVariables: null,
        ...overrides,
    } as APIGatewayProxyEvent;
}

function mockContext(): Context {
    return {
        callbackWaitsForEmptyEventLoop: false,
        functionName: 'test-function',
        functionVersion: '$LATEST',
        invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
        memoryLimitInMB: '128',
        awsRequestId: 'test-request-id',
        logGroupName: '/aws/lambda/test-function',
        logStreamName: '2024/01/01/[$LATEST]test',
        getRemainingTimeInMillis: () => 30000,
        done: vi.fn(),
        fail: vi.fn(),
        succeed: vi.fn(),
    } as Context;
}

describe('order-confirmation streaming with React Router 7.18', () => {
    it("completes React Router's stream write when the response stream applies backpressure", async () => {
        const responseStream = makeMrtSink();
        const event = mockEvent();
        const context = mockContext();
        const request = createExpressRequest(event, context);
        const res = createExpressResponse(responseStream, event, context, request);

        // Set compressible Content-Type so compression is negotiated
        res.setHeader('Content-Type', 'text/html; charset=utf-8');

        const finished = new Promise<void>((resolve) => responseStream.on('finish', resolve));

        // Drive the REAL React Router 7.18 writer against the adapter's res
        await writeReadableStreamToWritable(deferredOrderConfirmationStream(), res);

        // Wait for the stream to finish (with a timeout guard)
        await Promise.race([
            finished,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Stream never finished')), 5000)),
        ]);

        expect(responseStream.bytesReceived()).toBeGreaterThan(0);
        expect(res.finished).toBe(true);
    }, 10000); // 10s timeout for the test itself
});
