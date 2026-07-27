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
import { useMemo } from 'react';
import { useDesignState } from './useDesignState';
import { isComponentTypeAllowedInRegion } from '../utils/regionUtils';

export function useRegionDecoratorClasses({
    regionId,
    componentTypeInclusions,
    componentTypeExclusions,
}: {
    regionId: string;
    componentTypeInclusions: string[];
    componentTypeExclusions: string[];
}): string {
    const {
        dragState: { currentDropTarget, componentType },
    } = useDesignState();

    const isHovered = regionId && currentDropTarget?.regionId === regionId;

    const isComponentAllowed = useMemo(
        () => isComponentTypeAllowedInRegion(componentType, componentTypeInclusions, componentTypeExclusions),
        [componentType, componentTypeInclusions, componentTypeExclusions]
    );

    // Only show hover state if the region is hovered and the component is allowed
    const shouldShowHover = isHovered && isComponentAllowed;

    return [
        'pd-design__decorator',
        'pd-design__region',
        shouldShowHover && 'pd-design__region--hovered pd-design__frame--visible',
    ]
        .filter(Boolean)
        .join(' ');
}
