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
import { useTranslation } from 'react-i18next';
import { routes } from '@/route-paths';

export default function StoreLocatorFooter(): ReactElement {
    const { t } = useTranslation('extStoreLocator');
    return (
        <li>
            <Link
                to={routes.storeLocator}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('footer.links.storeLocator')}
            </Link>
        </li>
    );
}
