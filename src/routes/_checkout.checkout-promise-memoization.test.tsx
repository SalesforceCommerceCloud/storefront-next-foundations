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

import { describe, it } from 'vitest';

describe.skip('Checkout promise memoization (disabled)', () => {
    it('placeholder', () => {});
});

// import { describe, it, expect } from 'vitest';
// import { renderHook } from '@testing-library/react';
// import { useMemo } from 'react';

// describe('Validate checkout scenario', () => {
//     it('should demonstrate why useMemo is necessary for use() hook', () => {
//         // Simulate loader data
//         const customerProfilePromise = Promise.resolve({ customer: { id: '123' } });
//         const shippingMethodsPromise = Promise.resolve({ methods: [] });

//         const renderCount = { current: 0 };
//         const promiseReferences: any[] = [];

//         const { rerender } = renderHook(
//             ({ customerProfile, shippingMethods }) => {
//                 renderCount.current++;

//                 // Without useMemo (
//                 const unstablePromise = Promise.all([
//                     customerProfile ?? Promise.resolve(null),
//                     shippingMethods ?? Promise.resolve(null),
//                 ]);

//                 promiseReferences.push(unstablePromise);

//                 return unstablePromise;
//             },
//             {
//                 initialProps: {
//                     customerProfile: customerProfilePromise,
//                     shippingMethods: shippingMethodsPromise,
//                 },
//             }
//         );

//         // Re-render with same props
//         rerender({
//             customerProfile: customerProfilePromise,
//             shippingMethods: shippingMethodsPromise,
//         });

//         // Without useMemo, every render creates a new promise
//         expect(promiseReferences[0]).not.toBe(promiseReferences[1]);
//     });

//     it('should demonstrate correct pattern with useMemo', () => {
//         const customerProfilePromise = Promise.resolve({ customer: { id: '123' } });
//         const shippingMethodsPromise = Promise.resolve({ methods: [] });

//         const promiseReferences: any[] = [];

//         const { rerender } = renderHook(
//             ({ customerProfile, shippingMethods }) => {
//                 const stablePromise = useMemo(
//                     () =>
//                         Promise.all([
//                             customerProfile ?? Promise.resolve(null),
//                             shippingMethods ?? Promise.resolve(null),
//                         ]),
//                     [customerProfile, shippingMethods]
//                 );

//                 promiseReferences.push(stablePromise);

//                 return stablePromise;
//             },
//             {
//                 initialProps: {
//                     customerProfile: customerProfilePromise,
//                     shippingMethods: shippingMethodsPromise,
//                 },
//             }
//         );

//         // Re-render with SAME props
//         rerender({
//             customerProfile: customerProfilePromise,
//             shippingMethods: shippingMethodsPromise,
//         });

//         // With useMemo, returns same promise reference
//         expect(promiseReferences[0]).toBe(promiseReferences[1]);
//     });

//     it('should handle optional promises correctly', () => {
//         // Simulate guest user (no customer profile)
//         const shippingMethodsPromise = Promise.resolve({ methods: [] });

//         const { result, rerender } = renderHook(
//             ({ customerProfile, shippingMethods }) =>
//                 useMemo(
//                     () =>
//                         Promise.all([
//                             customerProfile ?? Promise.resolve(null),
//                             shippingMethods ?? Promise.resolve(null),
//                         ]),
//                     [customerProfile, shippingMethods]
//                 ),
//             {
//                 initialProps: {
//                     customerProfile: undefined,
//                     shippingMethods: shippingMethodsPromise,
//                 },
//             }
//         );

//         const firstPromise = result.current;

//         // Re-render with same data
//         rerender({
//             customerProfile: undefined,
//             shippingMethods: shippingMethodsPromise,
//         });

//         const secondPromise = result.current;

//         // Should maintain stable reference
//         expect(firstPromise).toBe(secondPromise);
//     });
// });
