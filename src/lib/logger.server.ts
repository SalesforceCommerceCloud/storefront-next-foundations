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
import { createContext as createRouterContext, type RouterContextProvider } from 'react-router';
import { correlationContext } from '@/lib/correlation';
import { createLogger, type Logger } from '@/lib/logger';

/**
 * Router context for logger injection.
 *
 * On the server, `loggingMiddleware` (in `middlewares/logging.server.ts`) sets a pino-backed
 * logger here. `getLogger()` checks this context first and returns the injected
 * logger when available, falling back to a console-based logger otherwise.
 */
// Note: defaultValue must not be `undefined` — React Router's context.get() throws
// "No value found for context" when defaultValue === undefined. Using `null` allows
// getLogger() to be called safely before loggingMiddleware has run.
export const loggerContext = createRouterContext<Logger | null>(null);

/**
 * Get a request-scoped logger from router context.
 *
 * Automatically includes the correlation ID from the request context in every log entry.
 * Use this in middlewares, loaders, actions, and API helpers that have access to
 * the React Router context.
 *
 * @param context - React Router context provider (from middleware/loader/action args)
 *
 * @example
 * ```ts
 * export async function loader({ context }: LoaderFunctionArgs) {
 *     const logger = getLogger(context);
 *     logger.info('Product loaded', { productId });
 * }
 * ```
 */
export function getLogger(context: Readonly<RouterContextProvider>): Logger {
    const injected = context.get(loggerContext);
    if (injected) return injected;

    // Fallback: console logger with correlationId (e.g. when loggingMiddleware hasn't run)
    const correlationId = context.get(correlationContext);
    return createLogger(correlationId ? { correlationId } : undefined);
}
