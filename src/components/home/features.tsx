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

export default function Features(): ReactElement {
    return (
        <div className="section-container">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Features</h2>
                <p className="mt-4 text-sm text-muted-foreground">
                    Out-of-the-box features so that you focus only on adding enhancements.
                </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-ui bg-muted/30 p-6">
                    <h3 className="text-2xl font-semibold text-foreground mb-2">Cart & Checkout</h3>
                    <p className="text-muted-foreground">
                        {`Ecommerce best practice for a shopper's cart and checkout experience.`}
                    </p>
                </div>

                <div className="rounded-ui bg-muted/30 p-6">
                    <h3 className="text-2xl font-semibold text-foreground mb-2">Einstein Recommendations</h3>
                    <p className="text-muted-foreground">
                        Deliver the next best product or offer to every shopper through product recommendations.
                    </p>
                </div>

                <div className="rounded-ui bg-muted/30 p-6">
                    <h3 className="text-2xl font-semibold text-foreground mb-2">My Account</h3>
                    <p className="text-muted-foreground">
                        Shoppers can manage account information such as their profile, addresses, payments and orders.
                    </p>
                </div>

                <div className="rounded-ui bg-muted/30 p-6">
                    <h3 className="text-2xl font-semibold text-foreground mb-2">Shopper Login</h3>
                    <p className="text-muted-foreground">
                        Enable shoppers to easily log in with a more personalized shopping experience.
                    </p>
                </div>

                <div className="rounded-ui bg-muted/30 p-6">
                    <h3 className="text-2xl font-semibold text-foreground mb-2">Modern Components</h3>
                    <p className="text-muted-foreground">
                        Built using Tailwind CSS, a simple, modular and accessible component library.
                    </p>
                </div>

                <div className="rounded-ui bg-muted/30 p-6">
                    <h3 className="text-2xl font-semibold text-foreground mb-2">Wishlist</h3>
                    <p className="text-muted-foreground">
                        Registered shoppers can add product items to their wishlist from purchasing later.
                    </p>
                </div>
            </div>
        </div>
    );
}
