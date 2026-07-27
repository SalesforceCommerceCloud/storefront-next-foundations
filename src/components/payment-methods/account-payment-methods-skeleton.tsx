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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the account payment methods page.
 * Displays placeholder elements while payment methods data is being loaded.
 */
export function AccountPaymentMethodsSkeleton(): ReactElement {
    return (
        <div className="space-y-5">
            {/* Page Header Skeleton */}
            <Card className="bg-card border-border">
                <CardContent className="px-6 py-3">
                    <div>
                        <Skeleton className="h-6 w-48 mb-1" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                </CardContent>
            </Card>

            {/* Payment Methods Section Skeleton */}
            <Card className="p-6">
                <div className="flex items-center justify-between pb-6 border-b">
                    <div>
                        <Skeleton className="h-5 w-40 mb-1" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-40" />
                </div>

                <div className="pt-2 space-y-6">
                    {/* Payment Method Card Skeletons */}
                    {[1, 2].map((i) => (
                        <Card key={i} className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 pr-4">
                                    <Skeleton className="h-5 w-48 mb-2" />
                                    <Skeleton className="h-4 w-64 mb-4" />
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-16" />
                                    </div>
                                </div>
                                <Skeleton className="h-6 w-10" />
                            </div>
                        </Card>
                    ))}
                </div>
            </Card>
        </div>
    );
}
