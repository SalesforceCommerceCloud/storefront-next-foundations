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
import type { RouterContextProvider } from 'react-router';
import { fetchProductRecommendations } from '@/lib/product/recommendations.server';
import type { Recommendation } from '@/hooks/recommenders/use-recommenders';

type LoaderArgs = {
    componentData: {
        id: string;
        typeId: string;
        data?: { recommenderName?: string; currency?: string; type?: string };
    };
    context: Readonly<RouterContextProvider>;
    request: Request;
};

export async function loader({ componentData, context, request }: LoaderArgs): Promise<Recommendation> {
    const data = componentData.data ?? {};
    const name = data.recommenderName;
    if (!name) return {};
    return fetchProductRecommendations(
        { context, request },
        {
            name,
            ...(data.currency ? { currency: data.currency } : {}),
            ...(data.type ? { args: { type: data.type } } : {}),
        }
    );
}
