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
export const mockImageWithText = {
    ITCLink: 'https://salesforce.com',
    ITCText:
        '<p><em>Text</em> <strong>Below</strong> <u>Image</u> <s>test</s> Image With Text Component <a href="https://zzrf-001.dx.commercecloud.salesforce.com/s/RefArchGlobal/homepage-example.html?lang=en_US" target="_self" data-link-type="page" data-link-label="homepage-example" data-content-page-id="homepage-example">Home-page example link</a><img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Library-Sites-RefArchSharedLibrary/default/dw89c1031d/images/myaccount_addresses.png" alt="alt tag myaccount_addresses image"></p>',
    image: {
        _type: 'Image',
        focalPoint: {
            _type: 'Imagefocalpoint',
            x: 0.5,
            y: 0.5,
        },
        metaData: {
            _type: 'Imagemetadata',
            height: 1280,
            width: 1920,
        },
        url: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Library-Sites-RefArchSharedLibrary/default/dw34c389b5/images/SearchBanner/search.jpg',
    },
    heading:
        '<p><em>Text</em> <strong>Overlay</strong> <s>test</s> <u>Image</u> With Text <a href="https://zzrf-001.dx.commercecloud.salesforce.com/s/RefArchGlobal/mens/?lang=en_US" target="_self" data-link-type="category" data-link-label="Mens" data-category-id="mens" data-category-catalog-id="storefront-catalog-m-en">Component Link</a><img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Library-Sites-RefArchSharedLibrary/default/dw2d9142bf/images/myaccount_registry.png" alt="alt text myaccount_registry image"></p>',
    alt: 'Alt Text test Image With Text Component',
};
