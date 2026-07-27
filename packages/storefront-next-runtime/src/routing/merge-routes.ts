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
import { type RouteConfigEntry } from '@react-router/dev/routes';

/**
 * Find the nearest route by its ID in the route tree
 * @param routes - The route subtree to search
 * @param layoutId - The route ID to find (e.g., "routes/_app" or "routes/_app.account")
 * @param rootPath - The full route path from the root to the current route (default: '')
 * @returns An object with routes array, routeIndex, and path, or null if not found. Returns exact match if found, otherwise returns route where route.id is a prefix of layoutId
 */
function findNearestRoute(
    routes: RouteConfigEntry[],
    layoutId: string,
    rootPath: string = ''
): { routes: RouteConfigEntry[]; routeIndex: number; path: string } | null {
    for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        const path = route.path ? `${rootPath}/${route.path}` : rootPath;
        if (route.id === layoutId) {
            return { routes, routeIndex: i, path };
        }
        if (route.children) {
            const found = findNearestRoute(route.children, layoutId, path);
            if (found) {
                return found;
            }
        }
        // Check if route.id is a prefix of layoutId, indicating a nested route
        if (route.id && layoutId.startsWith(route.id)) {
            return { routes, routeIndex: i, path };
        }
    }
    return null;
}

/**
 * Merges extension routes into the main routes array, handling route nesting.
 * Routes without IDs are added directly to the routes array. Routes with IDs are processed
 * to remove the extension prefix and are either:
 * - Added as children of existing routes (if a nearest route is found via prefix matching)
 * - Replace existing routes (if an exact match is found)
 * - Added directly to the routes array (if no matching route exists)
 *
 * When adding as a child, the parent route's path is clipped from the child route's path.
 *
 * @param routes - The main routes array to merge into (mutated in place)
 * @param extensionRoutes - The extension routes to merge
 * @param extensionIdPrefix - The prefix to remove from extension route IDs (e.g., "extensions/store-locator/")
 */
export function mergeRoutes(
    routes: RouteConfigEntry[],
    extensionRoutes: RouteConfigEntry[],
    extensionIdPrefix: string
): void {
    for (const route of extensionRoutes) {
        if (!route.id) {
            routes.unshift(route);
            continue;
        }
        const routeId = route.id.replace(extensionIdPrefix, '');
        const nearestRouteResult = findNearestRoute(routes, routeId);
        if (nearestRouteResult) {
            const nearestRoute = nearestRouteResult.routes[nearestRouteResult.routeIndex];
            if (nearestRoute.id === routeId) {
                // Replacing an existing route, we assume we can just swap out the implementation
                nearestRouteResult.routes[nearestRouteResult.routeIndex].file = route.file;
            } else {
                // This is a new child of an existing route, insert it at the beginning of the children array
                // and clip out the parent path from the route path
                let path = route.path?.slice(nearestRouteResult.path.length);
                if (path?.startsWith('/')) {
                    path = path.slice(1);
                }
                path = path ? path : undefined;
                if (!nearestRoute.children) {
                    nearestRoute.children = [];
                }
                nearestRoute.children.unshift({
                    ...route,
                    id: routeId,
                    path,
                });
            }
        } else {
            // This is a new route, insert it at the beginning of the routes array
            routes.unshift({
                ...route,
                id: routeId,
            });
        }
    }
}
