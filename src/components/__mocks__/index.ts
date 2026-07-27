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

// Barrel for the shared Storybook + unit-test fixture set. Stories and tests
// can import from `@/components/__mocks__` directly when they want a curated
// fixture; deep imports (`@/components/__mocks__/basket-with-dress`) are still
// supported for fixtures that aren't re-exported here.

export { basketWithOneItem, inBasketProductDetails } from './basket-with-dress';
export { basketWithMultipleItems, inBasketMultipleItemDetails } from './basket-with-multiple-items';
export {
    basketWithBonusOpportunity,
    basketWithBonusOpportunityPartialSelection,
    basketWithBonusOpportunityAllSlotsFilled,
    basketWithMultipleBonusOpportunities,
    emptyBasketWithNoBonus,
    basketWithNonQualifyingProduct,
} from './basket-with-bonus';
export { default as basketWithGift } from './basket-with-gift';
export {
    basketWithInstallmentSchedule,
    basketWithSinglePayment,
    basketWithUnavailableSchedule,
} from './basket-with-payment-schedule';
export { default as basketWithPromoError } from './basket-with-promo-error';
export { mockCartLineProduct, type CartStoryProduct } from './cart-story-product';
export { default as emptyBasket } from './empty-basket';
export { checkoutWithMultipleItems, checkoutWithOneItem } from './checkout-data';
export { masterProduct } from './master-variant-product';
export { mockStandardProductOrderable } from './standard-product';
export { standardProd } from './standard-product-2';
export {
    mockProductSearchItem,
    mockProductSetHit,
    mockStandardProductHit,
    mockMasterProductHitWithOneVariant,
    mockMasterProductHitWithMultipleVariants,
} from './product-search-hit-data';
export { mockCategories, mockCategory } from './mock-data';
