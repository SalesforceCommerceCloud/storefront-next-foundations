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
import type { ServerBuild } from 'react-router';
import { getBundlePath, getBasePath } from '../utils/paths';

/**
 * Patch React Router build to rewrite asset URLs with the correct bundle path
 * This is needed because the build output uses /assets/ but we preview at /mobify/bundle/{BUNDLE_ID}/client/assets/
 */
export function patchReactRouterBuild(build: ServerBuild, bundleId: string): ServerBuild {
    const bundlePath = getBundlePath(bundleId);
    const basePath = getBasePath();

    // Clone the assets object and replace /assets/ paths with bundle path
    const assetsJson = JSON.stringify(build.assets);
    const patchedAssetsJson = assetsJson.replace(/"\/assets\//g, `"${bundlePath}assets/`);
    const newAssets = JSON.parse(patchedAssetsJson);

    // Return a new build object with patched publicPath and assets
    return Object.assign({}, build, {
        publicPath: bundlePath,
        assets: newAssets,
        // Override basename at runtime from base path env var
        // This allows the same build to serve under different base paths
        ...(basePath && { basename: basePath }),
    });
}
