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

Feature('Checkout Registered Shopper Addresses & Billing Tests').tag('@core').tag('@checkout');

const {
    checkoutPage,
    apiCartSetupFlow,
    registeredShopperSetupFlow,
    apiLoginFlow,
    storefrontPage,
    accountAddressesPage,
} = inject();
import { expect } from 'chai';
import { TEST_SHIPPING_ADDRESS, TEST_PAYMENT, TEST_PRODUCT_CATEGORIES } from '../../test-data/checkout.data';

After(async (test: unknown) => {
    const tags = (test as { tags?: string[] }).tags ?? [];
    if (Array.isArray(tags) && tags.includes('@registered-shopper')) {
        await storefrontPage.logout();
    }
});

Scenario('Registered shopper checkout with saved shipping address', async () => {
    const setupResult = await registeredShopperSetupFlow.execute();

    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    await checkoutPage.expandShippingAddressForSavedAddresses();

    const hasSavedAddresses = await checkoutPage.isSavedAddressesListVisible();
    expect(hasSavedAddresses).to.be.true;

    const addressCount = await checkoutPage.getSavedAddressCount();
    expect(addressCount).to.be.at.least(1);

    checkoutPage.clickContinueToShippingOptions();

    const previewText = await checkoutPage.getShippingAddressPreviewText();
    expect(previewText).to.include(setupResult.addressData.city);

    await checkoutPage.selectShippingMethod(0);

    const orderNumber = await checkoutPage.completeCheckout({
        email: setupResult.signupData.email,
        shippingAddress: setupResult.addressData,
        payment: TEST_PAYMENT,
    });

    expect(orderNumber).to.not.be.empty;
    expect(orderNumber).to.match(/^\d+$/);
})
    .tag('@registered-shopper')
    .tag('@place-order');

Scenario('Registered shopper can use different billing address', async () => {
    const customBillingAddress = {
        firstName: 'Jane',
        lastName: 'Billing',
        address1: '789 Payment Street',
        city: 'New York',
        stateCode: 'NY',
        postalCode: '10001',
    };

    await apiLoginFlow.executeWithEnsuredCredentials();

    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.selectShippingMethod(0);

    await checkoutPage.expandPaymentStep();

    await checkoutPage.selectNewCardPaymentMethod();
    checkoutPage.waitForUseDifferentBillingCheckbox();

    await checkoutPage.checkUseDifferentBillingAddress();

    const billingFieldsVisible = await checkoutPage.areBillingAddressFieldsVisible();
    expect(billingFieldsVisible).to.be.true;

    await checkoutPage.fillBillingAddress(customBillingAddress);
    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);
    checkoutPage.clickPlaceOrder();

    checkoutPage.waitForOrderConfirmation();
    checkoutPage.validateOrderConfirmation();
    const orderNumber = await checkoutPage.getOrderNumber();

    expect(orderNumber).to.not.be.empty;
    expect(orderNumber).to.match(/^\d+$/);
})
    .tag('@registered-shopper')
    .tag('@billing-address')
    .tag('@place-order');

Scenario('Registered shopper billing address is saved when using different billing address', async () => {
    await registeredShopperSetupFlow.execute();

    const customBillingAddress = {
        firstName: 'NewBilling',
        lastName: 'AddressTest',
        address1: '999 Billing Lane',
        city: 'Seattle',
        stateCode: 'WA',
        postalCode: '98101',
    };

    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    await checkoutPage.expandShippingAddressForSavedAddresses();
    checkoutPage.clickContinueToShippingOptions();
    await checkoutPage.selectShippingMethod(0);

    await checkoutPage.expandPaymentStep();
    await checkoutPage.selectNewCardPaymentMethod();
    checkoutPage.waitForUseDifferentBillingCheckbox();

    await checkoutPage.checkUseDifferentBillingAddress();
    const billingFieldsVisible = await checkoutPage.areBillingAddressFieldsVisible();
    expect(billingFieldsVisible).to.be.true;

    await checkoutPage.fillBillingAddress(customBillingAddress);
    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);
    checkoutPage.clickPlaceOrder();

    checkoutPage.waitForOrderConfirmation();
    checkoutPage.validateOrderConfirmation();
    const orderNumber = await checkoutPage.getOrderNumber();
    expect(orderNumber).to.not.be.empty;
    expect(orderNumber).to.match(/^\d+$/);

    accountAddressesPage.navigate();
    accountAddressesPage.validatePageLoaded();

    const addressCount = await accountAddressesPage.getAddressCount();
    expect(addressCount).to.be.at.least(2);

    const addressCardTexts: string[] = [];
    for (let i = 0; i < addressCount; i++) {
        const cardText = await accountAddressesPage.getAddressCardText(i);
        addressCardTexts.push(cardText);
    }

    const billingAddressSaved = addressCardTexts.some(
        (text) =>
            text.includes(customBillingAddress.firstName) &&
            text.includes(customBillingAddress.lastName) &&
            text.includes(customBillingAddress.address1) &&
            text.includes(customBillingAddress.city)
    );

    expect(billingAddressSaved).to.be.true;
})
    .tag('@registered-shopper')
    .tag('@billing-address-persistence')
    .tag('@place-order');

Scenario('Registered shopper billing address is not duplicated when already saved', async () => {
    await registeredShopperSetupFlow.execute();

    accountAddressesPage.navigate();
    accountAddressesPage.validatePageLoaded();

    const initialAddressCount = await accountAddressesPage.getAddressCount();
    expect(initialAddressCount).to.be.at.least(1);

    const secondBillingAddress = accountAddressesPage.createTestAddress(1);

    const updatedAddressCount = await accountAddressesPage.getAddressCount();
    expect(updatedAddressCount).to.equal(initialAddressCount + 1);

    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    const testShippingAddress = {
        firstName: 'Shipping',
        lastName: 'Test',
        address1: '555 Shipping Street',
        city: 'Portland',
        stateCode: 'OR',
        postalCode: '97201',
    };

    await checkoutPage.fillShippingAddress(testShippingAddress);
    await checkoutPage.selectShippingMethod(0);

    await checkoutPage.expandPaymentStep();
    await checkoutPage.selectNewCardPaymentMethod();
    checkoutPage.waitForUseDifferentBillingCheckbox();

    await checkoutPage.checkUseDifferentBillingAddress();
    await checkoutPage.fillBillingAddress(secondBillingAddress);
    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);
    checkoutPage.clickPlaceOrder();

    checkoutPage.waitForOrderConfirmation();
    checkoutPage.validateOrderConfirmation();
    const orderNumber = await checkoutPage.getOrderNumber();
    expect(orderNumber).to.not.be.empty;

    accountAddressesPage.navigate();
    accountAddressesPage.validatePageLoaded();

    const finalAddressCount = await accountAddressesPage.getAddressCount();
    expect(finalAddressCount).to.equal(updatedAddressCount);
})
    .tag('@registered-shopper')
    .tag('@billing-address-persistence')
    .tag('@place-order');

Scenario('Registered shopper reusing shipping as billing does not save new address', async () => {
    await registeredShopperSetupFlow.execute();

    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    accountAddressesPage.navigate();
    accountAddressesPage.validatePageLoaded();
    const initialAddressCount = await accountAddressesPage.getAddressCount();

    await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    await checkoutPage.expandShippingAddressForSavedAddresses();
    checkoutPage.clickContinueToShippingOptions();
    await checkoutPage.selectShippingMethod(0);

    await checkoutPage.expandPaymentStep();
    await checkoutPage.selectNewCardPaymentMethod();
    checkoutPage.waitForUseDifferentBillingCheckbox();

    const isDifferentBillingBefore = await checkoutPage.isUsingDifferentBillingAddress();
    expect(isDifferentBillingBefore).to.be.false;

    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);
    checkoutPage.clickPlaceOrder();

    checkoutPage.waitForOrderConfirmation();
    checkoutPage.validateOrderConfirmation();
    const orderNumber = await checkoutPage.getOrderNumber();
    expect(orderNumber).to.not.be.empty;

    accountAddressesPage.navigate();
    accountAddressesPage.validatePageLoaded();

    const finalAddressCount = await accountAddressesPage.getAddressCount();
    expect(finalAddressCount).to.equal(initialAddressCount);
})
    .tag('@registered-shopper')
    .tag('@billing-address-persistence')
    .tag('@place-order');

Scenario('Registered shopper can select saved billing address from dropdown', async () => {
    await registeredShopperSetupFlow.execute();

    await checkoutPage.addMultipleAddressesToProfile([
        {
            addressId: `addr_billing_${Date.now()}_1`,
            firstName: 'Billing',
            lastName: 'Address1',
            address1: '111 Billing Street',
            city: 'Chicago',
            stateCode: 'IL',
            postalCode: '60601',
            countryCode: 'US',
            phone: '3125551111',
            preferred: false,
        },
        {
            addressId: `addr_billing_${Date.now()}_2`,
            firstName: 'Billing',
            lastName: 'Address2',
            address1: '222 Billing Avenue',
            city: 'Houston',
            stateCode: 'TX',
            postalCode: '77001',
            countryCode: 'US',
            phone: '7135552222',
            preferred: false,
        },
        {
            addressId: `addr_billing_${Date.now()}_3`,
            firstName: 'Billing',
            lastName: 'Address3',
            address1: '333 Billing Boulevard',
            city: 'Phoenix',
            stateCode: 'AZ',
            postalCode: '85001',
            countryCode: 'US',
            phone: '6025553333',
            preferred: false,
        },
    ]);

    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    await checkoutPage.expandShippingAddressForSavedAddresses();
    checkoutPage.clickContinueToShippingOptions();
    await checkoutPage.selectShippingMethod(0);

    await checkoutPage.expandPaymentStep();
    await checkoutPage.selectNewCardPaymentMethod();
    checkoutPage.waitForUseDifferentBillingCheckbox();

    await checkoutPage.checkUseDifferentBillingAddress();
    await checkoutPage.selectSavedBillingAddress(1);

    const billingFormVisible = await checkoutPage.isBillingAddressFormVisible();
    expect(billingFormVisible, 'Billing address form fields should be hidden after selecting saved address').to.be
        .false;

    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);
    checkoutPage.clickPlaceOrder();
    checkoutPage.waitForOrderConfirmation();
    checkoutPage.validateOrderConfirmation();
    const orderNumber = await checkoutPage.getOrderNumber();

    expect(orderNumber, 'Order number should be returned').to.not.be.empty;
    expect(orderNumber, 'Order number should be numeric').to.match(/^\d+$/);
})
    .tag('@registered-shopper')
    .tag('@saved-billing-address')
    .tag('@billing-dropdown')
    .tag('@place-order');

Scenario('Billing dropdown auto-selects first saved address instead of showing empty placeholder', async () => {
    await registeredShopperSetupFlow.execute();

    // Add a second address that differs from the shipping address so it appears
    // in the billing dropdown (billingAddressOptions filters out the shipping address)
    await checkoutPage.addMultipleAddressesToProfile([
        {
            addressId: `addr_billing_autosel_${Date.now()}`,
            firstName: 'Billing',
            lastName: 'AutoSelect',
            address1: '456 Billing Road',
            city: 'Denver',
            stateCode: 'CO',
            postalCode: '80201',
            countryCode: 'US',
            phone: '3035551234',
            preferred: false,
        },
    ]);

    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    await checkoutPage.expandShippingAddressForSavedAddresses();
    checkoutPage.clickContinueToShippingOptions();
    await checkoutPage.selectShippingMethod(0);

    await checkoutPage.expandPaymentStep();
    await checkoutPage.selectNewCardPaymentMethod();
    checkoutPage.waitForUseDifferentBillingCheckbox();

    await checkoutPage.checkUseDifferentBillingAddress();
    const isChecked = await checkoutPage.isUsingDifferentBillingAddress();
    expect(isChecked, '"Use a different billing address" should be checked').to.be.true;

    // Core assertion: dropdown should show a selected address, NOT "Select an address" placeholder
    const dropdownText = await checkoutPage.getBillingDropdownSelectedText();
    expect(dropdownText, 'Billing dropdown should have a selected address').to.not.be.null;
    expect(dropdownText, 'Billing dropdown should not show empty placeholder').to.not.match(/select an address/i);
    expect((dropdownText ?? '').length, 'Billing dropdown should show a formatted address').to.be.greaterThan(5);

    // Address form fields should be hidden since a saved address is auto-selected (not "Add new")
    const billingFormVisible = await checkoutPage.isBillingAddressFormVisible();
    expect(billingFormVisible, 'Billing address form should be hidden when saved address is selected').to.be.false;
})
    .tag('@registered-shopper')
    .tag('@billing-autoselect');
