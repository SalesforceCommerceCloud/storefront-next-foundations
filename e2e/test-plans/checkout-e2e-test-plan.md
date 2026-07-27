# Storefront Checkout E2E Test Plan

**Feature:** Storefront Checkout Tests

**Tags:** @core @checkout

**Test Data:** test-data/checkout.data.ts

## Test Setup

### Shared Flows
- `addToCartFlow` - Adds product to cart and navigates to checkout (supports `sitePrefix` option for multi-locale navigation)
- `loginFlow` - Logs in registered shopper
- `registeredShopperSetupFlow` - Creates registered shopper with full profile and saved addresses
- `beaconCaptureFlow` - Intercepts Einstein analytics beacons for assertion in analytics tests

### Page Objects
- `checkoutPage` - Main checkout page interactions
- `storefrontPage` - Storefront navigation and logout
- `accountAddressesPage` - Account address management

### Test Data
- `TEST_SHIPPING_ADDRESS` - Primary shipping address (US)
- `TEST_SHIPPING_ADDRESS_ALT` - Alternative shipping address (US)
- `TEST_PAYMENT` - Valid payment card details
- `TEST_PRODUCT_CATEGORIES.MENS_JACKETS` - Test product
- `generateTestEmail()` - Generate unique test emails
- `INVALID_TEST_DATA` - Invalid inputs for validation testing
- `TEST_LOCALE_CURRENCIES` - Locale/currency configs for multi-currency checkout tests (USD, GBP)

### Teardown
- Logout after any `@prefilled-checkout` tagged test
- Logout after any `@shipping-address` tagged test
- Logout after any `@registered-shopper` tagged test (in payment & step-navigation specs)

---

## Running the Tests

```bash
# All checkout tests
npm run test:e2e -- --grep '@checkout'

# By feature group
npm run test:e2e -- --grep '@guest-checkout'
npm run test:e2e -- --grep '@basket-context'
npm run test:e2e -- --grep '@billing-address'
npm run test:e2e -- --grep '@payment-validation'
npm run test:e2e -- --grep '@saved-payment'
npm run test:e2e -- --grep '@step-navigation'
npm run test:e2e -- --grep '@order-summary'
npm run test:e2e -- --grep '@shipping-method'
npm run test:e2e -- --grep '@checkout-registration'
npm run test:e2e -- --grep '@analytics'
npm run test:e2e -- --grep '@multi-currency'

# By shopper type
npm run test:e2e -- --grep '@guest-checkout'
npm run test:e2e -- --grep '@registered-shopper'

# Specific scenario
npm run test:e2e -- --grep 'Guest shopper completes checkout'
```

---

## Order Placement (Happy Path)

**Test Data:** TEST_SHIPPING_ADDRESS, TEST_PAYMENT, TEST_PRODUCT_CATEGORIES, generateTestEmail()

| # | Scenario | Tags | Test Steps | Validate |
|---|----------|------|-----------|----------|
| 1 | Guest shopper completes checkout and places order | @guest-checkout @place-order | 1. Add men's jacket product to cart and navigate to checkout<br/>2. Fill email field with unique guest email<br/>3. Fill phone field with TEST_SHIPPING_ADDRESS.phone<br/>4. Fill shipping address fields (firstName, lastName, address1, city, stateCode, postalCode)<br/>5. Click continue to advance to shipping method selection<br/>6. Select the first available shipping method<br/>7. Fill payment card fields (cardNumber, cardholderName, expiryDate, cvv)<br/>8. Click "Place Order" button | Checkout page loads with contact info section visible<br/>Order confirmation page displays<br/>Order number matches regex /^\d+$/ |
| 2 | Registered shopper completes checkout (email pre-fill fallback) | @registered-shopper @place-order | 1. Execute login flow with registered user credentials<br/>2. Add men's jacket product to cart and navigate to checkout<br/>3. Check if email is pre-filled from user profile<br/>4. If email not pre-filled, fill with generated email<br/>5. Fill phone field with TEST_SHIPPING_ADDRESS.phone<br/>6. Fill shipping address fields from TEST_SHIPPING_ADDRESS<br/>7. Click continue to advance to shipping method selection<br/>8. Select the first available shipping method<br/>9. Fill payment card fields from TEST_PAYMENT<br/>10. Click "Place Order" button | Checkout page loads<br/>Order confirmation page displays<br/>Order number matches regex /^\d+$/ |
| 3 | Registered shopper with full profile uses prefilled checkout | @registered-shopper @place-order @prefilled-checkout | 1. Execute registeredShopperSetupFlow (creates user with full profile)<br/>2. Add men's jacket product to cart and navigate to checkout<br/>3. Click continue to shipping method (no form entry needed)<br/>4. Select the first available shipping method<br/>5. Fill payment card fields from TEST_PAYMENT<br/>6. Click "Place Order" button<br/>7. After test completes, logout from storefront | Checkout page loads<br/>All contact info fields are pre-filled from user profile<br/>Shipping address is pre-filled from saved profile address<br/>Payment form displays with blank card fields<br/>Order confirmation page displays<br/>Order number matches regex /^\d+$/ |
| 4 | Guest checkout with multiple items in cart | @guest-checkout @place-order | 1. Add men's jacket product to cart<br/>2. Add women's dress product to cart<br/>3. Navigate to checkout<br/>4. Fill email with unique guest email<br/>5. Fill phone field with TEST_SHIPPING_ADDRESS.phone<br/>6. Fill shipping address fields from TEST_SHIPPING_ADDRESS<br/>7. Click continue to advance to shipping method selection<br/>8. Select the first available shipping method<br/>9. Fill payment card fields from TEST_PAYMENT<br/>10. Click "Place Order" button | Cart count shows correct number of items (2+)<br/>Checkout page displays all items in order summary<br/>Total price calculation is correct (sum of all items + shipping)<br/>Order confirmation page displays<br/>Order summary shows all items |
| 5 | Registered shopper checkout with saved shipping address | @registered-shopper @place-order | 1. Execute registeredShopperSetupFlow to create shopper with saved addresses<br/>2. Add men's jacket product to cart and navigate to checkout<br/>3. Expand shipping address section to reveal saved addresses list<br/>4. Select an alternative saved address from the list (radio button)<br/>5. Click continue to advance to shipping method<br/>6. Select first available shipping method<br/>7. Fill payment card fields from TEST_PAYMENT<br/>8. Click "Place Order" button | Checkout page loads with shipping address in preview mode<br/>Saved addresses list displays at least one address<br/>Selected address is now shown in the preview<br/>Order confirmation page displays<br/>Order summary shows the selected address |

---

## Basket & Navigation

**Test Data:** TEST_PRODUCT_CATEGORIES, TEST_PAYMENT

| # | Scenario | Tags | Test Steps | Validate |
|---|----------|------|-----------|----------|
| 6 | Basket context syncs when navigating to checkout | @basket-context @checkout-navigation | 1. Add men's jacket product to cart<br/>2. Navigate directly to checkout page using checkoutPage.navigate()<br/>3. Click to expand "My Cart" section on checkout page<br/>4. Wait for cart items to load (up to 20 seconds) | Checkout page loads<br/>Cart item count is at least 1<br/>Product name and details match the added product<br/>Product quantity and price are displayed correctly |
| 7 | Cart item count updates after removing item pre-checkout | @basket-context | 1. Add multiple products (2-3 items) to cart<br/>2. Navigate to checkout<br/>3. Expand "My Cart" section on checkout page<br/>4. Click remove button on one item in the cart list | Item is removed from checkout cart display<br/>Cart item count decrements by 1<br/>Order total is recalculated (shipping may change)<br/>Remaining items are still visible and correct |
| 8 | Navigating back from checkout preserves cart state | @basket-context @checkout-navigation | 1. Add product to cart (fill cart with specific quantity)<br/>2. Navigate to checkout<br/>3. Expand "My Cart" section and note initial item count<br/>4. Navigate back to storefront (click back button or navigate to home)<br/>5. Navigate back to checkout | Checkout page displays all items<br/>Cart count in header still shows the same number of items<br/>Checkout page displays the same items from before<br/>Item count matches initial count<br/>Contact info is cleared (not persisted between sessions)<br/>Shipping address fields are blank or pre-filled if user is logged in |

---

## Billing Address

**Test Data:** TEST_SHIPPING_ADDRESS, TEST_PAYMENT, TEST_PRODUCT_CATEGORIES, generateTestEmail(), INVALID_TEST_DATA

| # | Scenario | Tags | Test Steps | Validate |
|---|----------|------|-----------|----------|
| 9 | Billing address fields are blank when "Use a different billing address" is checked | @billing-address @guest-checkout | 1. Add men's jacket product to cart and navigate to checkout<br/>2. Fill email with unique guest email<br/>3. Fill phone field with TEST_SHIPPING_ADDRESS.phone<br/>4. Fill shipping address fields from TEST_SHIPPING_ADDRESS<br/>5. Click continue and select shipping method<br/>6. Click "Use a different billing address" checkbox to enable it<br/>7. Uncheck "Use a different billing address" checkbox | "Use a different billing address" checkbox is not checked by default<br/>Billing address fields are hidden by default<br/>Billing address fields become visible after checking<br/>All billing address fields are completely blank<br/>NO values from shipping address are copied to billing address<br/>Billing address fields are hidden after unchecking |
| 10 | Billing fields are hidden by default (shipping address used) | @billing-address @guest-checkout | 1. Add men's jacket product to cart and navigate to checkout<br/>2. Fill email and phone fields<br/>3. Fill shipping address fields from TEST_SHIPPING_ADDRESS<br/>4. Click continue to advance to shipping method<br/>5. Select first available shipping method<br/>6. Fill payment card fields and place order | "Use a different billing address" checkbox is NOT checked<br/>Billing address section/fields are NOT visible on payment step<br/>Payment info fields are clearly visible<br/>Order confirmation displays (proving billing defaulted to shipping) |
| 11 | Guest can fill custom billing address and place order | @billing-address @custom-billing @guest-checkout @place-order | 1. Add men's jacket product to cart and navigate to checkout<br/>2. Fill email with unique guest email<br/>3. Fill phone field with TEST_SHIPPING_ADDRESS.phone<br/>4. Fill shipping address with TEST_SHIPPING_ADDRESS<br/>5. Click continue and select shipping method<br/>6. Check "Use a different billing address" checkbox<br/>7. Uncheck "Use a different billing address" to reset state<br/>8. Check "Use a different billing address" again<br/>9. Fill billing address with custom data (firstName: Jane, lastName: Smith, address1: 456 Billing Ave, city: Los Angeles, stateCode: CA, postalCode: 90001)<br/>10. Fill payment card fields from TEST_PAYMENT<br/>11. Click "Place Order" button | Billing address fields are now visible and blank after first check<br/>Billing fields become hidden after unchecking<br/>Billing fields are still blank (not auto-filled) after second check<br/>Order confirmation page displays<br/>Order number matches regex /^\d+$/ |
| 12 | Registered shopper can use different billing address | @billing-address @registered-shopper | 1. Execute registeredShopperSetupFlow to create shopper<br/>2. Add men's jacket product to cart and navigate to checkout<br/>3. Check "Use a different billing address" checkbox<br/>4. Fill billing address fields with different address from shipping<br/>5. Click continue to shipping method<br/>6. Select first available shipping method<br/>7. Fill payment card fields from TEST_PAYMENT<br/>8. Click "Place Order" button | Checkout page loads with pre-filled email and address<br/>"Use a different billing address" checkbox is not checked initially<br/>Billing address fields become visible and are blank<br/>Order confirmation page displays<br/>Order summary shows custom billing address (not shipping address) |
| 13 | Billing address is saved when registered shopper uses different billing address | @billing-address-persistence @registered-shopper @place-order | 1. Execute registeredShopperSetupFlow to create shopper with saved address<br/>2. Add men's jacket product to cart and navigate to checkout<br/>3. Use saved shipping address (from setup)<br/>4. Select shipping method<br/>5. Check "Use a different billing address" checkbox<br/>6. Fill custom billing address (different from shipping)<br/>7. Fill payment card fields from TEST_PAYMENT<br/>8. Click "Place Order" button<br/>9. Navigate to /account/addresses<br/>10. Verify custom billing address now appears in saved addresses | Order confirmation page displays<br/>At least 2 addresses now saved in account (original shipping + new billing)<br/>Custom billing address is visible in account addresses list<br/>Billing address details match what was entered during checkout |
| 14 | Billing address not duplicated when already saved | @billing-address-persistence @registered-shopper @place-order | 1. Execute registeredShopperSetupFlow with one saved address<br/>2. Add second address to profile via /account/addresses (verify count=2)<br/>3. Add product to cart and navigate to checkout<br/>4. Use new shipping address (different from both saved)<br/>5. Check "Use a different billing address" checkbox<br/>6. Fill billing address with one of the already-saved addresses<br/>7. Complete checkout with payment<br/>8. Navigate to /account/addresses<br/>9. Verify address count remained at 2 (no duplicate created) | Address count after setup: 2<br/>Address count after checkout: still 2 (not incremented)<br/>No duplicate address created<br/>Order confirmation displays successfully |
| 15 | Billing address not saved when using shipping address as billing | @billing-address-persistence @registered-shopper @place-order | 1. Execute registeredShopperSetupFlow with 1 saved address<br/>2. Get initial address count from /account/addresses<br/>3. Add product to cart and navigate to checkout<br/>4. Use saved shipping address<br/>5. Verify "Use a different billing address" is NOT checked by default<br/>6. Proceed through checkout with payment<br/>7. Navigate to /account/addresses<br/>8. Verify address count unchanged (no new billing address saved) | Initial address count: 1<br/>Final address count: 1 (unchanged)<br/>No new address persisted to profile<br/>Order confirmation displays |
| 16 | Billing address validation — required fields show errors | @billing-address @validation | 1. Add men's jacket product to cart and navigate to checkout<br/>2. Fill email and phone fields<br/>3. Fill shipping address fields from TEST_SHIPPING_ADDRESS<br/>4. Click continue and select shipping method<br/>5. Check "Use a different billing address" checkbox<br/>6. Leave all billing address fields empty<br/>7. Fill payment card fields from TEST_PAYMENT<br/>8. Click "Place Order" button<br/>9. Fill one required field (e.g., firstName) and leave others blank<br/>10. Click "Place Order" again | Validation errors appear for each required billing field (firstName, lastName, address1, city, state, postal code)<br/>Error messages are inline/near the field<br/>User remains on checkout page (order not placed)<br/>URL still includes /checkout (not redirected)<br/>Errors remain for unfilled required fields<br/>Only firstName error is gone after filling it |

---

## Payment Validation

**Test Data:** TEST_SHIPPING_ADDRESS, TEST_PAYMENT, TEST_PRODUCT_CATEGORIES, INVALID_TEST_DATA, generateTestEmail()

| # | Scenario | Tags | Test Steps | Validate |
|---|----------|------|-----------|----------|
| 14 | Place order blocked when payment fields are empty | @payment-validation @guest-checkout | 1. Add men's jacket product to cart and navigate to checkout<br/>2. Fill email with unique guest email<br/>3. Fill phone field with TEST_SHIPPING_ADDRESS.phone<br/>4. Fill shipping address fields from TEST_SHIPPING_ADDRESS<br/>5. Click continue and select first available shipping method<br/>6. Leave all payment fields blank (cardNumber, cardholderName, expiryDate, cvv)<br/>7. Click "Place Order" button | Payment section displays with empty card fields<br/>Validation errors appear for payment fields (wait up to 3 seconds)<br/>Error count is greater than 0<br/>Current URL still contains /checkout (order not placed)<br/>Current URL does not contain /order-confirmation<br/>User can correct errors and retry |
| 15 | Invalid card number shows inline error | @payment-validation | 1. Add men's jacket product to cart and navigate to checkout<br/>2. Fill email, phone, and shipping address fields<br/>3. Click continue and select shipping method<br/>4. Fill cardholderName with TEST_PAYMENT.cardholderName<br/>5. Fill card number with invalid/short card number (INVALID_TEST_DATA.SHORT_CARD_NUMBER)<br/>6. Fill expiryDate with TEST_PAYMENT.expiryDate<br/>7. Fill CVV with TEST_PAYMENT.cvv<br/>8. Click "Place Order" button<br/>9. Clear card number field and enter valid card number from TEST_PAYMENT<br/>10. Click "Place Order" again | Validation error appears inline for card number field<br/>Error message indicates invalid card number format<br/>Order is NOT placed (URL still /checkout, not /order-confirmation)<br/>Order completes successfully after correction |
| 16 | Expired card date shows inline error | @payment-validation | 1. Add men's jacket product to cart and navigate to checkout<br/>2. Fill email, phone, and shipping address fields<br/>3. Click continue and select shipping method<br/>4. Fill payment form fields: cardNumber, cardholderName from TEST_PAYMENT<br/>5. Fill expiryDate with INVALID_TEST_DATA.EXPIRED_CARD_DATE (e.g., "01/20")<br/>6. Fill CVV with INVALID_TEST_DATA.CVV (invalid CVV)<br/>7. Click "Place Order" button<br/>8. Update expiry date to valid future date from TEST_PAYMENT<br/>9. Update CVV to valid value from TEST_PAYMENT.cvv<br/>10. Click "Place Order" again | Validation error appears inline for expiry date field<br/>Error message indicates expired or invalid expiry date<br/>Order is NOT placed (URL still /checkout)<br/>Order completes successfully after correction |
| 17 | Invalid CVV shows inline error | @payment-validation | 1. Add men's jacket product to cart and navigate to checkout<br/>2. Fill email, phone, and shipping address fields<br/>3. Click continue and select shipping method<br/>4. Fill cardNumber and cardholderName from TEST_PAYMENT<br/>5. Fill expiryDate with TEST_PAYMENT.expiryDate<br/>6. Fill CVV with invalid value from INVALID_TEST_DATA.CVV (e.g., "12" or "ABCD")<br/>7. Click "Place Order" button<br/>8. Clear CVV and enter valid CVV from TEST_PAYMENT.cvv<br/>9. Click "Place Order" again | Validation error appears inline for CVV field<br/>Error message indicates invalid CVV format<br/>Order is NOT placed (URL still /checkout)<br/>Order completes successfully after correction |

---

## Saved Payment Methods

**Test Data:** TEST_PRODUCT_CATEGORIES

| # | Scenario | Tags | Test Steps | Validate |
|---|----------|------|-----------|----------|
| 18 | Registered shopper can place order with saved payment method | @registered-shopper @saved-payment @place-order | 1. Execute registeredShopperSetupFlow (creates user with saved address + payment)<br/>2. Add men's jacket product to cart and navigate to checkout<br/>3. Validate all checkout sections are prefilled (payment in preview mode)<br/>4. Verify payment preview shows saved card info<br/>5. Click "Place Order" (no card fields needed)<br/>6. Logout after test | Checkout page loads with all sections prefilled<br/>Payment section is in preview mode with saved card<br/>Payment preview text is non-empty<br/>Order confirmation page displays<br/>Order number matches regex /^\d+$/ |

---

## Step Navigation

**Test Data:** TEST_PRODUCT_CATEGORIES

| # | Scenario | Tags | Test Steps | Validate |
|---|----------|------|-----------|----------|
| 19 | Registered shopper can edit shipping address and continue checkout | @registered-shopper @step-navigation | 1. Execute registeredShopperSetupFlow (creates user with saved address)<br/>2. Add men's jacket product to cart and navigate to checkout<br/>3. Verify shipping address is in preview mode (auto-applied)<br/>4. Click Edit on shipping address to expand saved addresses list<br/>5. Verify saved addresses list is visible with radio buttons<br/>6. Click "Continue to Shipping Method" to re-submit<br/>7. Verify shipping options step advances (Edit button appears)<br/>8. Verify payment section is reachable<br/>9. Logout after test | Shipping address starts in preview mode<br/>Saved addresses list is visible after expanding<br/>Shipping options advance to preview mode after re-submit<br/>Payment section is visible and reachable |

---

## Order Summary

**Test Data:** TEST_SHIPPING_ADDRESS, TEST_PRODUCT_CATEGORIES, generateTestEmail()

| # | Scenario | Tags | Test Steps | Validate |
|---|----------|------|-----------|----------|
| 20 | Order summary displays subtotal, shipping, tax, and total | @order-summary @guest-checkout | 1. Add men's jacket product to cart and navigate to checkout<br/>2. Verify order summary container is visible<br/>3. Verify summary includes Subtotal, Shipping, Tax, and Total labels<br/>4. Verify at least one currency value is present<br/>5. Fill contact info, shipping address, and select shipping method<br/>6. Verify order summary still visible with currency value at payment step | Order summary container is visible on checkout page<br/>Summary text includes Subtotal, Shipping, Tax, and Total<br/>At least one currency amount (any of $, £, €, ¥) is present<br/>Order summary persists through checkout steps |

---

## Shipping Method Selection

**Test Data:** TEST_SHIPPING_ADDRESS, TEST_PRODUCT_CATEGORIES, generateTestEmail()

| # | Scenario | Tags | Test Steps | Validate |
|---|----------|------|-----------|----------|
| 21 | Guest shopper can view and select different shipping methods | @shipping-method @guest-checkout | 1. Add men's jacket product to cart and navigate to checkout<br/>2. Fill contact info and shipping address<br/>3. Wait for shipping method radios to appear<br/>4. Count visible shipping method options<br/>5. Verify shipping method names/prices are displayed<br/>6. Select a shipping method (second option if available, otherwise first)<br/>7. Verify payment step is reached | At least one shipping method is available<br/>Shipping method names/prices text is non-empty<br/>Payment content section is visible after selection |

---

## Multi-Currency Checkout

**Test Data:** TEST_LOCALE_CURRENCIES, TEST_PAYMENT, TEST_PRODUCT_CATEGORIES, generateTestEmail()

These tests validate that checkout works correctly across different locales and currencies. Each scenario uses `addToCartFlow.executeAndNavigateToCheckout()` with the `sitePrefix` option (e.g., `/us/en-US`) so product browsing and checkout both happen under the correct locale. The test then completes the full guest checkout flow via `checkoutPage.completeCheckout()`.

**Note:** These tests pass `sitePrefix` to `addToCartFlow` instead of using `buildSitePath()`, because they intentionally switch between different locale contexts within the same test run. The `buildSitePath()` utility reads from env vars (`SITE_ALIAS`, `LOCALE`) which are fixed for the test session.

| # | Scenario | Tags | Test Steps | Validate |
|---|----------|------|-----------|----------|
| 25 | Guest shopper completes checkout in USD | @multi-currency @usd @guest-checkout @place-order | 1. Use `addToCartFlow.executeAndNavigateToCheckout()` with `sitePrefix: '/us/en-US'` to add product and navigate to checkout<br/>2. Verify order summary shows USD currency symbol ($)<br/>3. Complete checkout via `checkoutPage.completeCheckout()` with US shipping address<br/>4. Verify confirmation page shows USD currency values | Add to cart succeeds<br/>Order summary displays `$` currency values<br/>Order number matches regex /^\d+$/<br/>Confirmation page shows `$` currency values |
| 26 | Guest shopper completes checkout in GBP | @multi-currency @gbp @guest-checkout @place-order | 1. Use `addToCartFlow.executeAndNavigateToCheckout()` with `sitePrefix: '/global/en-GB'` to add product and navigate to checkout<br/>2. Verify order summary shows GBP currency symbol (£)<br/>3. Complete checkout via `checkoutPage.completeCheckout()` with UK shipping address<br/>4. Verify confirmation page shows GBP currency values | Add to cart succeeds<br/>Order summary displays `£` currency values<br/>Order number matches regex /^\d+$/<br/>Confirmation page shows `£` currency values |

**Extending to more currencies:** Add entries to `TEST_LOCALE_CURRENCIES` in `checkout.data.ts` with the appropriate `siteAlias`, `locale`, `currencyPattern`, and `shippingAddress`. The data-driven test in `checkout-multi-currency.spec.ts` will automatically generate a scenario for each entry.

---

## Checkout Registration with Email Verification

**Test Data:** TEST_SHIPPING_ADDRESS, TEST_PAYMENT, TEST_PRODUCT_CATEGORIES, generateTestEmail()

These tests validate the "Create account for faster checkout" flow, which triggers an OTP (one-time password) modal during guest checkout. If the test environment does not support passwordless auth, the flow gracefully falls back.

| # | Scenario | Tags | Test Steps | Validate |
|---|----------|------|-----------|----------|
| 29 | Guest creates account during checkout with email verification | @guest-checkout @checkout-registration @otp-modal | 1. Add product to cart and navigate to checkout<br/>2. Fill contact info, shipping address, shipping method, payment fields<br/>3. Check "Create account for faster checkout" checkbox<br/>4. Wait for OTP modal or error<br/>5. If OTP modal appears, click "Checkout as Guest" to dismiss<br/>6. Click "Place Order" | OTP modal displays verification instructions (if API available)<br/>OTP modal closes after guest checkout click<br/>Order confirmation page displays with order number |
| 30 | Guest can resend OTP code during checkout registration | @guest-checkout @checkout-registration @otp-resend | 1. Add product to cart and navigate to checkout<br/>2. Fill all checkout steps and payment fields<br/>3. Check "Create account" checkbox to trigger OTP<br/>4. If OTP modal appears, click "Resend Code"<br/>5. Verify resend cooldown message<br/>6. Click "Checkout as Guest" to dismiss modal<br/>7. Click "Place Order" | Resend Code triggers cooldown ("Resend in...")<br/>OTP modal closes<br/>Order confirmation page displays |
| 31 | Guest can cancel account registration and checkout as guest | @guest-checkout @checkout-registration @cancel-registration | 1. Add product to cart and navigate to checkout<br/>2. Fill all checkout steps and payment fields<br/>3. Check "Create account" checkbox to trigger OTP<br/>4. If OTP modal appears, click "Checkout as Guest"<br/>5. Verify "Create account" checkbox is unchecked<br/>6. Click "Place Order" | OTP modal closes<br/>Create account checkbox is unchecked after dismissal<br/>Order confirmation page displays with order number |
| 32 | Guest sees error message if registration initiation fails | @guest-checkout @checkout-registration @error-handling | 1. Add product to cart and navigate to checkout<br/>2. Fill all checkout steps and payment fields<br/>3. Check "Create account" checkbox<br/>4. Wait for OTP modal or error response<br/>5. If OTP appears, dismiss and proceed<br/>6. Click "Place Order" | Order can still be placed regardless of registration outcome<br/>Order confirmation page displays |
| 33 | Save payment checkbox is hidden after account creation during checkout | @guest-checkout @checkout-registration @save-payment-checkbox @hide-save-payment | 1. Add product to cart and navigate to checkout<br/>2. Fill contact info, shipping address, shipping method, and payment fields<br/>3. Verify "Save payment for future use" checkbox is visible<br/>4. Check "Create account for faster checkout" checkbox<br/>5. Wait for and complete OTP verification<br/>6. Verify "Save payment" checkbox is now hidden<br/>7. Click "Place Order" to complete checkout | "Save payment" checkbox visible before account creation<br/>After OTP verification, checkbox becomes hidden<br/>Order confirmation page displays |
| 34 | Save payment checkbox remains visible when guest declines account creation | @guest-checkout @checkout-registration @save-payment-checkbox @keep-save-payment | 1. Add product to cart and navigate to checkout<br/>2. Fill contact info, shipping address, shipping method, and payment fields<br/>3. Verify "Save payment" checkbox is visible<br/>4. Check "Create account" checkbox to trigger OTP modal<br/>5. If OTP modal appears, click "Proceed as Guest" to decline account creation<br/>6. Verify "Save payment" checkbox is still visible<br/>7. Click "Place Order" | "Save payment" checkbox visible initially<br/>OTP modal appears when account checkbox is checked<br/>After declining account creation, checkbox remains visible<br/>Order confirmation page displays |

---

## Checkout Analytics

**Test Data:** TEST_PRODUCT_CATEGORIES, generateTestEmail()

These tests validate that Einstein analytics beacons include the correct `checkoutType` attribute. They use `beaconCaptureFlow` to intercept `navigator.sendBeacon` calls before page navigation.

| # | Scenario | Tags | Test Steps | Validate |
|---|----------|------|-----------|----------|
| 27 | Checkout start event includes checkoutType attribute | @analytics @checkout-start | 1. Set up beacon interception for 'beginCheckout' via `beaconCaptureFlow`<br/>2. Accept tracking consent<br/>3. Add product to cart and navigate to checkout<br/>4. Retrieve captured beacons | At least one beacon is captured<br/>A `beginCheckout` beacon exists<br/>`checkoutType` is `'one-click'` |
| 28 | Checkout step event includes checkoutType attribute | @analytics @checkout-step | 1. Set up beacon interception for 'checkoutStep' via `beaconCaptureFlow`<br/>2. Accept tracking consent<br/>3. Add product to cart and navigate to checkout<br/>4. Fill contact info to trigger a checkout step event<br/>5. Retrieve captured beacons | At least one beacon is captured<br/>A `checkoutStep` beacon exists<br/>`checkoutType` is `'one-click'` |

---

## Edge Cases & Error Handling

**Test Data:** TEST_PRODUCT_CATEGORIES

| # | Scenario | Tags | Test Steps | Validate |
|---|----------|------|-----------|----------|
| 22 | Out-of-stock item in cart — user is notified before placing order | @inventory @error-handling | 1. Add product to cart that is close to stock limit<br/>2. Navigate to checkout<br/>3. Complete all form fields (contact, shipping, payment)<br/>4. (Backend: Simulate inventory decrement via API or admin action)<br/>5. Click "Place Order" button | Error message displays indicating item is out of stock<br/>Error appears BEFORE order is placed (not after)<br/>User is given option to remove item or go back to cart<br/>Cart state can be edited after receiving error<br/>Order was NOT created |
| 23 | Session expires mid-checkout — graceful handling | @session @error-handling | 1. Execute loginFlow to log in as registered shopper<br/>2. Add product to cart and navigate to checkout<br/>3. Fill contact info and shipping address<br/>4. (Backend: Invalidate user session or auth token)<br/>5. Continue to shipping method selection<br/>6. Attempt to click continue or place order<br/>7. Log back in | User is gracefully redirected to login page (not error page)<br/>Cart state is preserved (user can log back in and cart still exists)<br/>Informative message explains session expired<br/>Cart and any saved form data is still available after login |
| 24 | Network failure during order placement — error shown, no duplicate order | @error-handling | 1. Add product to cart and navigate to checkout<br/>2. Fill all required fields (contact, shipping, payment)<br/>3. (Network: Intercept/block network request during order placement)<br/>4. Click "Place Order" button<br/>5. Restore network connectivity<br/>6. Click "Place Order" again | Network error is caught and displayed to user<br/>Error message is clear and actionable (e.g., "Network error, please try again")<br/>User remains on checkout page with form data intact<br/>NO order was created in the system (Backend verification)<br/>Order is placed successfully after retry<br/>ONLY ONE order exists, not duplicates (Backend verification) |
