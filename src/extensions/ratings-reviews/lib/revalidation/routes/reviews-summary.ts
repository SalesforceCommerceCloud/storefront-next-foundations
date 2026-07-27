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
import type { ShouldRevalidateFunctionArgs } from 'react-router';
import { resourceRoutes } from '@/route-paths';
import { getActionPath } from '@/lib/revalidation/routes/shared';
import type { AddReviewResponse } from '@/extensions/ratings-reviews/routes/action.add-review';

/**
 * `shouldRevalidate` policy for the `resource.reviews-summary` route. The summary is product-global (a pure function
 * of `productId`, independent of auth, currency, shopper-context, selected store, locale, and consent), so no action
 * changes it except {@link AddReviewResponse | add-review}. The fetcher mounts only in the cart-item and order-line
 * overlays, where it would otherwise re-run on every action submitted on the page.
 *
 * Opt in only when the submission targets {@link resourceRoutes.addReview} *and* its result reports success with a
 * review: the path check stops an unrelated action with a `{ success, review }`-shaped body from tripping the re-run,
 * and the payload check skips a failed add-review. Navigations defer to the default — the fetcher's URL is keyed to
 * `productId`, so a navigation re-issues it for the right product regardless.
 *
 * @remarks Opt-out gate: a future action that mutates review aggregates (delete-review, edit, mark-helpful) is
 * silently skipped until added here.
 * @see https://reactrouter.com/start/framework/route-module#shouldrevalidate
 */
export function shouldRevalidate({
    currentUrl,
    formAction,
    formMethod,
    actionResult,
    defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs): boolean {
    if (formMethod && formMethod !== 'GET' && formAction) {
        const actionPath = getActionPath(formAction, currentUrl.origin);
        if (actionPath === resourceRoutes.addReview) {
            const result = actionResult as AddReviewResponse | undefined;
            return Boolean(result?.success && result.review);
        }
        return false;
    }
    return defaultShouldRevalidate;
}
