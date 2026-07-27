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
export declare type IsAny<T> = 0 extends 1 & T ? true : false;

export declare type IsFn<T> = T extends (...args: any[]) => any ? true : false;

export declare type Ctor = new (...args: any[]) => any;

export declare type SafeCtor<T> = IsAny<T> extends true ? never : T extends Ctor ? T : never;

export declare type LiteralKeys<T> = {
    [K in keyof T]-?: string extends K ? never : number extends K ? never : symbol extends K ? never : K;
}[keyof T];

declare type SafeMethodKeysOf<T> =
    IsAny<T> extends true
        ? never
        : {
              [K in LiteralKeys<T>]: IsFn<T[K]> extends true ? K : never;
          }[LiteralKeys<T>] &
              string;

declare type SafePropertiesKeysOf<T> =
    IsAny<T> extends true
        ? never
        : {
              [K in LiteralKeys<T>]: IsFn<T[K]> extends true ? never : K;
          }[LiteralKeys<T>] &
              string;

export declare type InstanceMethodKeysOf<C> = C extends Ctor ? SafeMethodKeysOf<InstanceType<C>> : never;

export declare type InstancePropertiesKeysOf<C> = C extends Ctor ? SafePropertiesKeysOf<InstanceType<C>> : never;

export declare type StaticMethodKeysOf<C> = C extends Ctor ? SafeMethodKeysOf<C> : never;

export declare type InstanceMethodParams<C extends Ctor, K extends InstanceMethodKeysOf<C>> = Parameters<
    InstanceType<C>[K]
>;

export declare type InstanceMethodReturn<C extends Ctor, K extends InstanceMethodKeysOf<C>> = ReturnType<
    InstanceType<C>[K]
>;

declare type JsonPrimitive = string | number | boolean | null;
declare type JsonArray = Json[] | readonly Json[];
declare type JsonObject = {
    [Key in string]: Json;
} & {
    [Key in string]?: Json | undefined;
};
export declare type Json = JsonPrimitive | JsonArray | JsonObject;
