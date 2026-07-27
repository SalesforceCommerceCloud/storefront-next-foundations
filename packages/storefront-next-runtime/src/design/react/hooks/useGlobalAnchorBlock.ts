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
import { useEffect } from 'react';

/**
 * React hook that prevents all <a> (anchor) navigation by default in the document,
 * unless the anchor has the attribute `data-pd-allow-link`.
 */
export function useGlobalAnchorBlock(): void {
    useEffect(() => {
        function preventAnchorClicks(event: MouseEvent) {
            const target = event.target as HTMLElement;
            const anchor = target.closest('a');

            // This data attribute acts as a workaround in the event we do
            // want to have an anchor tag navigate in design mode.
            if (anchor && !anchor.hasAttribute('data-pd-allow-link')) {
                event.preventDefault();
            }
        }

        document.addEventListener('click', preventAnchorClicks);

        return () => document.removeEventListener('click', preventAnchorClicks);
    }, []);
}
