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
import type { ReactElement } from 'react';
import type { ShopperSearch } from '@/scapi';
import { Checkbox } from '@/components/ui/checkbox';
import type { RefinementProps } from '../types';

export default function DefaultRefinement({
    values,
    attributeId,
    isFilterSelected,
    toggleFilter,
}: RefinementProps): ReactElement {
    return (
        <div className="space-y-1 mt-2">
            {values.map((value: ShopperSearch.schemas['ProductSearchRefinementValue'], idx) => {
                const id = `refine-${attributeId}-${idx}`;
                const isSelected = isFilterSelected(attributeId, value.value);

                return (
                    <label
                        key={`${attributeId}:${value.value}`}
                        htmlFor={id}
                        className="flex items-center p-2 hover:bg-muted/30 cursor-pointer">
                        <Checkbox
                            id={id}
                            checked={isSelected}
                            onCheckedChange={() => toggleFilter(attributeId, value.value)}
                            className="size-4"
                        />
                        <span className="ml-3 text-sm font-medium">{value.label || value.value}</span>
                        {value.hitCount !== undefined && (
                            <span className="ml-auto text-xs bg-muted/50 px-2 py-1 rounded-full">{value.hitCount}</span>
                        )}
                    </label>
                );
            })}
        </div>
    );
}
