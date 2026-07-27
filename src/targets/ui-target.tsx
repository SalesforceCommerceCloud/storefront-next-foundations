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

/**
 * UITarget is a placeholder component that marks extension points in the UI.
 *
 * At build time, this component is transformed:
 * - PRODUCTION: Pure passthrough, renders children as-is (zero overhead)
 * - DEVELOPMENT: Vite plugin adds visual markers for debugging extension points
 *
 * @param targetId - Unique identifier for this extension point
 * @param children - Default content to render (optional for replacement targets)
 *
 * @example
 * // Replacement target (extension adds new UI)
 * <UITarget targetId="pdp.loyalty.badge" />
 *
 * @example
 * // Wrapper target (extension enhances existing UI)
 * <UITarget targetId="orderSummary.tax">
 *   <TaxDisplay amount={tax} />
 * </UITarget>
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger();

export function UITarget({ targetId, children }: { targetId: string; children?: React.ReactNode }) {
    logger.debug('UITarget', { targetId });
    // Production: pure passthrough with zero overhead
    // Development: Vite plugin transforms this at build time to add visual markers
    return <>{children}</>;
}
