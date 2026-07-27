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
import type { ShopperOrders } from '@/scapi';

type OrderItem = ShopperOrders.schemas['ProductItem'];

/**
 * Stable key for order-line “review submitted” state (sessionStorage, React keys).
 *
 * **Prefer `item.itemId`:** SCAPI order `productItems` should include `itemId` per line.
 * When it is missing, the key uses `orderNo`, `productId`, `quantity`, and `index` so
 * the value stays stable if the UI reorders or filters rows, unlike `productId` + index alone.
 */
export function getOrderLineReviewKey(orderNo: string | undefined, item: OrderItem, index: number): string {
    const id = item.itemId;
    if (id != null && String(id).length > 0) {
        return id;
    }
    const on = orderNo?.trim() || 'unknown-order';
    const pid = item.productId ?? 'unknown-product';
    const qty = item.quantity ?? 0;
    return `${on}-${pid}-${qty}-${index}`;
}
