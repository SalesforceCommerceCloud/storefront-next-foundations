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
import type { ShopperProducts } from '@/scapi';
import type { ParseKeys } from 'i18next';
import type { PdpSectionApiMethod } from '@/extensions/product-content/lib/api/product-content.server';

export type PdpSection = {
    apiMethod: PdpSectionApiMethod;
    labelKey: ParseKeys<'product'>;
};

/**
 * Returns the ordered list of collapsible sections to render on the PDP.
 *
 * This function is the intended customisation point for merchants. Override it
 * to vary sections by product category, type, or any custom attribute set in
 * Business Manager. The function runs synchronously during SSR so the correct
 * shells are rendered on the first paint — no layout shift.
 *
 * @example Vary by primary category
 * ```ts
 * if (/clothing|footwear/i.test(product.primaryCategoryId ?? '')) {
 *     return [
 *         { apiMethod: 'getIngredientsData', labelKey: 'materials' },
 *         { apiMethod: 'getCareInstructions', labelKey: 'careInstructions' },
 *     ];
 * }
 * return [
 *     { apiMethod: 'getIngredientsData',   labelKey: 'materials'         },
 *     { apiMethod: 'getUsageInstructions', labelKey: 'usageInstructions' },
 *     { apiMethod: 'getCareInstructions',  labelKey: 'careInstructions'  },
 *     { apiMethod: 'getTechSpecs',         labelKey: 'specifications'    },
 * ];
 * ```
 *
 * @example Vary by custom attribute set per-product in Business Manager
 * ```ts
 * const allSections: PdpSection[] = [
 *     { apiMethod: 'getIngredientsData',   labelKey: 'materials'         },
 *     { apiMethod: 'getUsageInstructions', labelKey: 'usageInstructions' },
 *     { apiMethod: 'getCareInstructions',  labelKey: 'careInstructions'  },
 *     { apiMethod: 'getTechSpecs',         labelKey: 'specifications'    },
 * ];
 * const ids = product.c_pdpSections as string[] | undefined;
 * return ids?.length ? allSections.filter(s => ids.includes(s.apiMethod)) : allSections;
 * ```
 */
export function resolvePdpSections(_product: ShopperProducts.schemas['Product']): PdpSection[] {
    return [
        { apiMethod: 'getIngredientsData', labelKey: 'materials' },
        { apiMethod: 'getUsageInstructions', labelKey: 'usageInstructions' },
        { apiMethod: 'getCareInstructions', labelKey: 'careInstructions' },
        { apiMethod: 'getTechSpecs', labelKey: 'specifications' },
    ];
}
