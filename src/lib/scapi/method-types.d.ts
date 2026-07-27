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
import type {
    CommerceSdkKeyMap,
    CommerceSdkMethodName,
    CommerceSdkMethodReturnType,
    CommerceSdkMethodParameters,
    HelperNamespaceKeyMap,
    HelperMethodName,
    HelperMethodReturnType,
    HelperMethodParameters,
    ApiResponse,
} from '@/lib/scapi/types';

/** Unwraps the payload type from our ApiResponse wrapper or the SCAPI client `{ data, response }` shape. */
export type UnwrapApiResponse<T> =
    T extends ApiResponse<infer P> ? P : T extends { data: infer P; response: unknown } ? P : T;

/** First argument signature for a Commerce SDK client method. */
export type CommerceSdkMethodArgs<
    C extends CommerceSdkKeyMap,
    M extends CommerceSdkMethodName<C>,
> = CommerceSdkMethodParameters<C, M>[0];

/** Request body type for a Commerce SDK method, or undefined for no-body operations. */
export type CommerceSdkMethodBody<C extends CommerceSdkKeyMap, M extends CommerceSdkMethodName<C>> =
    CommerceSdkMethodArgs<C, M> extends { body: infer B } ? B : undefined;

/** Return payload type for a Commerce SDK client method. */
export type CommerceSdkMethodPayload<
    C extends CommerceSdkKeyMap,
    M extends CommerceSdkMethodName<C>,
> = UnwrapApiResponse<Awaited<CommerceSdkMethodReturnType<C, M>>>;

/** First argument signature for a helper method. */
export type HelperMethodArgs<H extends HelperNamespaceKeyMap, M extends HelperMethodName<H>> = HelperMethodParameters<
    H,
    M
>[0];

/** Request body type for a helper method, or undefined for no-body operations. */
export type HelperMethodBody<H extends HelperNamespaceKeyMap, M extends HelperMethodName<H>> =
    HelperMethodArgs<H, M> extends { body: infer B } ? B : undefined;

/** Return payload type for a helper method. */
export type HelperMethodPayload<H extends HelperNamespaceKeyMap, M extends HelperMethodName<H>> = Awaited<
    HelperMethodReturnType<H, M>
>;
