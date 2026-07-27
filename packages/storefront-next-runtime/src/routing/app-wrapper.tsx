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
import { Outlet } from 'react-router';

/**
 * A pass-through wrapper component that renders an `<Outlet />`.
 *
 * Used as the parent route component when URL configuration wraps routes under
 * a prefix (e.g. `/:siteId/:localeId`). React Router requires a component for
 * every route entry — this satisfies that requirement without adding any UI.
 *
 * Customers re-export this from their own `routes/app-wrapper.tsx` so the file
 * lives inside `appDirectory` and React Router generates correct type references.
 */
export default function AppWrapper() {
    return <Outlet />;
}
