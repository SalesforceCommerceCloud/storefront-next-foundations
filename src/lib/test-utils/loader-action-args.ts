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
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

/**
 * Placeholder value for `pattern` in test args.
 * Route-specific types define this as a string literal (e.g. '/:siteId/:localeId/cart'),
 * so a plain string won't satisfy the type. `as never` is used because `never` is
 * assignable to any type. Centralised here so there's one place to update if the
 * React Router API changes.
 */
export const ROUTE_PATTERN = '/' as never;

/**
 * Options for creating loader or action function args in tests.
 */
export interface LoaderActionArgsOptions {
    /** Route params (e.g. { productId: '123' }). Defaults to {}. */
    params?: Record<string, string | undefined>;
    /** The route pattern. Use `ROUTE_PATTERN` for a safe placeholder value. */
    pattern: string;
}

/**
 * Creates a LoaderFunctionArgs object for testing route loaders.
 * Reduces duplication and ensures `pattern` and `url` are always set.
 *
 * Accepts an optional type parameter to return route-specific loader args
 * (e.g. `Route.LoaderArgs`) so tests can call typed loaders without casts.
 *
 * Note: The `as T` cast is intentional — route-specific types (e.g. Route.LoaderArgs)
 * have narrower `params` and a literal `pattern` that cannot be satisfied
 * statically. The cast trades compile-time exhaustiveness for ergonomic test setup.
 * If Route types gain new required fields, tests using this helper will need updating.
 *
 * @param request - The request object
 * @param context - The router context (e.g. from createTestContext())
 * @param options - Options including params and pattern
 * @returns A complete LoaderFunctionArgs object (or the specified type)
 *
 * @example
 * ```ts
 * const args = createLoaderArgs<Route.LoaderArgs>(mockRequest, mockContext, {
 *   params: { siteId: 'test-site', localeId: 'en-US' },
 *   pattern: ROUTE_PATTERN,
 * });
 * const result = await loader(args);
 * ```
 */
export function createLoaderArgs<T = LoaderFunctionArgs>(
    request: Request,
    context: LoaderFunctionArgs['context'],
    options: LoaderActionArgsOptions
): T {
    return {
        request,
        context,
        params: options.params ?? {},
        pattern: options.pattern,
        url: new URL(request.url),
    } as T;
}

/**
 * Creates an ActionFunctionArgs object for testing route actions.
 * Reduces duplication and ensures `pattern` and `url` are always set.
 *
 * Accepts an optional type parameter to return route-specific action args
 * (e.g. `Route.ActionArgs`) so tests can call typed actions without casts.
 *
 * Note: The `as T` cast is intentional — route-specific types (e.g. Route.ActionArgs)
 * have narrower `params` and a literal `pattern` that cannot be satisfied
 * statically. The cast trades compile-time exhaustiveness for ergonomic test setup.
 * If Route types gain new required fields, tests using this helper will need updating.
 *
 * @param request - The request object
 * @param context - The router context (e.g. from createTestContext())
 * @param options - Options including params and pattern
 * @returns A complete ActionFunctionArgs object (or the specified type)
 *
 * @example
 * ```ts
 * const args = createActionArgs<Route.ActionArgs>(mockRequest, mockContext, {
 *   params: { siteId: 'test-site', localeId: 'en-US' },
 *   pattern: ROUTE_PATTERN,
 * });
 * const result = await action(args);
 * ```
 */
export function createActionArgs<T = ActionFunctionArgs>(
    request: Request,
    context: ActionFunctionArgs['context'],
    options: LoaderActionArgsOptions
): T {
    return {
        request,
        context,
        params: options.params ?? {},
        pattern: options.pattern,
        url: new URL(request.url),
    } as T;
}
