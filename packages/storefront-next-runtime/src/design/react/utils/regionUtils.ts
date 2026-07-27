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
 * Checks if a component type is allowed in a region based on inclusion and exclusion rules.
 *
 * @param componentType - The type of component being checked
 * @param componentTypeInclusions - Array of allowed component types (if empty, all types are allowed by default)
 * @param componentTypeExclusions - Array of forbidden component types
 * @returns true if the component type is allowed, false otherwise
 */
export function isComponentTypeAllowedInRegion(
    componentType: string | undefined,
    componentTypeInclusions: string[],
    componentTypeExclusions: string[]
): boolean {
    if (!componentType) {
        return false;
    }

    if (componentTypeExclusions?.includes(componentType)) {
        return false;
    }

    // If there are inclusions specified, the component type must be in the list
    if (componentTypeInclusions?.length > 0) {
        return componentTypeInclusions.includes(componentType);
    }

    return true;
}
