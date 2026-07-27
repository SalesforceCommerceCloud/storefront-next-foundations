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
import { useSearchParams } from 'react-router';

/**
 * When the store inventory filter (ilids) is active, every product in the
 * result set is guaranteed to be available for pickup at the selected store —
 * no extra API calls needed.
 */
export function useShowPickupAvailable(): boolean {
    const [searchParams] = useSearchParams();
    return searchParams.has('ilids') || searchParams.getAll('refine').some((value) => value.startsWith('ilids'));
}
