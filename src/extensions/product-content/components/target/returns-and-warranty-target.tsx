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
import { Suspense, lazy } from 'react';
import { Await } from 'react-router';
import { useProductContentData } from '@/extensions/product-content/context/product-content-data-context';

const ReturnsAndWarranty = lazy(() => import('@/extensions/product-content/components/returns-and-warranty'));

export default function ReturnsAndWarrantyTarget() {
    const ctx = useProductContentData();
    const returnsWarrantyPromise = ctx?.returnsWarrantyPromise;

    if (!returnsWarrantyPromise) return null;

    return (
        <Suspense fallback={null}>
            <Await resolve={returnsWarrantyPromise} errorElement={null}>
                {(returnsWarranty) => <ReturnsAndWarranty data={returnsWarranty} />}
            </Await>
        </Suspense>
    );
}
