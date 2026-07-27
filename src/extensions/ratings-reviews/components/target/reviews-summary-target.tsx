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
/** @sfdc-extension-file SFDC_EXT_RATINGS_REVIEWS */
import { type ReactElement } from 'react';
import { ProductRatingSummary } from '@/components/product-view/product-rating-summary';

/**
 * UITarget wrapper for the PDP rating summary. Renders `ProductRatingSummary`
 * directly — the PDP-level `ProductReviewsProvider` (mounted in the route) already
 * supplies the loader-seeded summary data via context.
 */
export default function ReviewsSummaryTarget(): ReactElement {
    return <ProductRatingSummary interactive={false} />;
}
