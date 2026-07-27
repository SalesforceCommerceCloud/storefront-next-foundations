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

import { createContext } from 'react';

/**
 * Context that lets children signal a loading state back to CollapsibleSection.
 * When a child calls `setLoading(true)`, the chevron is replaced with a spinner
 * and the section defers opening until `setLoading(false)` is called.
 * The context is optional — children that don't need it can ignore it safely.
 */
export const CollapsibleLoadingContext = createContext<{
    setLoading: (loading: boolean) => void;
} | null>(null);
