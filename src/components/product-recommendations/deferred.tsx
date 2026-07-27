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
import { type ReactElement } from 'react';
import { useDeferredRender } from '@/hooks/use-deferred-render';
import ProductRecommendations, { type ProductRecommendationsProps } from './index';

/**
 * Wraps `ProductRecommendations` with three-phase deferred rendering for non-critical recs carousels.
 *
 * Mounting the inner `<Suspense>` boundary on initial render forces React to retain the fallback tree and reconcile
 * the pending subtree during the critical paint window — even when the carousel is below the fold. Gating the mount on
 * `useDeferredRender` lets the above-the-fold content paint without contention, then streams the carousel in once the
 * browser is idle.
 *
 * Phase 1 (Pre-Idle): Render `fallback` directly (typically `ProductRecommendationSkeleton`). The inner Suspense/Await
 * is not mounted yet.
 *
 * Phase 2 (Post-Idle, Pending): Idle callback fires; `<ProductRecommendations data={…}>` mounts its Suspense boundary
 * with `fallback` while the loader Promise is still pending.
 *
 * Phase 3 (Resolved): The Promise resolves and the carousel renders.
 *
 * Choosing this wrapper over `<ProductRecommendations>` directly *is* the opt-in to deferred rendering. Critical,
 * above-the-fold carousels should use `<ProductRecommendations>` directly.
 *
 * Promise stability across revalidation is the caller's responsibility — pin the loader Promise at the route level
 * (or wherever the data originates) via `useState(() => …)` so a non-navigating revalidation doesn't produce a fresh
 * Promise reference and re-suspend the carousel.
 */
export default function DeferredProductRecommendations(props: ProductRecommendationsProps): ReactElement {
    const shouldRender = useDeferredRender(true);

    if (!shouldRender) {
        return <>{props.fallback ?? null}</>;
    }

    return <ProductRecommendations {...props} />;
}
