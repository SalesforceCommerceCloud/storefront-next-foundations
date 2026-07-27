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

interface ImageGroupOptions {
    viewType: string;
    selectedVariationAttributes?: Record<string, string>;
}

/**
 * Find the ImageGroup that matches the criteria supplied
 *
 * @param imageGroups - The product/variations image groups you want to search.
 * @param options - Search criteria to match on the ImageGroup object.
 * @returns The ImageGroup matching the search criteria
 */
export const findImageGroupBy = (
    imageGroups: ShopperProducts.schemas['ImageGroup'][] = [],
    options: ImageGroupOptions
): ShopperProducts.schemas['ImageGroup'] | undefined => {
    const { viewType } = options;
    let { selectedVariationAttributes = {} } = options;

    // Start by filtering out any imageGroup that isn't the correct viewType.
    imageGroups = imageGroups.filter(({ viewType: imageGroupViewType }) => imageGroupViewType === viewType);

    // Not all variation attributes are reflected in images. For example, you probably
    // won't have a separate image group for various sizes, but you might for colors. For that
    // reason we need to know what are valid attribute values to filter on.
    const refinableAttributeIds = [
        ...new Set(
            imageGroups.reduce(
                (acc: string[], { variationAttributes = [] }) => [
                    ...acc,
                    ...variationAttributes.map((attr) => attr.id),
                ],
                []
            )
        ),
    ];

    // Update the `selectedVariationAttributes` by filtering out the attributes that have no
    // representation in this imageGroup.
    selectedVariationAttributes = Object.keys(selectedVariationAttributes).reduce(
        (acc: Record<string, string>, curr: string) => {
            return refinableAttributeIds.includes(curr)
                ? {
                      ...acc,
                      [`${curr}`]: selectedVariationAttributes[curr],
                  }
                : acc;
        },
        {}
    );

    // Find the image group that has all the selected variation value attributes.
    const foundImageGroup = imageGroups.find(({ variationAttributes = [] }) => {
        const selectedIds = Object.keys(selectedVariationAttributes);

        return selectedIds.every((selectedId) => {
            const selectedValue = selectedVariationAttributes[selectedId];

            return variationAttributes.find(
                ({ id, values }) => id === selectedId && values?.every(({ value }) => value === selectedValue)
            );
        });
    });

    return foundImageGroup;
};
