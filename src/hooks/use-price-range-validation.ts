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
export function usePriceRangeValidation(
    minPrice: string,
    maxPrice: string,
    minAllowed?: number,
    maxAllowed?: number
): { minHasError: boolean; maxHasError: boolean } {
    const parsedMin = parseFloat(minPrice);
    const parsedMax = parseFloat(maxPrice);
    const minNum = isNaN(parsedMin) ? 0 : parsedMin;
    const maxNum = isNaN(parsedMax) ? Infinity : parsedMax;

    // Check if min > max
    const invalidRange = Boolean(minPrice && maxPrice && minNum > maxNum);

    // Check if min is too high
    const minTooHigh = Boolean(minPrice && maxAllowed && minNum > maxAllowed);

    // Check if max is too low
    const maxTooLow = Boolean(maxPrice && minAllowed && maxNum < minAllowed);

    const minHasError = invalidRange || minTooHigh;
    const maxHasError = invalidRange || maxTooLow;

    return { minHasError, maxHasError };
}
