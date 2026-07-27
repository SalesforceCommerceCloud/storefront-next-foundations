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
import { fetchComponent, type PageDesignerComponentParams } from '@/lib/api/component.server';
import { ApiError, type ShopperExperience } from '@/scapi';
import { isDesignModeActive, isPreviewModeActive } from '@salesforce/storefront-next-runtime/design/mode';
import { getLogger } from '@/lib/logger.server';
import { collectFromRegions } from './collect-component-data.server';

export type Component = ShopperExperience.schemas['Component'];

export type ComponentWithComponentData = Component & {
    componentData?: Record<string, Promise<unknown>>;
};

type ComponentParams = Omit<PageDesignerComponentParams, 'mode' | 'pdToken'>;

export async function fetchComponentFromLoader(
    { context, request }: LoaderFunctionArgs,
    params: ComponentParams
): Promise<ShopperExperience.schemas['Component']> {
    const isPageDesignerActive = isDesignModeActive(request) || isPreviewModeActive(request);
    const url = new URL(request.url);

    if (!isPageDesignerActive) {
        return fetchComponent(context, params);
    }

    const pageDesignerParams: Partial<PageDesignerComponentParams> = {
        mode: url.searchParams.get('mode') || undefined,
        pdToken: url.searchParams.get('pdToken') || undefined,
        componentId: url.searchParams.get('componentId') || undefined,
    };

    const cleanParams = Object.fromEntries(
        Object.entries(pageDesignerParams).filter(([, value]) => value !== undefined)
    );

    return fetchComponent(context, { ...params, ...cleanParams });
}

export async function fetchComponentWithComponentData(
    args: LoaderFunctionArgs,
    params: ComponentParams
): Promise<ComponentWithComponentData | null> {
    let component: ShopperExperience.schemas['Component'];
    try {
        component = await fetchComponentFromLoader(args, params);
    } catch (e) {
        if (e instanceof ApiError) {
            if (e.status !== 404) {
                const logger = getLogger(args.context);
                logger.warn('Page Designer component fetch failed', {
                    status: e.status,
                    componentId: params.componentId,
                });
            }
            return null;
        }
        throw e;
    }

    const componentData: Record<string, Promise<unknown>> = {};
    collectFromRegions(args, component.regions, componentData);
    return {
        ...component,
        componentData,
    };
}
