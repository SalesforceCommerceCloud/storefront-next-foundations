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

import { nanoid } from 'nanoid';

/**
 * Generates a unique address ID for customer addresses saved in My Account.
 *
 * The generated ID follows the pattern: addr_[nanoid]
 * This ensures uniqueness, avoids special character issues, and maintains
 * consistency with existing address ID formats in the system.
 *
 * @returns A unique address ID string
 *
 * @example
 * generateAddressId() // 'addr_V1StGXR8_Z5jdHi6B-myT'
 * generateAddressId() // 'addr_4y7tP9kLmNqR2xWz3vB1C'
 */
export function generateAddressId(): string {
    return `addr_${nanoid()}`;
}
