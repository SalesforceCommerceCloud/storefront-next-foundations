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
import type { Plugin } from 'vite';

/**
 * @deprecated This plugin has been removed. It was an internal-only debugging aid
 * that could cause build failures when extensions were trimmed. The export is kept
 * as a no-op for backward compatibility and will be removed in v2.
 *
 * **Migration:** Remove any `uiTargetDevMode()` plugin from your `vite.config.ts`,
 * delete `vite-plugins/ui-target-dev-mode.ts` if it exists, and remove the plugin
 * from the Vite plugins array.
 */
export interface UITargetDevModeConfig {
    /**
     * @deprecated No longer used
     */
    enabled?: boolean;

    /**
     * @deprecated No longer used
     */
    filterCategory?: string;

    /**
     * @deprecated No longer used
     */
    hintMap?: Record<string, string>;
}

/**
 * @deprecated This plugin has been removed. It was an internal-only debugging aid
 * that could cause build failures when extensions were trimmed. The export is kept
 * as a no-op for backward compatibility and will be removed in v2.
 *
 * **Migration:** Remove any `uiTargetDevMode()` plugin from your `vite.config.ts`,
 * delete `vite-plugins/ui-target-dev-mode.ts` if it exists, and remove the plugin
 * from the Vite plugins array.
 *
 * @returns A no-op Vite plugin
 */
export function uiTargetDevModePlugin(_config?: UITargetDevModeConfig): Plugin {
    return {
        name: 'storefront-next:ui-target-dev-mode-deprecated-noop',
    };
}
