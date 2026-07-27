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
import { type RouterContextProvider } from 'react-router';
import type { Route } from './+types/_empty.$';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import { stripPathPrefix } from '@salesforce/storefront-next-runtime/site-context';
import { handlePasswordlessCallback, handlePasswordlessLanding } from '@/lib/auth/passwordless-login.server';
import { handleSocialLoginLanding } from '@/lib/api/auth/social-login.server';
import { handleResetPasswordCallback, handleResetPasswordLanding } from '@/lib/api/auth/reset-password.server';
import { isAbsoluteURL } from '@/lib/utils';
import { getLogger } from '@/lib/logger.server';

type LoaderHandler = (args: Route.LoaderArgs) => Promise<Response> | Response;
type ActionHandler = (args: Route.ActionArgs) => Promise<Record<string, unknown>>;

/**
 * Catch-all route that handles configurable authentication routes
 */

/**
 * Extracts pathname from a URI that may be relative or absolute
 * @param uri - A relative path (e.g., "/callback") or absolute URL (e.g., "https://example.com/callback")
 * @returns The pathname component
 */
function extractPathname(uri: string): string {
    // If it's an absolute URL, parse it to extract the pathname
    if (isAbsoluteURL(uri)) {
        try {
            return new URL(uri).pathname;
        } catch {
            // If URL parsing fails, treat as relative path
            return uri;
        }
    }
    // MRT environment variable doesn't allow slash, so add it if it's missing
    return uri.startsWith('/') ? uri : `/${uri}`;
}

/**
 * Get the loader handler for a given pathname
 */
function getLoaderHandler(pathname: string, context: Readonly<RouterContextProvider>): LoaderHandler | null {
    const config = getConfig(context);

    // Use extractPathname to support both relative paths and absolute URLs in config.
    // When comparing against the incoming request's pathname, we need to extract just
    // the pathname component from potentially absolute URLs (e.g., "https://example.com/callback" -> "/callback")
    if (
        config.features.passwordlessLogin.landingUri &&
        pathname === extractPathname(config.features.passwordlessLogin.landingUri)
    ) {
        return handlePasswordlessLanding;
    }

    if (
        config.features.resetPassword.landingUri &&
        pathname === extractPathname(config.features.resetPassword.landingUri)
    ) {
        return handleResetPasswordLanding;
    }

    if (
        config.features.socialLogin.enabled &&
        config.features.socialLogin.callbackUri &&
        pathname === extractPathname(config.features.socialLogin.callbackUri)
    ) {
        return handleSocialLoginLanding;
    }

    return null;
}

/**
 * Get the action handler for a given pathname
 */
function getActionHandler(pathname: string, context: Readonly<RouterContextProvider>): ActionHandler | null {
    const config = getConfig(context);
    // Use extractPathname to support both relative paths and absolute URLs in config.
    // When comparing against the incoming request's pathname, we need to extract just
    // the pathname component from potentially absolute URLs (e.g., "https://example.com/callback" -> "/callback")
    if (
        config.features.passwordlessLogin.callbackUri &&
        pathname === extractPathname(config.features.passwordlessLogin.callbackUri)
    ) {
        return handlePasswordlessCallback;
    }

    if (
        config.features.resetPassword.callbackUri &&
        pathname === extractPathname(config.features.resetPassword.callbackUri)
    ) {
        return handleResetPasswordCallback;
    }

    return null;
}

export async function loader(args: Route.LoaderArgs) {
    const logger = getLogger(args.context);
    const config = getConfig(args.context);
    const url = new URL(args.request.url);
    const strippedPath = stripPathPrefix({ pathname: url.pathname, prefix: config.url?.prefix ?? '' });
    logger.debug('CatchAllRoute: loader starting', { pathname: url.pathname, strippedPath });
    const handler = getLoaderHandler(strippedPath, args.context);

    if (handler) {
        logger.debug('CatchAllRoute: matched loader handler', { pathname: url.pathname });
        return handler(args);
    }

    // If no match, throw a 404
    logger.warn('CatchAllRoute: no loader handler matched, returning 404', { pathname: url.pathname });
    throw new Response('Not Found', { status: 404 });
}

export async function action(args: Route.ActionArgs) {
    const logger = getLogger(args.context);
    const config = getConfig(args.context);
    const url = new URL(args.request.url);
    const strippedPath = stripPathPrefix({ pathname: url.pathname, prefix: config.url?.prefix ?? '' });
    logger.debug('CatchAllRoute: action starting', { pathname: url.pathname, strippedPath });
    const handler = getActionHandler(strippedPath, args.context);

    if (handler) {
        logger.debug('CatchAllRoute: matched action handler', { pathname: url.pathname });
        return handler(args);
    }

    // If no match, throw a 405 Method Not Allowed
    logger.warn('CatchAllRoute: no action handler matched, returning 405', { pathname: url.pathname });
    throw new Response('Method Not Allowed', { status: 405 });
}

// Presence of a default component export causes React Router to treat this as a document
// route rather than a resource route. Without it, SSR throws the 404 Response directly
// (resource route path) instead of bubbling it to root's ErrorBoundary.
export default function CatchAllRoute() {
    return null;
}
