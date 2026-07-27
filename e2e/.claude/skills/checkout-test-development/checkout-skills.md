---
name: checkout-skills
description: Comprehensive checkout development guide covering E2E testing, Storybook component documentation, debugging and troubleshooting, and performance analysis for Salesforce Commerce Cloud checkout flows.
---

# Checkout Skills

Systematically create end-to-end tests for storefront checkout functionality, covering guest checkout, registered shopper flows, billing address scenarios, and payment validation patterns.

## Prerequisites

Before starting, ensure you understand the checkout context:

```bash
view .claude/CLAUDE.md  # In e2e package directory for checkout patterns
view src/pages/checkout.page.ts  # Review existing checkout page object
view src/specs/core/checkout*.spec.ts  # Study existing checkout tests
```

## Checkout Test Categories

### 1. Guest Checkout Tests
- Simple guest checkout flow
- Multiple item checkout
- Cart state preservation during checkout
- Contact info validation

### 2. Registered Shopper Tests
- Registered shopper with saved addresses
- Registered shopper with different billing address
- Pre-filled payment methods
- Account address selection during checkout

### 3. Billing Address Tests
- Same as shipping address (default)
- Different billing address entry
- Billing address validation (required fields)
- Address format validation
- Billing address persistence:
  - Billing address saved to profile when different from shipping
  - No duplicate addresses created when reusing existing address
  - Address not persisted when using shipping as billing

### 4. Save Payment Checkbox Tests
- Save payment checkbox hidden after account creation via OTP
- Save payment checkbox visible when guest declines account creation
- Verify payment is auto-saved despite checkbox being hidden

### 5. Payment Validation Tests
- Invalid card number detection
- Expired card date validation
- Invalid CVV detection
- Payment form error handling

### 5. Basket & Navigation Tests
- Cart item count updates
- Cart state preservation across navigation
- Cart item removal pre-checkout

### 6. Multi-Currency Checkout Tests
- Place order in USD (RefArch site, en-US locale)
- Place order in GBP (RefArchGlobal site, en-GB locale)
- Verify currency symbols in order summary and confirmation
- Extensible via `TEST_LOCALE_CURRENCIES` data array

## Workflow

### 1. Define Test Scope

**Clarifying questions before starting**:
- Which checkout scenarios are missing?
- Should tests cover both guest and registered shoppers?
- Do you need billing address variation testing?
- Should payment edge cases be validated?
- Are mobile-specific checkout scenarios needed?

### 2. Review Existing Checkout Infrastructure

**Checkout Page Object** (`src/pages/checkout.page.ts`):
```bash
view src/pages/checkout.page.ts  # Locate key methods:
# - fillContactInfo()
# - fillShippingAddress()
# - selectShippingMethod()
# - fillPaymentInfo()
# - checkUseDifferentBillingAddress()
# - completeCheckout()
```

**Existing Test Patterns** (`src/specs/core/checkout*.spec.ts`):
- Review tag usage (@core, @checkout, @guest-checkout, @registered-shopper)
- Check how flows are composed (addToCartFlow, loginFlow, registeredShopperSetupFlow)
- Study assertion patterns (expect() usage)

**Test Data** (`src/test-data/checkout.data.ts`):
- TEST_SHIPPING_ADDRESS structure
- TEST_PAYMENT structure
- INVALID_TEST_DATA patterns

### 3. Create Test Scenarios

**Guest Checkout Test Template**:
```typescript
Feature('Checkout [Scenario Name]').tag('@core').tag('@checkout');

const { checkoutPage, addToCartFlow } = inject();
import { expect } from 'chai';
import { TEST_SHIPPING_ADDRESS, TEST_PAYMENT, TEST_PRODUCT_CATEGORIES, generateTestEmail } from '../../test-data/checkout.data';

Scenario('Guest checkout [specific behavior]', async () => {
    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    const orderNumber = await checkoutPage.completeCheckout({
        email: generateTestEmail('test'),
        shippingAddress: TEST_SHIPPING_ADDRESS,
        payment: TEST_PAYMENT,
    });

    expect(orderNumber).to.not.be.empty;
    expect(orderNumber).to.match(/^\d+$/);
}).tag('@place-order').tag('@guest-checkout');

export {};
```

**Registered Shopper Test Template**:
```typescript
Feature('Checkout Registered Shopper [Scenario]').tag('@core').tag('@checkout');

const { checkoutPage, addToCartFlow, loginFlow, storefrontPage } = inject();
import { expect } from 'chai';
import { TEST_SHIPPING_ADDRESS, TEST_PAYMENT, TEST_PRODUCT_CATEGORIES, generateTestEmail } from '../../test-data/checkout.data';

After(async (test: unknown) => {
    const tags = (test as { tags?: string[] }).tags ?? [];
    if (Array.isArray(tags) && tags.includes('@registered-shopper')) {
        await storefrontPage.logout();
    }
});

Scenario('Registered shopper [specific behavior]', async () => {
    await loginFlow.execute();

    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    const prefilledEmail = await checkoutPage.getPrefilledEmail();
    const emailToUse = prefilledEmail || generateTestEmail('registered');

    const orderNumber = await checkoutPage.completeCheckout({
        email: emailToUse,
        shippingAddress: TEST_SHIPPING_ADDRESS,
        payment: TEST_PAYMENT,
    });

    expect(orderNumber).to.not.be.empty;
    expect(orderNumber).to.match(/^\d+$/);
}).tag('@registered-shopper').tag('@place-order');

export {};
```

### 4. Billing Address Scenarios

**Different Billing Address Pattern**:
```typescript
Scenario('Registered shopper can use different billing address', async () => {
    const customBillingAddress = {
        firstName: 'Jane',
        lastName: 'Billing',
        address1: '789 Payment Street',
        city: 'New York',
        stateCode: 'NY',
        postalCode: '10001',
    };

    await loginFlow.execute();
    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);

    checkoutPage.validatePageLoaded();
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.selectShippingMethod(0);

    await checkoutPage.expandPaymentStep();
    await checkoutPage.selectNewCardPaymentMethod();
    checkoutPage.waitForUseDifferentBillingCheckbox();

    await checkoutPage.checkUseDifferentBillingAddress();

    const billingFieldsVisible = await checkoutPage.areBillingAddressFieldsVisible();
    expect(billingFieldsVisible).to.be.true;

    checkoutPage.fillBillingAddress(customBillingAddress);
    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);
    checkoutPage.clickPlaceOrder();

    checkoutPage.waitForOrderConfirmation();
    checkoutPage.validateOrderConfirmation();
}).tag('@registered-shopper').tag('@billing-address').tag('@place-order');
```

**Billing Address Persistence Pattern**:
```typescript
Scenario('Registered shopper billing address is saved when using different billing address', async () => {
    const setupResult = await registeredShopperSetupFlow.execute();  // Create user with 1 saved address

    const customBillingAddress = {
        firstName: 'NewBilling',
        lastName: 'AddressTest',
        address1: '999 Billing Lane',
        city: 'Seattle',
        stateCode: 'WA',
        postalCode: '98101',
    };

    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    // Use saved shipping address
    await checkoutPage.expandShippingAddressForSavedAddresses();
    checkoutPage.clickContinueToShippingOptions();
    await checkoutPage.selectShippingMethod(0);

    // Set different billing address
    await checkoutPage.expandPaymentStep();
    await checkoutPage.selectNewCardPaymentMethod();
    checkoutPage.waitForUseDifferentBillingCheckbox();
    await checkoutPage.checkUseDifferentBillingAddress();

    checkoutPage.fillBillingAddress(customBillingAddress);
    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);
    checkoutPage.clickPlaceOrder();

    checkoutPage.waitForOrderConfirmation();
    checkoutPage.validateOrderConfirmation();
    const orderNumber = await checkoutPage.getOrderNumber();
    expect(orderNumber).to.not.be.empty;

    // VERIFY: Navigate to account addresses and confirm billing address was saved
    accountAddressesPage.navigate();
    accountAddressesPage.validatePageLoaded();

    const addressCount = await accountAddressesPage.getAddressCount();
    expect(addressCount).to.be.at.least(2);  // Original shipping + new billing

    // Verify billing address exists in saved addresses
    const addressCardTexts: string[] = [];
    for (let i = 0; i < addressCount; i++) {
        const cardText = await accountAddressesPage.getAddressCardText(i);
        addressCardTexts.push(cardText);
    }

    const billingAddressSaved = addressCardTexts.some((text) =>
        text.includes(customBillingAddress.firstName) &&
        text.includes(customBillingAddress.lastName) &&
        text.includes(customBillingAddress.address1) &&
        text.includes(customBillingAddress.city)
    );

    expect(billingAddressSaved).to.be.true;
}).tag('@registered-shopper').tag('@billing-address-persistence').tag('@place-order');
```

### 5. Save Payment Checkbox Visibility Pattern

**Save Payment Checkbox Hidden During Account Creation**:
```typescript
Scenario('Save payment checkbox is hidden after account creation during checkout', async () => {
    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    const email = generateTestEmail('checkout-hide-save-payment');

    await checkoutPage.fillContactInfo(email);
    await checkoutPage.continueFromContactInfo();
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.continueFromShippingAddress();
    await checkoutPage.selectFirstShippingMethod();
    checkoutPage.continueFromShippingOptions();

    // VERIFY: Checkbox should be visible BEFORE account creation
    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);
    const isVisibleBeforeRegister = await checkoutPage.isSavePaymentCheckboxVisible();
    expect(isVisibleBeforeRegister).to.be.true;  // Visible for guest

    // Create account via OTP
    const otpModalAppeared = await checkoutPage.clickCreateAccountCheckboxAndWaitForModalOrError(15);

    if (otpModalAppeared) {
        checkoutPage.clickOtpCheckoutAsGuest();
        checkoutPage.waitForOtpModalClosed(10);

        // VERIFY: Checkbox should be HIDDEN AFTER account creation
        const isVisibleAfterRegister = await checkoutPage.isSavePaymentCheckboxVisible();
        expect(isVisibleAfterRegister).to.be.false;  // Hidden because payment is auto-saved
    }

    checkoutPage.clickPlaceOrder();
    checkoutPage.waitForOrderConfirmationElement(30);
}).tag('@guest-checkout').tag('@checkout-registration').tag('@save-payment-checkbox').tag('@hide-save-payment');
```

**Save Payment Checkbox Remains Visible When Declining Account Creation**:
```typescript
Scenario('Save payment checkbox remains visible when guest declines account creation', async () => {
    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    const email = generateTestEmail('checkout-keep-save-payment');

    await checkoutPage.fillContactInfo(email);
    await checkoutPage.continueFromContactInfo();
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.continueFromShippingAddress();
    await checkoutPage.selectFirstShippingMethod();
    checkoutPage.continueFromShippingOptions();

    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);

    // VERIFY: Checkbox visible initially
    const isVisibleBefore = await checkoutPage.isSavePaymentCheckboxVisible();
    expect(isVisibleBefore).to.be.true;

    // Click "Create account" but then decline
    const otpModalAppeared = await checkoutPage.clickCreateAccountCheckboxAndWaitForModalOrError(15);

    if (otpModalAppeared) {
        checkoutPage.clickOtpCheckoutAsGuest();  // Decline account creation
        checkoutPage.waitForOtpModalClosed(10);

        // VERIFY: Checkbox should STILL be visible (account NOT created)
        const isVisibleAfter = await checkoutPage.isSavePaymentCheckboxVisible();
        expect(isVisibleAfter).to.be.true;  // Still visible because no account created
    }

    checkoutPage.clickPlaceOrder();
    checkoutPage.waitForOrderConfirmationElement(30);
}).tag('@guest-checkout').tag('@checkout-registration').tag('@save-payment-checkbox').tag('@keep-save-payment');
```

### 6. Payment Validation Patterns

**Invalid Payment Data**:
```typescript
Scenario('Invalid card number shows inline error', async () => {
    const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('invalid-card'), TEST_SHIPPING_ADDRESS.phone);
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.selectShippingMethod(0);

    // Fill with invalid data
    checkoutPage.fillPaymentFieldsOnly({
        cardNumber: INVALID_TEST_DATA.SHORT_CARD_NUMBER,
        cardholderName: TEST_PAYMENT.cardholderName,
        expiryDate: TEST_PAYMENT.expiryDate,
        cvv: TEST_PAYMENT.cvv,
    });

    // Attempt submission and validate error
    checkoutPage.clickPlaceOrderAndWaitForValidation();
    const errors = await checkoutPage.getPaymentValidationErrors();
    expect(errors.length).to.be.greaterThan(0);

    // Correct and retry
    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);
    checkoutPage.clickPlaceOrder();

    checkoutPage.waitForOrderConfirmation();
    checkoutPage.validateOrderConfirmation();
}).tag('@payment-validation').tag('@guest-checkout');
```

### 7. Multi-Currency Checkout Patterns

**Data-Driven Multi-Currency Test**:

Multi-currency tests use `addToCartFlow.executeAndNavigateToCheckout()` with a `sitePrefix` option to test different site/locale/currency combinations. The test data is defined in `TEST_LOCALE_CURRENCIES` in `checkout.data.ts`.

```typescript
Feature('Multi-Currency Checkout Tests').tag('@core').tag('@checkout').tag('@multi-currency');

const { checkoutPage, addToCartFlow } = inject();
import { expect } from 'chai';
import { TEST_PAYMENT, TEST_PRODUCT_CATEGORIES, TEST_LOCALE_CURRENCIES, generateTestEmail } from '../../test-data/checkout.data';

for (const localeCurrency of TEST_LOCALE_CURRENCIES) {
    Scenario(`Guest shopper completes checkout in ${localeCurrency.label}`, async () => {
        const sitePrefix = `/${localeCurrency.siteAlias}/${localeCurrency.locale}`;

        const productInfo = await addToCartFlow.executeAndNavigateToCheckout(
            TEST_PRODUCT_CATEGORIES.MENS_JACKETS,
            3,
            { sitePrefix }
        );
        expect(productInfo).to.not.be.undefined;

        checkoutPage.validatePageLoaded();

        const summaryText = await checkoutPage.getOrderSummaryText();
        expect(summaryText).to.match(localeCurrency.currencyPattern);

        const orderNumber = await checkoutPage.completeCheckout({
            email: generateTestEmail(`multi-currency-${localeCurrency.label.toLowerCase()}`),
            shippingAddress: localeCurrency.shippingAddress,
            payment: TEST_PAYMENT,
        });

        expect(orderNumber).to.not.be.empty;
        expect(orderNumber).to.match(/^\d+$/);
    })
        .tag(`@${localeCurrency.label.toLowerCase()}`)
        .tag('@guest-checkout')
        .tag('@place-order');
}
```

**Key Principles**:
- Use `addToCartFlow` with `sitePrefix` option instead of direct `I.amOnPage()` — the flow handles PLP navigation, product selection, and checkout navigation under the correct locale
- Each locale entry in `TEST_LOCALE_CURRENCIES` has a **locale-appropriate shipping address** (US address for USD, UK address for GBP, etc.)
- Currency assertions use **locale-specific regex patterns** (e.g., `/\$[\d,.]+/` for USD, `/£[\d,.]+/` for GBP)
- Verify currency on both **order summary** (during checkout) and **confirmation page** (after order)
- **Never hardcode a single currency symbol** (like `$`) in assertions — always use the locale-aware pattern from `TEST_LOCALE_CURRENCIES`

**Adding a New Currency**:
1. Add an entry to `TEST_LOCALE_CURRENCIES` in `checkout.data.ts` with `siteAlias`, `locale`, `currencyPattern`, `shippingAddress`, and `label`
2. The data-driven test loop automatically generates a new scenario

### 8. Test Organization

**File Naming**:
- `checkout-[scenario].spec.ts` (e.g., `checkout-multiple-items.spec.ts`)
- `checkout-registered-shopper-billing.spec.ts`
- `checkout-billing-validation.spec.ts`
- `checkout-payment-edge-cases.spec.ts`

**Tag Strategy**:
- `@core` - Essential checkout functionality
- `@checkout` - All checkout tests
- `@guest-checkout` - Guest user flows
- `@registered-shopper` - Authenticated user flows
- `@billing-address` - Billing address specific
- `@payment-validation` - Payment form validation
- `@place-order` - Tests that complete order
- `@multi-currency` - Multi-currency/locale checkout tests
- `@usd`, `@gbp`, `@eur` - Currency-specific tests
- `@checkout-registration` - Account creation during checkout
- `@analytics` - Einstein analytics beacon tests

### 9. Key Checkout Page Object Methods

**Essential Methods to Use**:
```typescript
// Full checkout (recommended for happy-path tests)
completeCheckout({ email, shippingAddress, payment })  // End-to-end guest checkout
completePrefilledCheckout()                             // Registered shopper with saved data

// Contact/Shipping
fillContactInfo(email, phone)
fillShippingAddress(address)
selectShippingMethod(index)
waitForShippingMethods(timeout)
waitForShippingOptionsStep(timeout)

// Billing
checkUseDifferentBillingAddress()
uncheckUseDifferentBillingAddress()
fillBillingAddress(address)
areBillingAddressFieldsVisible()
waitForUseDifferentBillingCheckbox(timeout)
isUsingDifferentBillingAddress()              // Check if checkbox is currently checked

// Payment
fillPaymentInfo(payment)           // Fills AND submits
fillPaymentFieldsOnly(payment)    // Fills WITHOUT submitting
expandPaymentStep()                // Expand from preview mode (registered shopper) — async
clickPlaceOrder()
clickPlaceOrderAndWaitForValidation()
waitForPaymentStep(timeout)
isSavePaymentCheckboxVisible()     // Check if "save payment" checkbox is visible
getSavePaymentCheckboxVisibilityCount()  // Get count of visible save payment checkboxes

// Navigation
navigateWithPrefix(prefixedPath)   // Locale-prefixed checkout navigation
navigateToHomepage()               // Navigate away from checkout
getCurrentUrl()                    // Grab current URL for assertions

// OTP Modal (checkout registration)
getOtpModalText()
clickOtpCheckoutAsGuest()
waitForOtpModalClosed(timeout)
clickOtpResendCode()
waitForOtpResendCooldown(timeout)
isCreateAccountCheckboxChecked()

// Completion
waitForOrderConfirmation()
validateOrderConfirmation()
getOrderNumber()
getConfirmationPageText()
getOrderSummaryText()
getPaymentSectionText()
```

### 10. Timing & Wait Patterns

**Payment Form Timing**:
```typescript
// For registered shoppers with prefilled shipping
await checkoutPage.expandPaymentStep();
await checkoutPage.selectNewCardPaymentMethod();
checkoutPage.waitForUseDifferentBillingCheckbox();
```

**Checkout Flow Waits**:
```typescript
// After selecting shipping method
checkoutPage.waitForPaymentStep();     // Default 10s

// Validation errors after clicking place order
await checkoutPage.waitForValidationErrors('selector', 3);

// Order confirmation
checkoutPage.waitForOrderConfirmation();
```

### 11. Test Data Management

**Use Test Utilities**:
```typescript
import { TEST_SHIPPING_ADDRESS, TEST_PAYMENT, TEST_PRODUCT_CATEGORIES, TEST_LOCALE_CURRENCIES, generateTestEmail, INVALID_TEST_DATA } from '../../test-data/checkout.data';

// Guest checkout with unique email
generateTestEmail('scenario-name')  // Generates unique email for test

// Product selection
TEST_PRODUCT_CATEGORIES.MENS_JACKETS
TEST_PRODUCT_CATEGORIES.WOMENS_DRESSES

// Invalid data for validation tests
INVALID_TEST_DATA.SHORT_CARD_NUMBER
INVALID_TEST_DATA.EXPIRED_CARD_DATE
INVALID_TEST_DATA.CVV

// Multi-currency locale configs (for data-driven checkout tests)
TEST_LOCALE_CURRENCIES  // Array of { label, siteAlias, locale, currencyPattern, shippingAddress }
```

### 12. Final Checklist

Before completing checkout tests, verify:

- [ ] Tests follow Scenario-Mocha structure
- [ ] Each scenario is independent (can run in any order)
- [ ] Chai `expect()` used for value validation
- [ ] Page object methods used for all UI interactions (no direct `I.*` calls in scenarios)
- [ ] Guest checkout scenarios use unique email generation
- [ ] Registered shopper tests include After() logout hook
- [ ] Billing address scenarios test both same-as-shipping and different-billing
- [ ] Payment validation tests verify inline errors
- [ ] Payment flow includes proper timing for prefilled data
- [ ] All tests properly tagged (@core, @checkout, specific tags)
- [ ] Order numbers validated with regex: `/^\d+$/`
- [ ] TypeScript definitions auto-generated
- [ ] Tests pass locally before committing

### 13. Common Pitfalls

**Don't Do This**:
```typescript
// Calling I.* directly in scenario
Scenario('Broken pattern', async () => {
    I.amOnPage('/checkout');
    I.fillField('email', 'test@example.com');
    I.click('Continue');
});

// Not waiting for payment section to load
checkoutPage.waitForPaymentStep();
await checkoutPage.checkUseDifferentBillingAddress();  // May timeout

// Using guest email without uniqueness
const email = 'test@example.com';  // Will collide with other tests

// Not handling registered shopper logout
Scenario('Registered test', async () => {
    await loginFlow.execute();
    // ... test code ...
    // No logout — test state leaks to next test
});
```

**Do This Instead**:
```typescript
// All interactions through page objects and flows
const productInfo = await addToCartFlow.executeAndNavigateToCheckout(productCategory);
checkoutPage.validatePageLoaded();
await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);

// Proper timing for payment section via page object methods
await checkoutPage.expandPaymentStep();
await checkoutPage.selectNewCardPaymentMethod();
checkoutPage.waitForUseDifferentBillingCheckbox();
await checkoutPage.checkUseDifferentBillingAddress();

// Unique email generation
const email = generateTestEmail('scenario-name');

// Proper logout in After hook
After(async (test: unknown) => {
    const tags = (test as { tags?: string[] }).tags ?? [];
    if (Array.isArray(tags) && tags.includes('@registered-shopper')) {
        await storefrontPage.logout();
    }
});
```

## Quick Command Reference

```bash
# Run all checkout tests
pnpm e2e --grep "@checkout"

# Run guest checkout only
pnpm e2e --grep "(?=.*@checkout)(?=.*@guest-checkout)"

# Run multi-currency checkout tests
pnpm e2e --grep "@multi-currency"

# Run specific currency
pnpm e2e --grep "@usd"
pnpm e2e --grep "@gbp"

# Run checkout registration tests
pnpm e2e --grep "@checkout-registration"

# Run analytics tests
pnpm e2e --grep "@analytics"

# Run with AI self-healing
pnpm e2e --ai --grep "@checkout"

# Run specific test file
pnpm e2e --grep "Multiple Items"

# Verbose output with steps
pnpm e2e:verbose --grep "@checkout"
```

## File Structure

```
e2e/
├── src/
│   ├── specs/core/
│   │   ├── checkout.spec.ts
│   │   ├── checkout-analytics.spec.ts
│   │   ├── checkout-basket-navigation.spec.ts
│   │   ├── checkout-billing-validation.spec.ts
│   │   ├── checkout-multi-currency.spec.ts
│   │   ├── checkout-order-summary-shipping.spec.ts
│   │   ├── checkout-payment-edge-cases.spec.ts
│   │   ├── checkout-registered-shopper-billing.spec.ts
│   │   ├── checkout-registered-shopper-payment.spec.ts
│   │   └── checkout-registration-email-verification.spec.ts
│   ├── pages/
│   │   └── checkout.page.ts
│   ├── flows/
│   │   ├── add-to-cart.flow.ts
│   │   ├── beacon-capture.flow.ts
│   │   ├── login.flow.ts
│   │   └── registered-shopper-setup.flow.ts
│   └── test-data/
│       └── checkout.data.ts  # Includes TEST_LOCALE_CURRENCIES for multi-currency
└── test-plans/
    └── checkout-e2e-test-plan.md
```

This skill provides comprehensive guidance for developing robust checkout E2E tests with proper timing, data management, and test patterns specific to Salesforce Commerce Cloud checkout flows.

---

# Checkout Storybook Development

Develop and document checkout components through Storybook stories, creating isolated, interactive component examples for design validation, development, and documentation.

## Prerequisites

Before starting storybook development, ensure you understand the structure:

```bash
view .storybook/            # Storybook configuration
view src/stories/           # Existing story examples
view src/components/        # Checkout components to document
```

## Storybook Story Categories

### 1. Checkout Form Component Stories
- Contact info form states (empty, filled, error)
- Shipping address form with validation states
- Billing address form (same/different variants)
- Payment form with different payment methods
- Shipping method selector

### 2. State & Variant Stories
- Loading states
- Error states with validation messages
- Success/completed states
- Disabled field states
- Pre-filled form states

### 3. Mobile Responsive Stories
- Mobile viewport checkout form
- Touch-friendly input interactions
- Collapsed/expanded sections
- Mobile error display

### 4. Integration Stories
- Full checkout flow component
- Multi-step checkout stepper
- Order summary with line items
- Order confirmation page

## Workflow

### 1. Define Story Scope

**Clarifying questions before starting**:
- Which checkout components need Storybook documentation?
- Should we document component states (loading, error, success)?
- Do you need mobile-specific story variants?
- Should stories include interactive controls (knobs, args)?
- Are there accessibility variants to document?

### 2. Review Existing Story Patterns

**Storybook Configuration** (`.storybook/main.ts`):
```bash
view .storybook/main.ts          # Story discovery patterns
view .storybook/preview.ts       # Global decorators, theme setup
```

**Existing Component Stories** (`src/stories/`):
- Review naming convention (e.g., `ComponentName.stories.tsx`)
- Check how args are structured
- Study decorators for layout/theming
- Look at meta configuration

**Component Imports**:
```bash
view src/components/checkout/   # Components to create stories for
```

### 3. Create Component Stories

**Basic Story Template**:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { CheckoutForm } from '../components/checkout/CheckoutForm';

const meta: Meta<typeof CheckoutForm> = {
  title: 'Checkout/CheckoutForm',
  component: CheckoutForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'submitted' },
    isLoading: { control: 'boolean' },
    initialData: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isLoading: false,
    initialData: {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
    },
  },
};

export const WithPrefilledData: Story = {
  args: {
    isLoading: false,
    initialData: {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '555-1234',
    },
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    initialData: {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '555-1234',
    },
  },
};

export const WithValidationErrors: Story = {
  args: {
    isLoading: false,
    initialData: {
      email: 'invalid-email',
      firstName: '',
      lastName: '',
      phone: '123',
    },
    errors: {
      email: 'Please enter a valid email',
      firstName: 'First name is required',
      phone: 'Please enter a valid phone number',
    },
  },
};
```

### 4. Contact Info Form Story

**File**: `src/stories/checkout/ContactForm.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ContactForm } from '../components/checkout/ContactForm';

const meta: Meta<typeof ContactForm> = {
  title: 'Checkout/ContactForm',
  component: ContactForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'submitted' },
    isLoading: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    isLoading: false,
    initialValues: {
      email: '',
      phone: '',
    },
  },
};

export const Filled: Story = {
  args: {
    isLoading: false,
    initialValues: {
      email: 'customer@example.com',
      phone: '(555) 123-4567',
    },
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    initialValues: {
      email: 'customer@example.com',
      phone: '(555) 123-4567',
    },
  },
};

export const WithErrors: Story = {
  args: {
    isLoading: false,
    initialValues: {
      email: 'invalid',
      phone: '123',
    },
    validationErrors: {
      email: 'Please enter a valid email address',
      phone: 'Phone must be at least 10 digits',
    },
  },
};
```

### 5. Shipping Address Form Story

**File**: `src/stories/checkout/ShippingAddressForm.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ShippingAddressForm } from '../components/checkout/ShippingAddressForm';

const meta: Meta<typeof ShippingAddressForm> = {
  title: 'Checkout/ShippingAddressForm',
  component: ShippingAddressForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'submitted' },
    isLoading: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const defaultAddress = {
  firstName: '',
  lastName: '',
  address1: '',
  address2: '',
  city: '',
  stateCode: '',
  postalCode: '',
  countryCode: 'US',
};

const filledAddress = {
  firstName: 'John',
  lastName: 'Smith',
  address1: '123 Main Street',
  address2: 'Suite 100',
  city: 'San Francisco',
  stateCode: 'CA',
  postalCode: '94105',
  countryCode: 'US',
};

export const Empty: Story = {
  args: {
    isLoading: false,
    initialValues: defaultAddress,
  },
};

export const Prefilled: Story = {
  args: {
    isLoading: false,
    initialValues: filledAddress,
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    initialValues: filledAddress,
  },
};

export const WithValidationErrors: Story = {
  args: {
    isLoading: false,
    initialValues: {
      ...defaultAddress,
      firstName: 'J',
      city: 'S',
    },
    validationErrors: {
      firstName: 'First name must be at least 2 characters',
      city: 'City must be at least 2 characters',
      address1: 'Address is required',
      postalCode: 'Postal code is required',
    },
  },
};
```

### 6. Billing Address Form Story

**File**: `src/stories/checkout/BillingAddressForm.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { BillingAddressForm } from '../components/checkout/BillingAddressForm';

const meta: Meta<typeof BillingAddressForm> = {
  title: 'Checkout/BillingAddressForm',
  component: BillingAddressForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const address = {
  firstName: 'Jane',
  lastName: 'Billing',
  address1: '789 Payment Street',
  address2: '',
  city: 'New York',
  stateCode: 'NY',
  postalCode: '10001',
  countryCode: 'US',
};

export const SameAsShipping: Story = {
  args: {
    useDifferentBillingAddress: false,
    isLoading: false,
  },
};

export const DifferentAddress: Story = {
  args: {
    useDifferentBillingAddress: true,
    isLoading: false,
    initialValues: address,
  },
};

export const DifferentAddressLoading: Story = {
  args: {
    useDifferentBillingAddress: true,
    isLoading: true,
    initialValues: address,
  },
};

export const DifferentAddressWithErrors: Story = {
  args: {
    useDifferentBillingAddress: true,
    isLoading: false,
    initialValues: {
      ...address,
      firstName: '',
      city: '',
    },
    validationErrors: {
      firstName: 'First name is required',
      city: 'City is required',
    },
  },
};
```

### 7. Payment Form Story

**File**: `src/stories/checkout/PaymentForm.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { PaymentForm } from '../components/checkout/PaymentForm';

const meta: Meta<typeof PaymentForm> = {
  title: 'Checkout/PaymentForm',
  component: PaymentForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    isLoading: false,
    initialValues: {
      cardholderName: '',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
    },
  },
};

export const Filled: Story = {
  args: {
    isLoading: false,
    initialValues: {
      cardholderName: 'John Doe',
      cardNumber: '4111 1111 1111 1111',
      expiryDate: '12/25',
      cvv: '123',
    },
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    initialValues: {
      cardholderName: 'John Doe',
      cardNumber: '4111 1111 1111 1111',
      expiryDate: '12/25',
      cvv: '123',
    },
  },
};

export const WithValidationErrors: Story = {
  args: {
    isLoading: false,
    initialValues: {
      cardholderName: '',
      cardNumber: '1234',
      expiryDate: '01/20',
      cvv: '12',
    },
    validationErrors: {
      cardholderName: 'Cardholder name is required',
      cardNumber: 'Invalid card number',
      expiryDate: 'Card has expired',
      cvv: 'CVV must be 3-4 digits',
    },
  },
};
```

### 8. Shipping Method Selector Story

**File**: `src/stories/checkout/ShippingMethodSelector.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ShippingMethodSelector } from '../components/checkout/ShippingMethodSelector';

const meta: Meta<typeof ShippingMethodSelector> = {
  title: 'Checkout/ShippingMethodSelector',
  component: ShippingMethodSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const shippingMethods = [
  {
    id: 'standard',
    name: 'Standard Shipping',
    description: '5-7 business days',
    cost: 5.99,
  },
  {
    id: 'express',
    name: 'Express Shipping',
    description: '2-3 business days',
    cost: 14.99,
  },
  {
    id: 'overnight',
    name: 'Overnight Shipping',
    description: 'Next business day',
    cost: 29.99,
  },
];

export const Default: Story = {
  args: {
    methods: shippingMethods,
    selectedMethodId: 'standard',
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    methods: shippingMethods,
    selectedMethodId: 'standard',
    isLoading: true,
  },
};

export const SelectExpress: Story = {
  args: {
    methods: shippingMethods,
    selectedMethodId: 'express',
    isLoading: false,
  },
};
```

### 9. Order Summary Story

**File**: `src/stories/checkout/OrderSummary.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { OrderSummary } from '../components/checkout/OrderSummary';

const meta: Meta<typeof OrderSummary> = {
  title: 'Checkout/OrderSummary',
  component: OrderSummary,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const cartItems = [
  {
    id: '1',
    name: 'Winter Jacket',
    sku: 'WJ-001',
    quantity: 1,
    price: 129.99,
  },
  {
    id: '2',
    name: 'Wool Sweater',
    sku: 'WS-002',
    quantity: 2,
    price: 79.99,
  },
];

export const Default: Story = {
  args: {
    items: cartItems,
    subtotal: 289.97,
    shipping: 5.99,
    tax: 23.18,
    total: 319.14,
  },
};

export const WithDiscount: Story = {
  args: {
    items: cartItems,
    subtotal: 289.97,
    discount: -20.00,
    discountCode: 'SAVE20',
    shipping: 5.99,
    tax: 21.55,
    total: 297.51,
  },
};

export const SingleItem: Story = {
  args: {
    items: [cartItems[0]],
    subtotal: 129.99,
    shipping: 5.99,
    tax: 10.80,
    total: 146.78,
  },
};
```

### 10. Checkout Stepper Story

**File**: `src/stories/checkout/CheckoutStepper.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { CheckoutStepper } from '../components/checkout/CheckoutStepper';

const meta: Meta<typeof CheckoutStepper> = {
  title: 'Checkout/CheckoutStepper',
  component: CheckoutStepper,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const steps = [
  { id: 'contact', label: 'Contact Info', status: 'completed' },
  { id: 'shipping', label: 'Shipping Address', status: 'completed' },
  { id: 'billing', label: 'Billing Address', status: 'active' },
  { id: 'payment', label: 'Payment', status: 'pending' },
  { id: 'review', label: 'Review Order', status: 'pending' },
];

export const Default: Story = {
  args: {
    steps,
    currentStepId: 'billing',
  },
};

export const FirstStep: Story = {
  args: {
    steps,
    currentStepId: 'contact',
  },
};

export const LastStep: Story = {
  args: {
    steps,
    currentStepId: 'review',
  },
};

export const AllCompleted: Story = {
  args: {
    steps: steps.map(step => ({ ...step, status: 'completed' })),
    currentStepId: 'review',
  },
};
```

## Story File Organization

**File Structure**:
```
src/stories/
├── checkout/
│   ├── ContactForm.stories.tsx
│   ├── ShippingAddressForm.stories.tsx
│   ├── BillingAddressForm.stories.tsx
│   ├── PaymentForm.stories.tsx
│   ├── ShippingMethodSelector.stories.tsx
│   ├── OrderSummary.stories.tsx
│   ├── CheckoutStepper.stories.tsx
│   └── FullCheckoutFlow.stories.tsx
└── index.ts
```

## Story Best Practices

### Use Args for Variant Control

```typescript
export const WithCustomProps: Story = {
  args: {
    // Override default meta.args
    isLoading: true,
    disabled: false,
  },
};
```

### Document with Decorators

```typescript
const meta: Meta<typeof CheckoutForm> = {
  // ... config
  decorators: [
    (Story) => (
      <div style={{ padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
};
```

### Add Controls for Interaction

```typescript
argTypes: {
  isLoading: { 
    control: 'boolean',
    description: 'Show loading state',
  },
  onSubmit: { 
    action: 'submitted',
    description: 'Called when form is submitted',
  },
  initialData: { 
    control: 'object',
    description: 'Initial form values',
  },
}
```

### Mobile Responsive Stories

```typescript
export const MobileView: Story = {
  args: { /* ... */ },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};
```

## Storybook Command Reference

```bash
# Start Storybook dev server
pnpm storybook

# Build static Storybook site
pnpm build-storybook

# Run Storybook tests
pnpm test-storybook

# Generate static build for CI/CD
pnpm build-storybook --output-dir storybook-static
```

## Checklist for Checkout Stories

Before finalizing stories, verify:

- [ ] All checkout components have corresponding stories
- [ ] Each story includes multiple variants (empty, filled, loading, error)
- [ ] Stories have proper `argTypes` with descriptions
- [ ] Mobile viewport stories created for responsive components
- [ ] Args use realistic test data matching checkout flows
- [ ] Stories tagged with autodocs for auto-documentation
- [ ] Action handlers defined for interactive elements
- [ ] Decorators applied for consistent styling/layout
- [ ] Stories follow naming convention (ComponentName.stories.tsx)
- [ ] Storybook builds successfully without errors
- [ ] Stories render correctly in different viewports
- [ ] Documentation descriptions added to meta

---

# Checkout Debugging and Troubleshooting

Systematically diagnose and resolve checkout-related issues through structured debugging approaches, log analysis, and common failure pattern identification.

## Prerequisites

Before debugging, establish your baseline understanding:

```bash
view .claude/CLAUDE.md                    # Checkout-specific patterns and known issues
view src/pages/checkout.page.ts           # Page object implementation
view src/specs/core/checkout*.spec.ts     # Existing test patterns
view src/test-data/checkout.data.ts       # Test data structure
```

## Common Checkout Issues

### 1. Form Field Visibility & Interaction Issues

**Problem**: Fields not visible, clickable, or unresponsive

**Diagnosis**:
```typescript
// Check if element exists and is visible
I.seeElement('[data-testid="contact-email"]');
I.seeElementInDOM('[data-testid="contact-email"]');

// Verify element is not hidden by CSS
const isVisible = await I.executeScript(() => {
  const el = document.querySelector('[data-testid="contact-email"]');
  return el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
});

// Check z-index and overlays
const element = await I.grabHTMLFromElement('[data-testid="contact-email"]');
```

**Solution Steps**:
1. Wait longer before interaction: `I.waitForElement('[data-testid="contact-email"]', 15);`
2. Scroll to element: `I.scrollIntoView('[data-testid="contact-email"]');`
3. Use CSS selector alternative if data-testid fails
4. Check for overlay elements blocking interaction: `I.seeElement('[data-testid="modal-overlay"]');`
5. Verify CSS visibility: `I.executeScript(() => document.querySelector('selector').offsetHeight);`

**Example Debug Scenario**:
```typescript
Scenario('Debug form field visibility', async () => {
  I.amOnPage('/checkout');
  
  // Try standard wait
  try {
    I.waitForElement('[data-testid="contact-email"]', 5);
  } catch (e) {
    I.say('Element not found in 5s, checking DOM...');
    const exists = await I.executeScript(() => {
      return !!document.querySelector('[data-testid="contact-email"]');
    });
    I.say(`Element in DOM: ${exists}`);
    
    if (exists) {
      const visibility = await I.executeScript(() => {
        const el = document.querySelector('[data-testid="contact-email"]');
        return {
          display: getComputedStyle(el).display,
          visibility: getComputedStyle(el).visibility,
          opacity: getComputedStyle(el).opacity,
          position: getComputedStyle(el).position,
        };
      });
      I.say(`CSS computed: ${JSON.stringify(visibility)}`);
    }
  }
});
```

### 2. Payment Form Timing Issues

**Problem**: Payment section not loading, fields empty after filling

**Diagnosis**:
```typescript
// Check payment section visibility
checkoutPage.waitForPaymentStep(15);  // Default 10s might be insufficient

// Verify payment fields are in DOM
I.seeElement('[data-testid="card-number-input"]');

// Check if form is prefilled or empty
const cardValue = await I.grabValueFrom('[data-testid="card-number-input"]');
I.say(`Card field value: ${cardValue}`);
```

**Common Causes**:
1. **Shipping method not selected** → Payment section depends on shipping
2. **Form submission in progress** → Payment hidden until shipping completes
3. **Third-party payment provider delay** → (Stripe, etc.) takes time to initialize
4. **Network latency** → Server-side processing for shipping options

**Solution Steps**:
```typescript
// 1. Ensure shipping method is selected before payment
await checkoutPage.selectShippingMethod(0);
await I.wait(2);  // Brief pause for form state update

// 2. Explicitly wait for payment section
I.waitForElement(locate('[data-testid="sf-toggle-card-payment"]').find('button'), 10);
I.click(locate('[data-testid="sf-toggle-card-payment"]').find('button'));
I.waitForElement('[data-testid="sf-toggle-card-payment-content"]', 15);

// 3. Additional wait for payment fields to render
I.waitForElement('[data-testid="card-number-input"]', 10);

// 4. Now fill payment
await checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);
```

**Example Debug Test**:
```typescript
Scenario('Debug payment form timing', async () => {
  const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
  checkoutPage.validatePageLoaded();
  
  await checkoutPage.fillContactInfo(generateTestEmail('debug'), TEST_SHIPPING_ADDRESS.phone);
  await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
  
  // Debug shipping selection
  I.say('Selecting shipping method...');
  const shippingStart = Date.now();
  await checkoutPage.selectShippingMethod(0);
  I.say(`Shipping selected in ${Date.now() - shippingStart}ms`);
  
  // Debug payment visibility
  I.say('Waiting for payment section...');
  const paymentStart = Date.now();
  try {
    I.waitForElement(locate('[data-testid="sf-toggle-card-payment"]').find('button'), 15);
    I.say(`Payment button found in ${Date.now() - paymentStart}ms`);
  } catch (e) {
    I.say(`Payment button NOT found after ${Date.now() - paymentStart}ms`);
    I.say('Checking page HTML...');
    const html = await I.grabPageSource();
    I.say(`Payment testid in DOM: ${'sf-toggle-card-payment' in html}`);
  }
});
```

### 3. Form Validation Error Handling

**Problem**: Validation errors not appearing, errors persisting after correction

**Diagnosis**:
```typescript
// Check for error elements
I.seeElement('[data-testid="contact-email-error"]');

// Grab error message text
const errorMsg = await I.grabTextFrom('[data-testid="contact-email-error"]');
I.say(`Error message: ${errorMsg}`);

// Verify error styling
const errorClass = await I.grabAttributeFrom('[data-testid="contact-email"]', 'class');
I.say(`Input classes: ${errorClass}`);
```

**Common Causes**:
1. **Validation on blur not on change** → Field shows error only after blur
2. **Error element rendered off-screen** → Needs scroll to see
3. **Stale validation state** → Previous error not cleared on new input
4. **Field not losing focus** → Validation doesn't trigger

**Solution Steps**:
```typescript
// 1. Fill field and ensure blur
I.fillField('[data-testid="contact-email"]', 'invalid@');
I.pressKey('Tab');  // Trigger blur
I.wait(1);

// 2. Verify error appears
I.seeElement('[data-testid="contact-email-error"]');

// 3. Fix and verify error clears
I.fillField('[data-testid="contact-email"]', 'valid@example.com');
I.wait(1);
I.dontSeeElement('[data-testid="contact-email-error"]');

// 4. If error persists, check form reset
I.click('[data-testid="clear-form-button"]');
I.dontSeeElement('[data-testid="contact-email-error"]');
```

### 4. Order Confirmation Not Appearing

**Problem**: Checkout completes but no confirmation page, stuck on payment form

**Diagnosis**:
```typescript
// Check current URL after submission
const currentUrl = await I.grabCurrentUrl();
I.say(`Current URL: ${currentUrl}`);

// Check for success elements
I.seeElement('[data-testid="order-confirmation"]');

// Check for error messages hidden on page
const pageText = await I.grabPageSource();
const hasError = pageText.includes('error') || pageText.includes('failed');
I.say(`Page contains error text: ${hasError}`);
```

**Common Causes**:
1. **Payment processing delay** → Takes longer than expected
2. **Network timeout** → Order submitted but response not received
3. **Validation still failing silently** → Form not actually submitting
4. **Redirect not happening** → Order created but navigation failed

**Solution Steps**:
```typescript
// 1. Add logging for submission
checkoutPage.clickPlaceOrder();

// 2. Wait longer for confirmation with explicit URL check
I.waitForElement('[data-testid="order-confirmation"]', 20);
// OR
I.waitForNavigation(() => checkoutPage.clickPlaceOrder());
I.see(/order|confirmation/i);

// 3. Check for errors on payment form
const errors = await checkoutPage.getPaymentValidationErrors();
if (errors.length > 0) {
  I.say(`Payment errors: ${errors.join(', ')}`);
  // Fix errors and retry
}

// 4. Verify order number exists
const orderNum = await checkoutPage.getOrderNumber();
expect(orderNum).to.not.be.empty;
```

### 5. Billing Address Logic Issues

**Problem**: Billing address checkbox not working, fields not appearing

**Diagnosis**:
```typescript
// Use page object methods — never interact with billing checkbox directly
const fieldsVisible = await checkoutPage.areBillingAddressFieldsVisible();
I.say(`Billing fields visible: ${fieldsVisible}`);
```

**Common Issues**:
1. **Checkbox not toggling** → Click event not firing
2. **Fields not appearing after toggle** → CSS animation or rendering delay
3. **Form state not updating** → Component state not synced with checkbox

**Solution Steps**:
```typescript
// Use page object methods for billing address toggle
checkoutPage.waitForUseDifferentBillingCheckbox();
await checkoutPage.checkUseDifferentBillingAddress();

// Verify billing fields appeared
const billingFieldsVisible = await checkoutPage.areBillingAddressFieldsVisible();
expect(billingFieldsVisible).to.be.true;
```

## Debugging Tools & Techniques

### 1. Page Source Inspection

```typescript
// Get full page HTML
const html = await I.grabPageSource();

// Search for specific element
const hasElement = html.includes('data-testid="checkout-form"');
I.say(`Form in DOM: ${hasElement}`);

// Log specific section
const section = await I.grabHTMLFromElement('[data-testid="payment-section"]');
I.say(`Payment section HTML: ${section}`);
```

### 2. JavaScript Execution for Debugging

```typescript
// Check element computed styles
const styles = await I.executeScript(() => {
  const el = document.querySelector('[data-testid="contact-email"]');
  const computed = getComputedStyle(el);
  return {
    display: computed.display,
    visibility: computed.visibility,
    opacity: computed.opacity,
    height: computed.height,
    width: computed.width,
  };
});
I.say(`Element styles: ${JSON.stringify(styles)}`);

// Check for JavaScript errors in console
const errors = await I.executeScript(() => {
  return window.__errors || [];
});
I.say(`Console errors: ${errors.join(', ')}`);
```

### 3. Network Activity Monitoring

```typescript
// Capture network logs (Playwright/Puppeteer)
I.startRecordingTraffic();
await checkoutPage.fillPaymentInfo(TEST_PAYMENT);
checkoutPage.clickPlaceOrder();
const traffic = await I.grabRecordedNetworkTraffic();

// Find payment API call
const paymentCall = traffic.find(req => req.url.includes('/payment'));
I.say(`Payment API status: ${paymentCall?.statusCode}`);
I.say(`Payment API response: ${JSON.stringify(paymentCall?.response)}`);
```

### 4. Screenshot & Video Debugging

```typescript
// Take screenshot at failure point
I.takeScreenshot('checkout-payment-error');

// Enable video recording for test run
// In codecept.conf.js:
// {
//   name: 'Browser',
//   video: { enabled: true, outputPath: './videos/' }
// }
```

## Debugging Workflow

### Step 1: Reproduce the Issue

```typescript
Scenario('Reproduce checkout failure', async () => {
  // Run exact same steps as failing test
  const productInfo = await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
  expect(productInfo).to.not.be.undefined;
  
  checkoutPage.validatePageLoaded();
  
  await checkoutPage.fillContactInfo(generateTestEmail('debug'), TEST_SHIPPING_ADDRESS.phone);
  // ... continue through failure point
});
```

### Step 2: Add Targeted Logging

```typescript
Scenario('Debug with logging', async () => {
  // Add I.say() statements before problematic lines
  I.say('Starting checkout...');
  
  await checkoutPage.fillContactInfo(generateTestEmail('debug'), TEST_SHIPPING_ADDRESS.phone);
  I.say('Contact info filled');
  
  await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
  I.say('Shipping address filled');
  
  await checkoutPage.selectShippingMethod(0);
  I.say('Shipping method selected');
  
  // Add data inspection before assertions
  const orderNum = await checkoutPage.getOrderNumber();
  I.say(`Order number: ${orderNum}`);
  
  expect(orderNum).to.not.be.empty;
});
```

### Step 3: Inspect DOM at Failure

```typescript
// Add debug method to page object
async debugCheckoutState() {
  const html = await I.grabPageSource();
  const contactSection = await I.grabHTMLFromElement('[data-testid="contact-section"]');
  const shippingSection = await I.grabHTMLFromElement('[data-testid="shipping-section"]');
  const paymentSection = await I.grabHTMLFromElement('[data-testid="payment-section"]');
  
  return {
    contactHTML: contactSection,
    shippingHTML: shippingSection,
    paymentHTML: paymentSection,
  };
}

// Use in test
Scenario('Debug with DOM inspection', async () => {
  // ... steps leading to issue ...
  
  if (!foundElement) {
    const state = await checkoutPage.debugCheckoutState();
    I.say(`Payment section HTML: ${state.paymentHTML}`);
  }
});
```

### Step 4: Isolate the Problem

```typescript
// Test payment section independently
Scenario('Isolate payment form issue', async () => {
  // Skip to payment section
  I.amOnPage('/checkout');
  
  // Manually set up state for payment form testing
  await I.executeScript(() => {
    // Set cart items in localStorage
    localStorage.setItem('cart', JSON.stringify(mockCart));
    // Trigger payment section visibility
    window.__showPaymentForm?.();
  });
  
  // Now test payment form in isolation
  I.seeElement('[data-testid="card-number-input"]');
  await checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);
});
```

## Log Analysis

### 1. Test Execution Logs

```bash
# Run with verbose logging
pnpm e2e --grep "Checkout" --verbose

# Capture full output to file
pnpm e2e --grep "Checkout" > test-run.log 2>&1

# Check for common errors
grep -i "error\|timeout\|failed" test-run.log
```

### 2. Application Logs

```bash
# Check browser console errors
# In page object:
async checkForConsoleErrors() {
  const logs = await I.executeScript(() => window.console.errors || []);
  return logs;
}

# Check application-specific logging
const appLogs = await I.grabTextFrom('[data-testid="debug-console"]');
I.say(`App logs: ${appLogs}`);
```

### 3. API Response Validation

```typescript
// Validate payment API response
const traffic = await I.grabRecordedNetworkTraffic();
const paymentResponse = traffic.find(req => req.url.includes('/api/payment'));

if (paymentResponse?.statusCode !== 200) {
  I.say(`Payment API failed: ${paymentResponse?.statusCode}`);
  I.say(`Response: ${JSON.stringify(paymentResponse?.response)}`);
}
```

## Debugging Checklist

Before escalating checkout issues:

- [ ] Reproduced issue consistently (not flaky)
- [ ] Verified issue is not environment-specific (run on different machine/browser)
- [ ] Checked page object methods for recent changes
- [ ] Verified test data is valid and up-to-date
- [ ] Confirmed element selectors match current UI (data-testid not changed)
- [ ] Checked browser console for JavaScript errors
- [ ] Verified network requests are successful (200-level status codes)
- [ ] Added wait times if timing-related
- [ ] Isolated issue to specific form section (contact, shipping, billing, payment)
- [ ] Compared with passing test to identify differences
- [ ] Taken screenshots at failure point
- [ ] Checked for flaky waits (insufficient timeout for slow environments)
- [ ] Verified test runs in isolation (not affected by other tests)

## Command Reference for Debugging

```bash
# Run single test with debug
DEBUG=* pnpm e2e --grep "specific test name" --verbose

# Run with screenshots on failure
pnpm e2e --grep "Checkout" --screenshot "on failure"

# Run with extended timeout (for slow environments)
TIMEOUT=30000 pnpm e2e --grep "Checkout"

# Run specific checkout section
pnpm e2e --grep "(?=.*@checkout)(?=.*@payment-validation)"

# View test report
open mochawesome-report/mochawesome.html
```

This debugging guide provides systematic approaches to diagnose and resolve common checkout issues through structured investigation, log analysis, and targeted testing.

---

# Checkout Performance Analysis

Monitor and optimize checkout flow performance through metrics collection, bottleneck identification, and performance regression detection.

## Prerequisites

Before analyzing checkout performance, set up monitoring infrastructure:

```bash
view .claude/CLAUDE.md                    # Performance baselines and SLAs
view src/pages/checkout.page.ts           # Page object implementation
view src/specs/core/checkout*.spec.ts     # Test patterns
view src/test-data/checkout.data.ts       # Test data
```

## Performance Metrics to Track

### 1. Page Load Metrics

**Key Indicators**:
- **Time to Interactive (TTI)**: When checkout form becomes usable
- **First Contentful Paint (FCP)**: When first content renders
- **Largest Contentful Paint (LCP)**: When main checkout content is visible
- **Cumulative Layout Shift (CLS)**: Visual stability during page load

### 2. Form Interaction Metrics

**Key Indicators**:
- **Time to Fill Contact Form**: Latency for contact info section
- **Time to Fill Shipping Address**: Address form completion time
- **Time for Shipping Methods to Load**: API response time for shipping options
- **Time to Payment Form Visibility**: Payment section render time
- **Form Submission Latency**: Time from submit click to server response

### 3. Network Performance Metrics

**Key Indicators**:
- **API Response Time**: Backend processing latency
- **Shipping Options API**: Time to fetch available shipping methods
- **Payment Gateway Response**: Payment processor latency
- **Order Submission Response**: Final order creation latency

### 4. JavaScript Execution Metrics

**Key Indicators**:
- **Long Tasks**: JavaScript execution blocking rendering
- **Total Blocking Time (TBT)**: Time blocked by JavaScript
- **Frame Rate Drops**: Performance jank during interactions

## Performance Testing Workflow

### Step 1: Establish Baseline Metrics

Create tests that capture:
- Page load time (should be < 3 seconds)
- Form interaction latency (should be < 500ms per field)
- API response times (should be < 1 second)
- Total checkout flow time (should be < 15 seconds)

### Step 2: Measure Critical User Journeys

Test both:
- **Guest checkout**: Unregistered users without saved data
- **Registered shopper**: Users with prefilled addresses and payment methods

### Step 3: Identify Performance Bottlenecks

Monitor network traffic to find:
- Slow API calls (>500ms response time)
- Large responses (>500KB payload)
- Unnecessary requests

### Step 4: Monitor for Performance Regressions

Set baselines and alert on:
- 10% WARNING threshold above baseline
- 30% CRITICAL threshold above baseline

## Performance Optimization Patterns

### 1. Reduce API Response Time
- Add HTTP caching headers
- Implement request batching
- Use CDN for static shipping rate data
- Optimize database queries

### 2. Improve Form Rendering Performance
- Virtualize long form field lists
- Debounce validation checks
- Use lazy validation on blur instead of onChange
- Memoize form components

### 3. Optimize Bundle Size
- Code split payment form into separate bundle
- Remove unused dependencies
- Tree-shake unused exports
- Compress images

## Performance Checklist

Before shipping checkout changes:

- [ ] Baseline metrics captured for current code
- [ ] Performance tests running in CI/CD pipeline
- [ ] No regressions detected (within 10% of baseline)
- [ ] Page load time < 3 seconds
- [ ] Form interaction latency < 500ms per field
- [ ] API response times < 1 second
- [ ] Total checkout flow < 15 seconds
- [ ] Large API responses compressed (gzip)
- [ ] Unused dependencies removed
- [ ] Long tasks identified and optimized
- [ ] Performance report generated and reviewed
- [ ] Team alerted to any regressions

## Command Reference

```bash
# Run performance tests
pnpm e2e --grep "@performance"

# Run with performance tracking
pnpm e2e --grep "@performance" --performance-tracking

# Generate performance report
pnpm e2e --grep "@performance" --report performance

# Compare against baseline
pnpm e2e:compare-performance baseline.json current.json
```

This performance analysis guide helps maintain optimal checkout experience through systematic metrics tracking, bottleneck identification, and regression prevention.
