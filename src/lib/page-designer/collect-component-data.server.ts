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
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperExperience } from '@/scapi';
import { registry } from '@/lib/page-designer/registry';

/**
 * Recursively collect component data promises from regions
 */
export function collectFromRegions(
    ctx: LoaderFunctionArgs,
    regions: ShopperExperience.schemas['Region'][] | undefined,
    map: Record<string, Promise<unknown>>
): void {
    if (!regions) return;

    for (const region of regions) {
        for (const comp of region.components || []) {
            // Check if component has a loader before calling it
            const hasLoaders = registry.hasLoaders(comp.typeId);

            if (hasLoaders) {
                map[comp.id] = registry.callLoader(
                    comp.typeId,
                    {
                        componentData: comp,
                        context: ctx.context,
                        request: ctx.request,
                    },
                    'loader'
                );
            }

            // Recursively process nested regions (components can have their own regions)
            if (comp.regions && comp.regions.length > 0) {
                collectFromRegions(ctx, comp.regions, map);
            }
        }
    }
}
