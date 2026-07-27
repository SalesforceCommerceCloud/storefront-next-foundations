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
/**
 * Shopper Context Constants
 *
 * Constants for Shopper Context API integration, including field types and
 * URL query parameter mappings.
 */
export const SHOPPER_CONTEXT_FIELD_TYPES = {
    INT: 'int',
    DOUBLE: 'double',
    ARRAY: 'array',
} as const;

/**
 * Mapping structure for URL query parameters to Shopper Context API fields
 * Each entry has:
 * - paramName: URL query parameter name
 * - apiFieldName: Optional API field name (defaults to paramName if not provided)
 * Note: type and category fields are reserved for future use
 */
export const QUALIFIER_MAPPING_PARAM_NAME = 'paramName' as const;
export const QUALIFIER_MAPPING_API_FIELD_NAME = 'apiFieldName' as const;
export const QUALIFIER_MAPPING_CATEGORY = 'category' as const;

/**
 * API field name for source code qualifier
 */
export const SOURCE_CODE_API_FIELD_NAME = 'sourceCode' as const;

/**
 * Category for custom qualifiers
 */
export const CUSTOM_QUALIFIERS_CATEGORY = 'customQualifiers' as const;

export type QualifierMapping = {
    [QUALIFIER_MAPPING_PARAM_NAME]: string;
    [QUALIFIER_MAPPING_API_FIELD_NAME]?: string;
    [QUALIFIER_MAPPING_CATEGORY]?: string;
    // type?: 'int' | 'double' | 'array';
};

/**
 * Map of allowed URL query parameters to shopper context qualifiers
 *
 * Parameters can be:
 * - Root-level qualifiers (e.g., src -> sourceCode)
 * - Nested in customQualifiers object
 */
export const SHOPPER_CONTEXT_SEARCH_PARAMS: {
    [key: string]: QualifierMapping | { [key: string]: QualifierMapping };
} = {
    // Root-level qualifiers
    src: {
        [QUALIFIER_MAPPING_PARAM_NAME]: 'src',
        [QUALIFIER_MAPPING_API_FIELD_NAME]: 'sourceCode',
    },
    /*
     * Uncomment to enable — these qualifiers affect pricing and promotions.
     * See docs/README-SHOPPER-CONTEXT.md for security considerations.
     *
     * effectiveDateTime: {
     *     [QUALIFIER_MAPPING_PARAM_NAME]: 'effectiveDateTime',
     *     [QUALIFIER_MAPPING_API_FIELD_NAME]: 'effectiveDateTime',
     * },
     * customerGroupIds: {
     *     [QUALIFIER_MAPPING_PARAM_NAME]: 'customerGroupIds',
     *     [QUALIFIER_MAPPING_API_FIELD_NAME]: 'customerGroupIds',
     * },
     */
    customQualifiers: {
        // Add custom qualifiers here
        // Each qualifier maps a URL query parameter to a customQualifiers field in the Shopper Context API
        deviceType: {
            [QUALIFIER_MAPPING_PARAM_NAME]: 'deviceType',
            [QUALIFIER_MAPPING_API_FIELD_NAME]: 'deviceType',
            [QUALIFIER_MAPPING_CATEGORY]: CUSTOM_QUALIFIERS_CATEGORY,
        },
        // ipAddress: {
        //     paramName: 'ipAddress',
        //     apiFieldName: 'ipAddress',
        //     category: 'customQualifiers',
        // },
        //
        // Usage: ?deviceType=mobile&ipAddress=192.168.1.1
        // Results in: { customQualifiers: { deviceType: 'mobile', ipAddress: '192.168.1.1' } }
    },
    assignmentQualifiers: {
        store: {
            [QUALIFIER_MAPPING_PARAM_NAME]: 'store',
            [QUALIFIER_MAPPING_API_FIELD_NAME]: 'store',
        },
    },
    couponCodes: {
        [QUALIFIER_MAPPING_PARAM_NAME]: 'couponCodes',
        [QUALIFIER_MAPPING_API_FIELD_NAME]: 'couponCodes',
    },
};

/**
 * Base cookie names.
 */
export const SHOPPER_CONTEXT_COOKIE_NAME_BASE = 'storefront-next-context';
export const SOURCE_CODE_COOKIE_NAME_BASE = 'dwsourcecode';

/**
 * Server action name for updating shopper context (route path segment).
 */
export const SHOPPER_CONTEXT_ACTION_NAME = 'update-shopper-context';

/**
 * Shopper context cookie expiry in seconds (6 hours).
 */
export const SHOPPER_CONTEXT_COOKIE_EXPIRY_SECONDS = 6 * 60 * 60;

/**
 * Source code cookie expiry in seconds (30 days).
 */
export const SOURCE_CODE_COOKIE_EXPIRY_SECONDS = 30 * 24 * 60 * 60;
