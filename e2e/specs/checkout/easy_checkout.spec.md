---
title: Easy Checkout
domain: checkout
status: draft
version: 1.0
created: 2026-04-02
last_updated: 2026-04-02
author: @commerce-emu/1c-stretch-armstrong
---

# Easy Checkout

## Overview

A frictionless checkout experience for guests and registered users, supporting multiple payment methods, flexible billing options, promo codes, and post-purchase account creation. The checkout flow is optimized for conversion with minimal steps, real-time validation, clear error handling, and comprehensive order review before final submission.

---

## Part 1: Guest Checkout Flow

### AC1: Guest can complete checkout without account
- [ ] Guest can enter email without being forced to create account
- [ ] Contact info → Shipping → Payment → Review → Confirmation flow completes successfully
- [ ] Order is created in Salesforce Commerce Cloud
- [ ] Order confirmation is displayed to guest
- [ ] Guest can proceed as guest without account creation blocking the flow
- [ ] Guest session cart persists through entire checkout flow
- [ ] Order number is returned after successful order creation

**Details:**
- Email must be captured but account creation is optional, not mandatory
- Guest session cart persists through entire checkout flow
- Post-checkout, guest can optionally create account (separate UX)

### AC2: Email validation on contact info
- [ ] Invalid email format shows inline validation error
- [ ] Valid email format allows proceeding to next step
- [ ] Empty email field shows required field error
- [ ] Email is trimmed of leading/trailing whitespace before submission

**Details:**
- Valid format: `user@domain.com`
- Validation timing: On blur or submit, not keystroke
- Error message: "Please enter a valid email address"

### AC3: Shipping address collection and validation
- [ ] Guest can enter full shipping address (street, city, state, zip, country)
- [ ] Address is validated against SFCC shipping provider
- [ ] Valid addresses proceed to payment step
- [ ] Invalid addresses show error with suggestions or allow manual override
- [ ] All address fields are required

**Details:**
- Country and state/province must match supported shipping regions
- Shipping rates are fetched from backend after address validation
- If validation fails, show "Address not recognized" and allow edit or manual entry

### AC3a: Save payment option before account creation
- [ ] Checkbox visible before account creation via OTP
- [ ] Checkbox remains visible if guest declines account creation
- [ ] Checkbox is hidden if guest accepts account creation (payment auto-saved)

---

## Part 2: Billing Address Management

### AC4: Customer can use shipping address as billing address
- [ ] Checkbox available to "Bill to shipping address" (default: checked)
- [ ] When checked, billing address form is hidden
- [ ] When unchecked, billing address form appears
- [ ] Checkbox state persists as user navigates checkout steps

### AC5: Customer can enter different billing address
- [ ] All address fields are present (street, city, state, zip, country)
- [ ] Address fields validate independently from shipping address
- [ ] Address validation follows same rules as shipping (USPS/provider rules)
- [ ] Customer can proceed with invalid billing address if they manually confirm

### AC6: Billing address validation and suggestions
- [ ] Invalid address shows error with suggestions
- [ ] Suggestions are clickable and auto-fill form
- [ ] Customer can override suggestions
- [ ] Empty required fields show validation error

### AC7: International billing addresses
- [ ] Country selector shows all supported countries
- [ ] Postal code validation adapts to selected country
- [ ] State/province field shows for countries that require it
- [ ] Non-US addresses are properly formatted and stored

---

## Part 3: Payment Methods

### AC8: Customer can enter credit/debit card details
- [ ] Card form collects: card number, expiry, CVV, cardholder name
- [ ] All fields validate in real-time (card type detection, expiry format, CVV length)
- [ ] Card number field masks input for security
- [ ] CVV field is separate and clearly labeled
- [ ] Card type detected automatically (Visa, Mastercard, Amex, Discover)

### AC9: Card validation and error handling
- [ ] Invalid card number shows error (Luhn check)
- [ ] Expired card shows error
- [ ] Invalid CVV shows error (length validation)
- [ ] All errors are recoverable — user can correct and retry
- [ ] Keyboard enters form without submitting (Tab navigation)
- [ ] Guest can retry payment up to 3 times before being blocked

**Details:**
- Form uses Stripe Elements for PCI Level 1 compliance
- Card data never touches storefront backend
- Declined card → Show "Payment declined. Please try another card." and allow retry
- After 3 failed attempts → Show "Too many failed attempts. Please try again later."

### AC10: Save payment method for registered users
- [ ] Checkbox available: "Save this card for future purchases"
- [ ] Checkbox hidden for guest checkout (or shown but disabled with explanation)
- [ ] Checkbox hidden if user declines account registration during checkout
- [ ] Saved card label shows last 4 digits and card type (e.g., "Visa ending in 4242")

### AC11: Use saved payment method
- [ ] Registered users see list of saved cards before entering new card
- [ ] User can select saved card without re-entering details
- [ ] User can choose to enter new card instead of saved card
- [ ] Saved card can be used without re-entering CVV (3D Secure may override)
- [ ] Security note shown: "Saved cards are secure and encrypted"

### AC12: Payment processing and feedback
- [ ] Loading indicator shown during payment processing
- [ ] Payment timeout after 30 seconds shows error
- [ ] Failed payment shows error message with retry option
- [ ] Successful payment proceeds to order confirmation
- [ ] No double-submit (form disabled during processing)
- [ ] Payment timeout triggers auto-retry once, then shows error

**Details:**
- Timeout for payment processing: 30 seconds
- Auto-retry once on timeout, then show error with manual retry option

---

## Part 4: Order Review Before Submission

### AC13: Review page displays all order details
- [ ] Product items shown with image, name, quantity, price per unit, line total
- [ ] Shipping address displayed in full format
- [ ] Billing address displayed (only if different from shipping)
- [ ] Shipping method displayed (e.g., "Standard (5-7 days) - $9.99")
- [ ] Payment method shown as masked card (last 4 digits, card type)
- [ ] Order total calculated and displayed (subtotal, shipping, tax, total)

### AC14: Customer can edit details from review page
- [ ] "Edit" link/button next to each section (items, addresses, shipping, payment)
- [ ] Clicking "Edit" navigates back to that step (modal or full page)
- [ ] After edit, returns to review page with updated details
- [ ] Changes reflected in order total immediately
- [ ] Cart quantity can be modified from review (remove, change quantity)

### AC15: Promo code display and modification
- [ ] Applied promo code shown with discount amount
- [ ] "Change" link allows editing/removing promo code
- [ ] Promo code field allows adding new code without clearing previous
- [ ] Invalid codes show error immediately
- [ ] Successful code updates total automatically

### AC16: Order summary calculation accuracy
- [ ] Subtotal = sum of all line items
- [ ] Tax calculated correctly based on shipping address
- [ ] Shipping cost matches selected shipping method
- [ ] Discount applied correctly (promo code, bulk discount, etc.)
- [ ] Final total = subtotal + tax + shipping - discount

### AC17: Submit order with confirmation
- [ ] "Place Order" button is clear and prominent
- [ ] Clicking button submits payment and creates order
- [ ] Loading state shown during submission
- [ ] Success redirects to order confirmation
- [ ] Error shows message and returns to review (order not placed)
- [ ] Order confirmation page displays order number, summary, and email confirmation notice
- [ ] Order confirmation email sent immediately to guest email

**Details:**
- Email contains order number, tracking info (if available), and return policy
- Confirmation page includes call-to-action to create account (optional)
- Guest remains logged out after confirmation
- Guest can view order in email without logging in (via unique link)

---

## Part 5: Promo Code Application

### AC18: Customer can enter and apply promo code
- [ ] Promo code input field available in checkout (cart or payment step)
- [ ] Field accepts alphanumeric codes (case-insensitive)
- [ ] "Apply Code" button submits code for validation
- [ ] Valid code is accepted and applied
- [ ] Code is retained if user navigates to other checkout steps

### AC19: Valid code displays discount information
- [ ] Applied code shown as label/badge (e.g., "SUMMER2026")
- [ ] Discount amount displayed clearly (e.g., "-$10.00" or "-10%")
- [ ] Discount reflected in order total immediately
- [ ] Code description shown if available (e.g., "Summer sale: 10% off")
- [ ] "Remove Code" option available if code applied

### AC20: Invalid code shows clear error
- [ ] Non-existent code shows error: "Code not found"
- [ ] Expired code shows error: "This code has expired"
- [ ] Code with usage limit exceeded shows error: "This code has reached its usage limit"
- [ ] Code with restrictions shows error: "This code cannot be applied to your order" (if restriction applies)
- [ ] Error shown immediately, allows user to enter different code

### AC21: Code validation rules enforcement
- [ ] Minimum order amount required (if applicable) — show error if order under minimum
- [ ] Specific product/category required (if applicable) — validate cart items
- [ ] First-time customer only (if applicable) — show error for returning customers
- [ ] Code can only be used once per customer (if applicable) — check against customer history
- [ ] Code only valid during specific time period (if applicable) — validate against current date

### AC22: Multiple codes and restrictions
- [ ] Only one code can be active at a time (or allow stack if rules allow)
- [ ] When new code applied, previous code replaced (show confirmation)
- [ ] Removing code recalculates total without discount
- [ ] Code removal does NOT clear cart
- [ ] Clear error shown if code incompatible with current cart state

---

## Part 6: Guest Registration During Checkout

### AC23: Guest sees registration prompt after payment success
- [ ] Registration prompt shown after order confirmation
- [ ] Prompt clearly states benefits (saved addresses, order history, faster checkout)
- [ ] Guest can dismiss prompt without creating account
- [ ] Prompt not shown if guest already has account
- [ ] Prompt includes email field pre-filled with checkout email

### AC24: Guest can create account via OTP
- [ ] Guest enters password (with strength requirements: min 8 chars, uppercase, number, special char)
- [ ] Password confirmation field validates match
- [ ] Submit triggers OTP sent to checkout email
- [ ] OTP entry form appears after email verification sent
- [ ] Guest enters 6-digit OTP received via email

### AC25: Account creation completes successfully
- [ ] After OTP verification, account is created
- [ ] Email is verified and account is active
- [ ] Checkout email and password can log in immediately
- [ ] Order is linked to newly created account
- [ ] Past orders not accessible to new account (only current order)

### AC26: Saved data transfers to account
- [ ] Shipping address used in checkout is saved to account
- [ ] Billing address (if different) is saved to account
- [ ] Payment card is NOT saved (PCI compliance)
- [ ] Account dashboard shows saved addresses and current order

### AC27: Error handling and recovery
- [ ] Invalid password shows requirements (real-time feedback)
- [ ] OTP timeout after 10 minutes (resend available)
- [ ] Invalid OTP shows error, allows retry (max 3 attempts)
- [ ] User can go back and change email before OTP sent
- [ ] Network errors during account creation show recovery options

### AC28: Gift Message
- [ ] Gift message field is displayed in cart for each line item
- [ ] Field is optional (order can be placed without it)
- [ ] Character limit of 256 characters is enforced
- [ ] Character counter shows remaining characters
- [ ] Gift message persists when cart is updated
- [ ] Gift message is displayed (read-only) in checkout review
- [ ] Gift message is included in order submission via SCAPI
- [ ] Field shows validation error if limit exceeded

**Details:**
- Label: "Gift Message (Optional)"
- Placeholder: "Add a personal message to this item"
- Max length: 256 characters
- Error message: "Gift message cannot exceed 256 characters"
- Character counter format: "256 characters remaining"
- SCAPI field: `giftMessage` on basket product items
- Field should persist when cart is recalculated
- In checkout, gift message displays read-only in "My Cart" accordion

---

## Feature Logic

### Key Behaviors

**1. Contact Info Step**: Collect email and phone (phone optional)
   - Email is required
   - Phone is optional
   - No account check at this stage (guest can proceed with any email)
   - Unique email per checkout session (prevent duplicate orders)

**2. Shipping Step**: Address collection and validation
   - Collect street, city, state, zip, country
   - Validate address against shipping provider rules
   - Show address suggestions if validation fails
   - Allow manual override if guest prefers

**3. Shipping Method Selection**:
   - Display available shipping methods with cost and estimated delivery
   - Allow customer to select preferred method
   - Recalculate totals based on selection
   - Update tax if shipping address impacts tax calculation

**4. Billing Address** (toggle):
   - Default: "Bill to shipping address" (most common case)
   - When checked: billing form hidden, shipping address used
   - When unchecked: separate billing form displayed
   - Validate independently from shipping address

**5. Payment Step**: PCI-compliant payment collection
   - Use Stripe Elements for tokenized payment
   - Collect card details, never stored on storefront
   - Show optional account creation OTP prompt
   - Allow guest to proceed with or without account

**6. Order Review**: Final verification before submission
   - Display all order details (items, addresses, shipping, payment, totals)
   - Allow editing each section (modals or back-navigation)
   - Apply and display promo codes
   - Recalculate totals based on changes

**7. Order Confirmation**: Display order details
   - Show order number, total, items
   - Send order confirmation email to guest email address
   - Order is immediately confirmed (no additional verification needed)

**8. Post-Purchase Account Creation** (optional):
   - Show benefits of account creation
   - Collect password (with strength validation)
   - Send OTP to verify email
   - Create account after OTP verification
   - Link order to new account

### State Management

- **Cart**: Persists across sessions (independent of checkout state). Survives logout.
- **Checkout session**: Temporary. Includes contact info, shipping address, selected shipping method.
- **Checkout session timeout**: 30 minutes of inactivity → Session cleared, cart preserved.
- **Contact info**: Does NOT persist between sessions (guest state is ephemeral)
- **Payment token**: Sent to backend, never stored on client
- **Billing address choice**: Persists throughout checkout flow
- **Promo code**: Applied to checkout session, recalculated on cart changes
- **Order data**: Persists indefinitely after order placement (in SFCC backend)
- **Order**: Confirmed immediately upon successful payment
- **Account**: Created only after OTP verification in post-purchase flow
- **Guest email**: Cannot place duplicate orders within 24 hours (fraud prevention)

### Edge Cases

**1. Invalid Email Format**
   - Show validation error → Prevent submission

**2. Duplicate Order (Same Email Within 24h)**
   - Show warning → Allow override with confirmation

**3. Address Validation Fails**
   - Show "Could not validate address" + suggestions → Allow manual entry

**4. Shipping Provider Timeout (>5s)**
   - Show error "Unable to calculate shipping. Please try again."

**5. Invalid Card**
   - Show error → Allow retry (3 attempts max) → Then show "Too many attempts" + support contact info

**6. Card Declined**
   - Show "Payment declined" + brief reason (if available) → Allow retry

**7. 3 Payment Failures**
   - Show "Too many attempts" + support contact info

**8. Payment Timeout (>30s)**
   - Auto-retry once → Then show error with retry button

**9. Network Interrupted During Order Submission**
   - Show "Order status unknown" + order lookup guidance

**10. Session Timeout**
   - Show "Your session has expired. Your cart has been saved."

**11. Network Failure During Submission**
   - Show error message → Allow user to retry (cart state preserved)

**12. Email Already Has Pending Order**
   - Show warning that email has order in progress → Allow continue or cancel

**13. Cart Item Goes Out of Stock Before Submission**
   - Show warning → Remove item → Recalculate totals

**14. Shipping Address No Longer Valid**
   - Show warning → Require address change before submit

**15. Promo Code Expires During Review**
   - Show error on submit → Allow manual removal

**16. Tax Calculation Changes**
   - Refresh tax on return to review page (if address changed)

**17. Shipping Cost Changes**
   - Reflect new cost immediately (e.g., weight updated)

---

## Implementation Notes

- **Payment Form**: Stripe Elements for PCI Level 1 compliance
  - Card data never touches storefront backend
  - Payment tokens created client-side, sent to backend for processing
- **Shipping Rates**: Fetched from SFCC backend via SCAPI after address validation
- **Email Verification**: NOT required for guest checkout (frictionless checkout prioritized)
- **Order Confirmation**: Sent immediately upon successful payment (transactional email service)
  - Email contains order number, tracking info (if available), and return policy
- **Timeout for Payment Processing**: 30 seconds. Auto-retry once, then error.
- **Session Timeout**: 30 minutes of inactivity in checkout flow
  - Session cleared, cart preserved
- **Fraud Prevention**: Block duplicate orders from same email within 24 hours (with override option)
- **Session Persistence**: Cart UUID persists in browser storage, checkout state is NOT persisted
- **Security**: All payment tokens created client-side via Stripe, never stored on storefront
- **Address Validation**: Via USPS/shipping provider API (cached for performance)
- **Billing Address**: Optional (can default to shipping)
- **International Addresses**: Handled via country-specific rules
- **Promo Codes**: Validated server-side (prevent client-side manipulation)
- **Account Creation**: OTP-based (6 digits, 10-minute expiration, max 3 resend attempts)

**Technology Stack:**
- Frontend: React Router v7, React form hooks
- Payment: Stripe Elements
- Backend: SFCC SCAPI (cart, shipping, order creation)
- Email: Transactional email service (SendGrid or similar)

---

## Test Coverage Map

| Acceptance Criteria | E2E Test | Unit Test | Integration Test |
|---|---|---|---|
| AC1 | checkout-guest-flow.spec.ts:L58 | GuestCheckoutForm.test.ts | CheckoutAPI.integration.ts |
| AC2 | checkout-email-validation.spec.ts:L120 | EmailValidator.test.ts | - |
| AC3 | checkout-payment-options.spec.ts:L242 | SavePaymentOption.test.ts | - |
| AC4 | checkout-billing-same-as-shipping.spec.ts:L45 | BillingToggle.test.ts | - |
| AC5 | checkout-billing-address-entry.spec.ts:L98 | AddressValidator.test.ts | AddressAPI.integration.ts |
| AC6 | checkout-billing-validation.spec.ts:L156 | AddressSuggestions.test.ts | - |
| AC7 | checkout-billing-international.spec.ts:L203 | InternationalAddressRules.test.ts | - |
| AC8 | checkout-card-entry.spec.ts:L72 | CardValidation.test.ts | - |
| AC9 | checkout-card-errors.spec.ts:L134 | CardErrorHandling.test.ts | - |
| AC10 | checkout-save-card.spec.ts:L189 | SaveCardToggle.test.ts | PaymentTokenStorage.integration.ts |
| AC11 | checkout-saved-cards.spec.ts:L251 | SavedCardList.test.ts | PaymentTokenRetrieval.integration.ts |
| AC12 | checkout-payment-processing.spec.ts:L308 | PaymentProcessing.test.ts | StripePaymentGateway.integration.ts |
| AC13 | checkout-review-display.spec.ts:L45 | OrderSummary.test.ts | - |
| AC14 | checkout-review-edit.spec.ts:L103 | EditFlow.test.ts | - |
| AC15 | checkout-review-promo.spec.ts:L156 | PromoCodeDisplay.test.ts | PromoCodeValidation.integration.ts |
| AC16 | checkout-review-calculations.spec.ts:L218 | OrderCalculation.test.ts | TaxCalculation.integration.ts |
| AC17 | checkout-review-submit.spec.ts:L275 | OrderSubmission.test.ts | OrderPlacement.integration.ts |
| AC18 | checkout-promo-code-entry.spec.ts:L52 | PromoCodeInput.test.ts | - |
| AC19 | checkout-promo-code-display.spec.ts:L109 | DiscountDisplay.test.ts | - |
| AC20 | checkout-promo-code-errors.spec.ts:L167 | CodeValidation.test.ts | PromoCodeValidationAPI.integration.ts |
| AC21 | checkout-promo-code-rules.spec.ts:L224 | CodeRuleValidation.test.ts | PromoCampaignRules.integration.ts |
| AC22 | checkout-promo-code-restrictions.spec.ts:L287 | MultipleCodeHandling.test.ts | - |
| AC23 | checkout-registration-prompt.spec.ts:L38 | RegistrationPrompt.test.ts | - |
| AC24 | checkout-otp-flow.spec.ts:L96 | PasswordValidation.test.ts | OTPService.integration.ts |
| AC25 | checkout-account-creation.spec.ts:L154 | AccountCreation.test.ts | AccountCreationAPI.integration.ts |
| AC26 | checkout-address-persistence.spec.ts:L212 | AddressSaving.test.ts | AccountAddressSync.integration.ts |
| AC27 | checkout-registration-errors.spec.ts:L269 | ErrorHandling.test.ts | - |

---

## Related Features

This is the comprehensive checkout spec. Sub-features referenced in test files:
- Feature file structure documented in: `e2e/specs/checkout/easy_checkout.spec.md` (this file)
- Test implementations: `e2e/src/specs/core/checkout*.spec.ts`
- Test data: `e2e/src/test-data/checkout.data.ts`
- Page object: `e2e/src/pages/checkout.page.ts`

---

## Risks & Dependencies

### Risks
- **Payment gateway latency impacts checkout experience** → Set 30s timeout, show loading state
- **Invalid addresses rejected by shipping provider** → Show suggestions, allow manual override
- **Address validation service fails** → Show manual entry option with warning
- **Promo code expires during review** → Validate on submit, show clear error
- **Cart changes during review** → Sync cart state on return, warn user if items changed
- **Email typos in guest checkout** → No email verification (frictionless prioritized), support team handles

### Dependencies
- **SFCC Pricing API** must be operational for shipping rates
- **SFCC Basket API** for cart/order operations
- **SFCC Payment API** for backend payment submission
- **SFCC Customer API** for account creation (post-purchase)
- **Email service** for order confirmation and OTP delivery
- **Address validation service** (USPS or shipping provider)
- **Stripe payment processor** (or alternative gateway) for payment tokenization
- **SFCC saved payment tokens storage** (backend only, not storefront)

---

## Decision Records

### Why no email verification for guest checkout?
**Decision**: Frictionless checkout prioritized over typo prevention.  
**Rationale**: Email typos are handled by customer support; friction at checkout hurts conversion. Merchants can validate email via order confirmation link if needed. Transactional emails serve as implicit verification.

### Why only 3 payment retry attempts?
**Decision**: Balance fraud prevention (rate limiting) with UX.  
**Rationale**: Most legitimate users succeed on first attempt; suspicious patterns blocked quickly. After 3 failures, likely a bad card or fraud. Don't retry indefinitely; show support contact info.

### Why allow 24h duplicate order override?
**Decision**: Some legitimate use cases (reorder, forgot previous order).  
**Rationale**: Balance fraud prevention with false-positive cost.

### Why 30m checkout session timeout?
**Decision**: Prevent stale sessions while allowing reasonable time for checkout completion.  
**Rationale**: Guest cart persists; checkout state clears. Guest can resume checkout by returning to cart.

### Why not persist guest checkout state between sessions?
**Decision**: Encourage users to use cart for persistence; checkout state is transient and session-specific.  
**Rationale**: Cart is the durable data structure; checkout is ephemeral.

### Why save addresses but not payment cards?
**Decision**: Addresses are re-usable (helpful for future purchases); payment cards require PCI handling.  
**Rationale**: Payment tokens should be independently requested via 3D Secure or similar.

### Why save shipping vs billing separately?
**Decision**: Some shoppers ship to different address (gift, office).  
**Rationale**: AC3 focuses on shipping; billing handled in separate ACs.

### Why OTP instead of email link for account verification?
**Decision**: Better UX (shorter confirmation time), lower bounce rate on email links.  
**Rationale**: 6-digit OTP faster than email link click-through.

### Why 10-minute OTP expiration?
**Decision**: Balance security with UX; most users verify within 5 minutes.  
**Rationale**: 10 minutes = reasonable window for typical user behavior.

### Why optional billing address?
**Decision**: Most customers use same address; optional toggle reduces friction.  
**Rationale**: Default to shipping address (common case), allow override (uncommon cases).

### Why order review before payment?
**Decision**: Final checkpoint before order placement reduces buyer's remorse and support issues.  
**Rationale**: Clear visibility of all details prevents "I didn't realize..." support calls.

### Why post-purchase account creation?
**Decision**: Don't force account creation before purchase; offer after order is placed.  
**Rationale**: Reduces checkout friction; customer already invested (has placed order).

---

**Specification Version**: 1.0  
**Status**: Draft (ready for team review)  
**Last Updated**: 2026-04-02

