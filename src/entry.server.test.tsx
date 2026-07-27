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
import { describe, it, expect, vi } from 'vitest';
import type { EntryContext, RouterContextProvider } from 'react-router';
import { securityContext } from '@salesforce/storefront-next-runtime/security';
import handleRequest from './entry.server';

// Mock react-dom/server to capture the props passed by handleRequest.
// We don't actually need a real React render — just verify the wiring.
//
// The element passed to renderToPipeableStream is:
//   <NonceContext.Provider value={nonce}>
//     <ServerRouter nonce={nonce} ... />
//   </NonceContext.Provider>
// So `element.props.value` is the context-provider value, and
// `element.props.children.props.nonce` is the <ServerRouter> nonce.
type ServerRouterElement = { props: { nonce?: string } };
type CapturedCall = {
    element: { props: { value?: string; children: ServerRouterElement } };
    options: { nonce?: string };
};
const captured: CapturedCall[] = [];
vi.mock('react-dom/server', () => ({
    renderToPipeableStream: (element: unknown, options: Record<string, unknown>) => {
        captured.push({
            element: element as CapturedCall['element'],
            options: options as CapturedCall['options'],
        });
        // Trigger onShellReady synchronously so the Promise resolves.
        const onShellReady = options.onShellReady as () => void;
        queueMicrotask(() => onShellReady());
        return {
            pipe: () => undefined,
            abort: () => undefined,
        };
    },
}));

vi.mock('@react-router/node', () => ({
    createReadableStreamFromReadable: () => new ReadableStream(),
}));

vi.mock('isbot', () => ({ isbot: () => false }));

function makeRouterContext(nonce: string | null): RouterContextProvider {
    const store = new Map<unknown, unknown>();
    if (nonce !== null) store.set(securityContext, { nonce });
    return {
        get: (k: unknown) => store.get(k),
        set: (k: unknown, v: unknown) => store.set(k, v),
    } as unknown as RouterContextProvider;
}

const fakeEntryContext = { isSpaMode: false } as unknown as EntryContext;

describe('entry.server', () => {
    it('forwards the nonce from securityContext to <ServerRouter>, NonceContext, and renderToPipeableStream', async () => {
        captured.length = 0;
        const ctx = makeRouterContext('abc123==');
        await handleRequest(new Request('http://localhost/'), 200, new Headers(), fakeEntryContext, ctx);
        expect(captured).toHaveLength(1);
        // <NonceContext.Provider value={nonce}> — covers the error-path fallback
        // when the root loader throws and useRouteLoaderData is unavailable.
        expect(captured[0].element.props.value).toBe('abc123==');
        // <ServerRouter nonce={...}> (child of NonceContext.Provider) — covers
        // RR's StreamTransfer chunks for deferred-data hydration.
        expect(captured[0].element.props.children.props.nonce).toBe('abc123==');
        // renderToPipeableStream({ nonce, ... }) — covers react-dom Float / Suspense instructions.
        expect(captured[0].options.nonce).toBe('abc123==');
    });

    it('passes undefined when securityContext is unset (security middleware disabled)', async () => {
        captured.length = 0;
        const ctx = makeRouterContext(null);
        await handleRequest(new Request('http://localhost/'), 200, new Headers(), fakeEntryContext, ctx);
        expect(captured).toHaveLength(1);
        expect(captured[0].element.props.value).toBeUndefined();
        expect(captured[0].element.props.children.props.nonce).toBeUndefined();
        expect(captured[0].options.nonce).toBeUndefined();
    });

    it('returns an empty Response immediately for HEAD requests without rendering', async () => {
        captured.length = 0;
        const ctx = makeRouterContext('abc123==');
        const res = await handleRequest(
            new Request('http://localhost/', { method: 'HEAD' }),
            200,
            new Headers(),
            fakeEntryContext,
            ctx
        );
        expect(res.status).toBe(200);
        expect(captured).toHaveLength(0);
    });
});
