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
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Component that provides a loading state placeholder for category breadcrumbs.
 * @returns A skeleton layout matching the breadcrumbs navigation structure
 */
export function CategoryBreadcrumbsSkeleton() {
    return (
        <nav aria-label="Breadcrumb" className="mb-6" data-testid="breadcrumbs-skeleton">
            <div className="flex flex-wrap items-center text-sm">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="mx-1 h-3 w-3" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="mx-1 h-3 w-3" />
                <Skeleton className="h-5 w-32" />
            </div>
        </nav>
    );
}
