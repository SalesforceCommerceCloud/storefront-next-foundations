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
export declare type TransformToken = 'identity' | 'uncap' | 'lower' | 'upper' | 'cap';

export declare type TransformApplyOne<S extends string, T extends TransformToken> = T extends 'uncap'
    ? Uncapitalize<S>
    : T extends 'lower'
      ? Lowercase<S>
      : T extends 'upper'
        ? Uppercase<S>
        : T extends 'cap'
          ? Capitalize<S>
          : /* identity */ S;

export declare type TransformApplyPipe<S extends string, P extends readonly TransformToken[]> = P extends readonly [
    infer H,
    ...infer R,
]
    ? H extends TransformToken
        ? R extends readonly TransformToken[]
            ? TransformApplyPipe<TransformApplyOne<S, H>, R>
            : TransformApplyOne<S, H>
        : S
    : S;

export declare type TransformApply<
    S extends string,
    T extends TransformToken | readonly TransformToken[],
> = T extends readonly TransformToken[] ? TransformApplyPipe<S, T> : TransformApplyOne<S, T>;
