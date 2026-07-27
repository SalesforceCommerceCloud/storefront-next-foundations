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
import { beforeEach, afterEach } from 'vitest';

export interface TestBed<TResults, TState, TArgs extends unknown[] = []> {
    state: TState;
    afterRender: (fn: (result: TResults, ...args: TArgs) => void | Promise<void>) => void;
    beforeRender: (fn: (...args: TArgs) => void | Promise<void>) => void;
    render: (...args: TArgs) => Promise<TResults>;
    cleanup: (fn: (...args: TArgs) => void | Promise<void>) => void;
    defineProperty: <TObj extends object, TKey extends keyof TObj>(
        obj: TObj,
        property: TKey,
        descriptor: PropertyDescriptor
    ) => void;
}

export interface TestBedConfig<TResults, TMethods, TState, TArgs extends unknown[] = []> {
    renderer: (...args: TArgs) => TResults | Promise<TResults>;
    state?: () => TState;
    methods?: TMethods;
}

/**
 * Simple test bed implementation for testing that handles logic for cleanup,
 * before and after render hooks, and rendering.
 * The test bed should be created during test discovery (within a describe block),
 * not within a test since it registers before and after hooks.
 * @param config - The configuration for the test bed
 * @returns The test bed
 * @example
 * describe('test bed', () => {
 *   const testBed = createTestBed({
 * .   renderer: (props) => render(<MyComponent {...props} />)
 *   });
 *
 *   it('should render the component', async () => {
 *     const { findByText } = await testBed.render({ name: 'test' });
 *
 *     expect(findByText('test')).toBeDefined();
 *   }
 * });
 */
export function createTestBed<TResults, TMethods, TState, TArgs extends unknown[] = []>(
    config: TestBedConfig<TResults, TMethods, TState, TArgs>
): TestBed<TResults, TState, TArgs> & TMethods {
    let beforeRenderFns: ((...args: TArgs) => void | Promise<void>)[] = [];
    let afterRenderFns: ((result: TResults, ...args: TArgs) => void | Promise<void>)[] = [];
    let cleanupFns: ((...args: TArgs) => void | Promise<void>)[] = [];
    let currentArgs: TArgs;
    let state: TState;

    beforeEach(() => {
        state = config.state?.() ?? ({} as TState);
        currentArgs = undefined as unknown as TArgs;
        beforeRenderFns = [];
        afterRenderFns = [];
        cleanupFns = [];
    });

    afterEach(async () => {
        await cleanupFns.reduce((acc, fn) => acc.then(() => fn(...currentArgs)), Promise.resolve());
    });

    return {
        ...config.methods,
        get state() {
            return state;
        },
        defineProperty: <TObj extends object, TKey extends keyof TObj>(
            obj: TObj,
            property: TKey,
            descriptor: PropertyDescriptor
        ) => {
            const originalDescriptor = Object.getOwnPropertyDescriptor(obj, property);

            Object.defineProperty(obj, property, {
                configurable: true,
                writable: true,
                ...descriptor,
            });

            cleanupFns.push(() => {
                if (originalDescriptor) {
                    Object.defineProperty(obj, property, originalDescriptor);
                }
            });
        },
        beforeRender: (fn: (...args: TArgs) => void | Promise<void>) => {
            beforeRenderFns.push(fn);
        },
        afterRender: (fn: (result: TResults, ...args: TArgs) => void | Promise<void>) => {
            afterRenderFns.push(fn);
        },
        cleanup: (fn: (...args: TArgs) => void | Promise<void>) => {
            cleanupFns.push(fn);
        },
        render: async (...args: TArgs): Promise<TResults> => {
            currentArgs = args;

            await beforeRenderFns.reduce((acc, fn) => acc.then(() => fn(...args)), Promise.resolve());

            const results = await config.renderer(...args);

            await afterRenderFns.reduce((acc, fn) => acc.then(() => fn(results, ...args)), Promise.resolve());

            return results;
        },
    } as unknown as TestBed<TResults, TState, TArgs> & TMethods;
}
