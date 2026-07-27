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
import { lazy } from 'react';
import { usePageDesignerMode } from './PageDesignerProvider';
import type { ShopperExperience } from '@/scapi-client/types';

const LazyPageRegistration = lazy(() =>
    import('../components/PageRegistration').then((module) => ({ default: module.PageRegistration }))
);

/**
 * Provides the page metadata for Page Designer.
 */
export function PageDesignerPageMetadataProvider({
    page,
    children,
}: React.PropsWithChildren<{ page: ShopperExperience.schemas['Page'] }>) {
    const { isDesignMode } = usePageDesignerMode();

    if (!isDesignMode) {
        return <>{children}</>;
    }

    return <LazyPageRegistration page={page}>{children}</LazyPageRegistration>;
}
