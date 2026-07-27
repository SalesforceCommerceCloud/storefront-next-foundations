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
    ConsentCategory,
    ConsentPreferences,
    EventAdapter,
    EventSiteInfo,
} from '@salesforce/storefront-next-runtime/events';

/**
 * Configuration for adapters.
 *
 * Adapter-specific configuration fields (e.g. Einstein's `siteId`, Active Data endpoints) are
 * passed through this open-ended index signature; each adapter validates and reads only the
 * fields it understands.
 */
export type EngagementAdapterConfig = {
    siteId?: string;
    consentCategory?: ConsentCategory;
    eventToggles: Record<AnalyticsEvent['eventType'], boolean>;
    [key: string]: unknown;
};

/**
 * Interface for adapters
 */
export interface EngagementAdapter extends EventAdapter {
    name: string;
    sendEvent?: (
        event: AnalyticsEvent,
        siteInfo?: EventSiteInfo,
        consentPreferences?: ConsentPreferences
    ) => Promise<unknown>;
    send?: (url: string, options?: RequestInit) => Promise<Response>;
}
