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
    AnalyticsEvent,
    ConsentPreferences,
    EventMediator,
    EventPayload,
    EventSiteInfo,
    EventTypeMap,
    ViewPageEvent,
} from './types';

/**
 * Type-safe event creation function
 *
 * This generic function allows creating any event type under AnalyticsEvent
 * with full type safety. The event type is inferred from the string literal
 * passed as the first parameter, and TypeScript will enforce the correct
 * data properties for that specific event type.
 *
 * @example
 * ```typescript
 * const viewPageEvent = createEvent('view_page', { path: '/products', payload });
 * const viewProductEvent = createEvent('view_product', { product, payload });
 * ```
 */
export function createEvent<T extends AnalyticsEvent['eventType']>(
    eventType: T,
    data: EventPayload<T>
): EventTypeMap[T] {
    return {
        eventType,
        ...data,
    } as EventTypeMap[T];
}

/**
 * Send a view page event to the event mediator
 *
 * This wrapper function is used in the automated page view event tracking client middleware.
 * This function exists to support build-time checks and type safety.
 *
 * @param event - The view page event to send
 * @param eventMediator - The event mediator to send the event to
 */
export function sendViewPageEvent(
    event: ViewPageEvent,
    eventMediator: EventMediator,
    siteInfo?: EventSiteInfo,
    consentPreferences?: ConsentPreferences
): void {
    eventMediator.track(event, siteInfo, consentPreferences);
}
