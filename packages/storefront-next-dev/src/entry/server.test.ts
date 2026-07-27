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
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../otel/react-router/instrumentation', () => ({
    platformInstrumentation: { handler: vi.fn(), route: vi.fn() },
}));

import { composeServerEntry } from './server';
import type { ServerEntryModule, EntryContext, AppLoadContext } from 'react-router';

describe('composeServerEntry', () => {
    const mockDefault = vi.fn().mockResolvedValue(new Response('ok'));
    const mockHandleDataRequest = vi.fn().mockResolvedValue(new Response('data'));
    const mockHandleError = vi.fn();

    function createMockModule(overrides: Partial<ServerEntryModule> = {}): ServerEntryModule {
        return {
            default: mockDefault,
            ...overrides,
        };
    }

    it('should wrap the default handler and delegate to the app module', async () => {
        const appModule = createMockModule();
        const composed = composeServerEntry(appModule);

        // The composed default should be a wrapper, not the same reference
        expect(composed.default).not.toBe(appModule.default);

        const request = new Request('http://example.com/test');
        const headers = new Headers();
        const context = {} as EntryContext;
        const loadContext = {} as AppLoadContext;

        await composed.default(request, 200, headers, context, loadContext);

        // Should delegate to the app's default handler with the same arguments
        expect(mockDefault).toHaveBeenCalledWith(request, 200, headers, context, loadContext);
    });

    it('should pass through handleDataRequest', () => {
        const appModule = createMockModule({ handleDataRequest: mockHandleDataRequest });
        const composed = composeServerEntry(appModule);

        expect(composed.handleDataRequest).toBe(mockHandleDataRequest);
    });

    it('should pass through handleError', () => {
        const appModule = createMockModule({ handleError: mockHandleError });
        const composed = composeServerEntry(appModule);

        expect(composed.handleError).toBe(mockHandleError);
    });

    it('should prepend platform instrumentation to instrumentations', () => {
        const appInstrumentation = { handler: vi.fn() };
        const appModule = createMockModule({
            instrumentations: [appInstrumentation],
        });
        const composed = composeServerEntry(appModule);

        // Platform instrumentation prepended + app instrumentation preserved
        const instrumentations = composed.instrumentations ?? [];
        expect(instrumentations).toHaveLength(2);
        expect(instrumentations[0]).not.toBe(appInstrumentation);
        expect(instrumentations[0]).toHaveProperty('handler');
        expect(instrumentations[1]).toBe(appInstrumentation);
    });

    it('should include platform instrumentation even when app has none', () => {
        const appModule = createMockModule();
        const composed = composeServerEntry(appModule);

        const instrumentations = composed.instrumentations ?? [];
        expect(instrumentations).toHaveLength(1);
        expect(instrumentations[0]).toHaveProperty('handler');
    });

    it('should pass through streamTimeout', () => {
        const appModule = createMockModule({ streamTimeout: 10_000 });
        const composed = composeServerEntry(appModule);

        expect(composed.streamTimeout).toBe(10_000);
    });

    it('should handle undefined optional fields', () => {
        const appModule = createMockModule();
        const composed = composeServerEntry(appModule);

        expect(composed.handleDataRequest).toBeUndefined();
        expect(composed.handleError).toBeUndefined();
        expect(composed.streamTimeout).toBeUndefined();
    });

    it('should return a new object (not the same reference)', () => {
        const appModule = createMockModule();
        const composed = composeServerEntry(appModule);

        expect(composed).not.toBe(appModule);
    });

    it('should pass through unknown properties for forward compatibility', () => {
        const appModule = {
            ...createMockModule(),
            futureExport: 'some-value',
            anotherNewFeature: () => 'result',
        } as ServerEntryModule & Record<string, unknown>;

        const composed = composeServerEntry(appModule) as ServerEntryModule & Record<string, unknown>;

        expect(composed.futureExport).toBe('some-value');
        expect(composed.anotherNewFeature).toBe((appModule as any).anotherNewFeature);
    });

    it('should not drop unknown properties when composing known ones', () => {
        const appModule = {
            ...createMockModule({
                handleError: mockHandleError,
                streamTimeout: 5000,
            }),
            futureExport: { nested: true },
        } as ServerEntryModule & Record<string, unknown>;

        const composed = composeServerEntry(appModule) as ServerEntryModule & Record<string, unknown>;

        // Known properties still work
        expect(composed.handleError).toBe(mockHandleError);
        expect(composed.streamTimeout).toBe(5000);
        // Unknown property is preserved
        expect(composed.futureExport).toEqual({ nested: true });
    });

    describe('unstable_instrumentations dev-mode warning', () => {
        const originalNodeEnv = process.env.NODE_ENV;

        afterEach(() => {
            process.env.NODE_ENV = originalNodeEnv;
            vi.restoreAllMocks();
        });

        it('warns when an ejected entry still exports unstable_instrumentations', () => {
            process.env.NODE_ENV = 'development';
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            composeServerEntry({
                default: mockDefault,
                unstable_instrumentations: [{ handler: vi.fn() }],
            } as unknown as ServerEntryModule);
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('unstable_instrumentations'));
        });

        it('does not warn when the entry uses the new instrumentations name', () => {
            process.env.NODE_ENV = 'development';
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            composeServerEntry({
                default: mockDefault,
                instrumentations: [{ handler: vi.fn() }],
            });
            expect(warn).not.toHaveBeenCalled();
        });

        it('does not warn when both names are present (rename in progress)', () => {
            process.env.NODE_ENV = 'development';
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            composeServerEntry({
                default: mockDefault,
                instrumentations: [{ handler: vi.fn() }],
                unstable_instrumentations: [{ handler: vi.fn() }],
            } as unknown as ServerEntryModule);
            expect(warn).not.toHaveBeenCalled();
        });

        it('does not warn in production', () => {
            process.env.NODE_ENV = 'production';
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            composeServerEntry({
                default: mockDefault,
                unstable_instrumentations: [{ handler: vi.fn() }],
            } as unknown as ServerEntryModule);
            expect(warn).not.toHaveBeenCalled();
        });
    });
});
