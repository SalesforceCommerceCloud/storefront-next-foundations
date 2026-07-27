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
import { Link } from '@/components/link';
import { Button } from '@/components/ui/button';

export default function Help(): ReactElement {
    return (
        <div className="section-container">
            <div className="lg:flex lg:items-center lg:justify-between">
                <div className="lg:max-w-lg">
                    <h2 className="text-3xl font-bold text-foreground sm:text-4xl">{`We're here to help`}</h2>
                    <p className="mt-4 text-sm text-muted-foreground">
                        Contact our support staff.
                        <br />
                        They will get you to the right place.
                    </p>
                    <div className="mt-8">
                        <Button asChild className="text-2xl p-6">
                            <Link to="/contact">Contact Us</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
