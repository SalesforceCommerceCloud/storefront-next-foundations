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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton component for the account details page content.
 * Matches the structure of the actual account details with profile and password cards.
 */
export function AccountDetailSkeleton() {
    return (
        <div className="space-y-5">
            {/* Page Header Card Skeleton */}
            <Card className="bg-card border-border">
                <CardContent className="px-6 py-3">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-64 mt-1" />
                </CardContent>
            </Card>

            {/* Personal Information Card Skeleton */}
            <Card className="bg-card border-border">
                <CardContent className="p-6">
                    {/* Card Header with separator */}
                    <div className="mb-6 pb-4 border-b border-border space-y-1.5">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-56" />
                    </div>
                    {/* Profile fields skeleton - 2 columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {Array.from({ length: 4 }, (_, i) => i).map((index) => (
                            <div key={index} className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-28" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Password & Security Card Skeleton */}
            <Card className="bg-card border-border">
                <CardContent className="p-6">
                    {/* Card Header with separator */}
                    <div className="mb-6 pb-4 border-b border-border space-y-1.5">
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    {/* Password field with inline button */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                        <Skeleton className="h-8 w-32" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default AccountDetailSkeleton;
