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
import type { MiddlewareFunction } from 'react-router';
import { correlationContext, generateCorrelationId } from '@/lib/correlation';
import { getLogger } from '@/lib/logger.server';

/**
 * Middleware to extract or generate a correlation ID for request tracing.
 * This must run FIRST in the middleware chain so all subsequent middleware
 * and loaders can access the correlation ID.
 *
 * Correlation ID is determined in the following order:
 * 1. x-correlation-id request header (if present)
 * 2. Newly generated UUID (fallback)
 */
export const correlationMiddleware: MiddlewareFunction<Response> = async ({ request, context }, next) => {
    const logger = getLogger(context);
    const headerCorrelationId = request.headers.get('x-correlation-id');
    const correlationId = headerCorrelationId || generateCorrelationId();

    logger.debug('Correlation: middleware starting', {
        correlationId,
        fromHeader: !!headerCorrelationId,
    });

    context.set(correlationContext, correlationId);
    return next();
};
