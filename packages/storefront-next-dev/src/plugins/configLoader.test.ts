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
import { describe, it, expect, vi, beforeEach } from 'vitest';

// `loadEngagementConfig` must load `config.server.ts` through the SDK's
// TS-aware loader (`importTypescript`, backed by jiti). Native `import()`
// cannot resolve TypeScript's extensionless relative imports
// (e.g. `./src/types/tracking-consent`) when the plugin runs in plain Node
// during a production build, so it throws ERR_MODULE_NOT_FOUND, the catch
// swallows it, and a "Could not load config" warning is logged.
//
// This cannot be reproduced with an in-process behavioral test: vitest runs on
// Vite, which patches `import()` to resolve TypeScript, so the broken native-import
// implementation passes here too. We therefore assert the delegation contract — that
// the function routes through the TS-aware loader — which is exactly what the broken
// implementation violated. The TS resolution behavior itself is covered by
// `../server/ts-import.test.ts`.
const mockImportTypescript = vi.fn();
vi.mock('../server/ts-import', () => ({
    importTypescript: mockImportTypescript,
}));

const { loadEngagementConfig } = await import('./configLoader');

describe('loadEngagementConfig', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loads config.server.ts through the TypeScript-aware loader and extracts engagement', async () => {
        mockImportTypescript.mockResolvedValue({
            default: {
                app: {
                    engagement: {
                        adapters: {
                            einstein: { enabled: true, eventToggles: { view_page: true } },
                        },
                    },
                },
            },
        });

        const engagement = await loadEngagementConfig('/project', 'config.server.ts');

        // Routed through the TS-aware loader (not native import()), with the resolved
        // absolute config path and the project directory for tsconfig alias resolution.
        expect(mockImportTypescript).toHaveBeenCalledWith(
            expect.stringContaining('config.server.ts'),
            expect.objectContaining({ projectDirectory: '/project' })
        );
        expect(engagement?.adapters?.einstein?.enabled).toBe(true);
        expect(engagement?.adapters?.einstein?.eventToggles?.view_page).toBe(true);
    });

    it('returns null when the config has no engagement section', async () => {
        mockImportTypescript.mockResolvedValue({ default: { app: { commerce: {} } } });

        const engagement = await loadEngagementConfig('/project', 'config.server.ts');

        expect(engagement).toBeNull();
    });

    it('returns null (non-fatal) when the config fails to load', async () => {
        mockImportTypescript.mockRejectedValue(new Error('Cannot find module'));

        const engagement = await loadEngagementConfig('/project', 'config.server.ts');

        expect(engagement).toBeNull();
    });
});
