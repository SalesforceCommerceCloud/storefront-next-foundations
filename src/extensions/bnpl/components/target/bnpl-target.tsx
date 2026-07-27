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
import { Suspense } from 'react';
import { Await } from 'react-router';
import BuyNowPayLater from '@/extensions/bnpl/components/buy-now-pay-later';
import { useBnpl } from '@/extensions/bnpl/context/bnpl-context';

export default function BnplTarget() {
    const bnpl = useBnpl();

    if (!bnpl) return null;

    const { messagePromise, learnMorePromise } = bnpl;

    return (
        <Suspense fallback={null}>
            <Await resolve={messagePromise} errorElement={null}>
                {(messageData) => (
                    <Suspense fallback={null}>
                        <Await resolve={learnMorePromise} errorElement={null}>
                            {(learnMoreData) => (
                                <BuyNowPayLater messageData={messageData} learnMoreData={learnMoreData} />
                            )}
                        </Await>
                    </Suspense>
                )}
            </Await>
        </Suspense>
    );
}
