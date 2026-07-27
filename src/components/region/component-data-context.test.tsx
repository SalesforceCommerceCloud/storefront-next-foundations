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
import { renderHook } from '@testing-library/react';
import { ComponentDataProvider, useComponentData, useComponentDataById } from './component-data-context';

describe('ComponentDataContext', () => {
    describe('useComponentData', () => {
        it('returns undefined when not within provider', () => {
            const { result } = renderHook(() => useComponentData());
            expect(result.current).toBeUndefined();
        });

        it('returns the full componentData map when within provider', () => {
            const mockData = {
                'component-1': Promise.resolve({ title: 'Component 1' }),
                'component-2': Promise.resolve({ title: 'Component 2' }),
            };

            const { result } = renderHook(() => useComponentData(), {
                wrapper: ({ children }) => <ComponentDataProvider value={mockData}>{children}</ComponentDataProvider>,
            });

            expect(result.current).toBe(mockData);
        });

        it('returns empty object when provider has empty map', () => {
            const mockData = {};

            const { result } = renderHook(() => useComponentData(), {
                wrapper: ({ children }) => <ComponentDataProvider value={mockData}>{children}</ComponentDataProvider>,
            });

            expect(result.current).toEqual({});
        });
    });

    describe('useComponentDataById', () => {
        it('returns undefined when not within provider', () => {
            const { result } = renderHook(() => useComponentDataById('component-1'));
            expect(result.current).toBeUndefined();
        });

        it('returns undefined when component ID not found in map', () => {
            const mockData = {
                'component-1': Promise.resolve({ title: 'Component 1' }),
            };

            const { result } = renderHook(() => useComponentDataById('component-2'), {
                wrapper: ({ children }) => <ComponentDataProvider value={mockData}>{children}</ComponentDataProvider>,
            });

            expect(result.current).toBeUndefined();
        });

        it('returns the correct promise for a given component ID', () => {
            const promise1 = Promise.resolve({ title: 'Component 1' });
            const promise2 = Promise.resolve({ title: 'Component 2' });
            const mockData = {
                'component-1': promise1,
                'component-2': promise2,
            };

            const { result } = renderHook(() => useComponentDataById('component-1'), {
                wrapper: ({ children }) => <ComponentDataProvider value={mockData}>{children}</ComponentDataProvider>,
            });

            expect(result.current).toBe(promise1);
        });

        it('returns correct promise when re-rendering with different ID', () => {
            const promise1 = Promise.resolve({ title: 'Component 1' });
            const promise2 = Promise.resolve({ title: 'Component 2' });
            const mockData = {
                'component-1': promise1,
                'component-2': promise2,
            };

            const { result, rerender } = renderHook(({ id }) => useComponentDataById(id), {
                initialProps: { id: 'component-1' },
                wrapper: ({ children }) => <ComponentDataProvider value={mockData}>{children}</ComponentDataProvider>,
            });

            expect(result.current).toBe(promise1);

            rerender({ id: 'component-2' });
            expect(result.current).toBe(promise2);
        });

        it('handles promises that resolve to different data types', async () => {
            const mockData = {
                'string-data': Promise.resolve('string value'),
                'number-data': Promise.resolve(42),
                'object-data': Promise.resolve({ key: 'value' }),
                'array-data': Promise.resolve([1, 2, 3]),
                'null-data': Promise.resolve(null),
            };

            const { result: stringResult } = renderHook(() => useComponentDataById('string-data'), {
                wrapper: ({ children }) => <ComponentDataProvider value={mockData}>{children}</ComponentDataProvider>,
            });
            await expect(stringResult.current).resolves.toBe('string value');

            const { result: numberResult } = renderHook(() => useComponentDataById('number-data'), {
                wrapper: ({ children }) => <ComponentDataProvider value={mockData}>{children}</ComponentDataProvider>,
            });
            await expect(numberResult.current).resolves.toBe(42);

            const { result: objectResult } = renderHook(() => useComponentDataById('object-data'), {
                wrapper: ({ children }) => <ComponentDataProvider value={mockData}>{children}</ComponentDataProvider>,
            });
            await expect(objectResult.current).resolves.toEqual({ key: 'value' });

            const { result: arrayResult } = renderHook(() => useComponentDataById('array-data'), {
                wrapper: ({ children }) => <ComponentDataProvider value={mockData}>{children}</ComponentDataProvider>,
            });
            await expect(arrayResult.current).resolves.toEqual([1, 2, 3]);

            const { result: nullResult } = renderHook(() => useComponentDataById('null-data'), {
                wrapper: ({ children }) => <ComponentDataProvider value={mockData}>{children}</ComponentDataProvider>,
            });
            await expect(nullResult.current).resolves.toBeNull();
        });
    });

    describe('ComponentDataProvider', () => {
        it('provides context to nested components', () => {
            const mockData = {
                'component-1': Promise.resolve({ title: 'Component 1' }),
            };

            const { result: outerResult } = renderHook(() => useComponentData(), {
                wrapper: ({ children }) => <ComponentDataProvider value={mockData}>{children}</ComponentDataProvider>,
            });

            expect(outerResult.current).toBe(mockData);
        });

        it('does not leak context to sibling components', () => {
            const mockData = {
                'component-1': Promise.resolve({ title: 'Component 1' }),
            };

            // Hook inside provider
            const { result: insideResult } = renderHook(() => useComponentData(), {
                wrapper: ({ children }) => (
                    <>
                        <ComponentDataProvider value={mockData}>{children}</ComponentDataProvider>
                    </>
                ),
            });

            // Hook outside provider (sibling)
            const { result: outsideResult } = renderHook(() => useComponentData());

            expect(insideResult.current).toBe(mockData);
            expect(outsideResult.current).toBeUndefined();
        });

        it('allows nested providers with different data', () => {
            const outerData = {
                'component-1': Promise.resolve({ title: 'Outer' }),
            };
            const innerData = {
                'component-2': Promise.resolve({ title: 'Inner' }),
            };

            const { result } = renderHook(() => useComponentData(), {
                wrapper: ({ children }) => (
                    <ComponentDataProvider value={outerData}>
                        <ComponentDataProvider value={innerData}>{children}</ComponentDataProvider>
                    </ComponentDataProvider>
                ),
            });

            // Inner provider should override outer
            expect(result.current).toBe(innerData);
        });
    });
});
