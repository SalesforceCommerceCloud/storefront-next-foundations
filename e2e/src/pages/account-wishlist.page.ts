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

import { buildSitePath } from '../utils/url-utils';

const { I } = inject();

/**
 * Account Wishlist Page Object
 * Handles interactions with the /account/wishlist page
 */
class AccountWishlistPage {
    readonly path = '/account/wishlist';
    private readonly wishlistItemSelector = '[data-testid^="wishlist-item-"]';

    locators = {
        wishlistItem: locate(this.wishlistItemSelector).as('Wishlist Item'),
        removeButton: locate(this.wishlistItemSelector).first().find('button').as('Remove Button'),
        pageTitle: locate('h1').withText('Wishlist').as('Page Title'),
    };

    readonly maxPollAttempts = 3;

    navigate(): void {
        I.amOnPage(buildSitePath(this.path));
    }

    /**
     * Validate that the page loaded successfully.
     * The wishlist page header renders before the item list resolves from Suspense,
     * so asserting on the heading gives a stable readiness signal regardless of
     * whether the user has any saved items.
     */
    validatePageLoaded(): void {
        I.seeElement(this.locators.pageTitle);
    }

    async getItemCount(): Promise<number> {
        return await I.grabNumberOfVisibleElements(this.locators.wishlistItem);
    }

    async getItemTexts(): Promise<string[]> {
        const count = await this.getItemCount();
        if (count === 0) return [];
        return await I.grabTextFromAll(this.locators.wishlistItem);
    }

    removeFirstItem(): void {
        I.click(this.locators.removeButton);
    }

    /**
     * Poll until at least one wishlist item appears.
     * Wishlist creation/indexing can be eventually consistent;
     * this refreshes the page between attempts.
     */
    async pollUntilItemsAppear(maxAttempts: number = this.maxPollAttempts): Promise<{
        itemCount: number;
        itemTexts: string[];
    }> {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const rendered = await this.awaitWishlistRender();
            if (rendered) {
                const itemCount = await this.getItemCount();
                if (itemCount > 0) {
                    const itemTexts = await this.getItemTexts();
                    return { itemCount, itemTexts };
                }
            }

            if (attempt < maxAttempts) {
                I.refreshPage();
                I.seeInCurrentUrl(this.path);
            }
        }

        return { itemCount: 0, itemTexts: [] };
    }

    /**
     * Poll until wishlist item count matches the expected value.
     * Useful after add/remove operations where the backend is eventually consistent.
     */
    async pollUntilCount(expectedCount: number, maxAttempts: number = this.maxPollAttempts): Promise<number> {
        let itemCount = await this.getItemCount();

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (itemCount === expectedCount) {
                return itemCount;
            }

            I.refreshPage();
            I.seeInCurrentUrl(this.path);
            if (expectedCount > 0) {
                await this.awaitWishlistRender();
            }
            itemCount = await this.getItemCount();
        }

        return itemCount;
    }

    /**
     * Wait for wishlist item elements to render in the DOM after navigation or refresh.
     * Driven by actual DOM state rather than a hardcoded delay.
     */
    private async awaitWishlistRender(timeoutSeconds: number = 5): Promise<boolean> {
        try {
            await I.waitForElement(this.locators.wishlistItem, timeoutSeconds);
            return true;
        } catch {
            return false;
        }
    }
}

export = new AccountWishlistPage();
