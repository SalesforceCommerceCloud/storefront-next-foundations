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
import { AccountNavItem } from './nav-item';
import type { LucideIcon } from 'lucide-react';

export interface AccountNavItemData {
    path: string;
    icon: LucideIcon;
    label: string;
    disabled?: boolean;
    /** When true, NavLink is only active for exact path match (e.g. /account not /account/overview). */
    end?: boolean;
    action?: string;
    method?: 'post' | 'get';
}

interface AccountNavListProps {
    isMobile?: boolean;
    items: AccountNavItemData[];
}

export function AccountNavList({ isMobile = false, items }: AccountNavListProps): ReactElement {
    return (
        <>
            {items.map((item) => (
                <AccountNavItem key={item.path || item.action} item={item} isMobile={isMobile} />
            ))}
        </>
    );
}
