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
import { lazy, Suspense, useState, useEffect, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Store } from 'lucide-react';
import { useStoreLocator } from '../../providers/store-locator';

const StoreLocatorSheet = lazy(() => import('@/extensions/store-locator/components/header/store-locator-sheet'));

/**
 * StoreLocatorBadge
 *
 * Defers loading of the store locator UI until the shopper first interacts with the
 * badge button. This keeps initial bundles small and improves first-load performance.
 *
 * The sheet is lazy-loaded on demand via React.lazy (cached after first load) and wrapped with Suspense.
 * Uses isOpen state to control both lazy loading trigger and sheet visibility.
 *
 * @returns ReactElement
 *
 * @example
 * // Render in the site header
 * import StoreLocatorBadge from '@/extensions/store-locator/components/header/store-locator-badge';
 *
 * export function HeaderRightActions() {
 *     return (
 *         <nav>
 *             <StoreLocatorBadge />
 *         </nav>
 *     );
 * }
 */
export default function StoreLocatorBadge(): ReactElement {
    const { t } = useTranslation('extStoreLocator');
    const [clicked, setClicked] = useState<boolean>(false);
    const globalIsOpen = useStoreLocator((state) => state.isOpen);
    const closeStoreLocator = useStoreLocator((state) => state.close);

    // Sync with global state - if global state says open, trigger local state
    useEffect(() => {
        if (globalIsOpen && !clicked) {
            setClicked(true);
        }
    }, [globalIsOpen, clicked]);

    // Handle closing - update both local and global state
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setClicked(false);
            closeStoreLocator();
        }
    };

    if (clicked) {
        return (
            <Suspense
                fallback={
                    <Button
                        variant="ghost"
                        className="pointer-events-none hover:bg-transparent"
                        aria-label={t('storeLocator.trigger.ariaLabel')}>
                        <Store className="size-6" />
                    </Button>
                }>
                <StoreLocatorSheet open={true} onOpenChange={handleOpenChange}>
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:opacity-50 transition-opacity"
                        aria-label={t('storeLocator.trigger.openAriaLabel')}>
                        <Store className="size-6" />
                    </Button>
                </StoreLocatorSheet>
            </Suspense>
        );
    }

    return (
        <Button
            variant="ghost"
            className="hover:bg-transparent hover:opacity-50 transition-opacity"
            onClick={() => setClicked(true)}
            aria-label={t('storeLocator.trigger.ariaLabel')}>
            <Store className="size-6" />
        </Button>
    );
}
