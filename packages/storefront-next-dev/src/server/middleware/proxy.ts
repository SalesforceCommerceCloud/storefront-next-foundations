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
import { createProxyMiddleware, type RequestHandler } from 'http-proxy-middleware';
import type { ServerConfig } from '../config';
import { getCommerceCloudApiUrl } from '../../utils/paths';

/**
 * Create proxy middleware for Commerce Cloud API
 * Proxies requests from /mobify/proxy/api to the Commerce Cloud API
 */
export function createCommerceProxyMiddleware(config: ServerConfig): RequestHandler {
    const target = getCommerceCloudApiUrl(config.commerce.api.shortCode, config.commerce.api.proxyHost);

    return createProxyMiddleware({
        target,
        changeOrigin: true,
        // Disable SSL verification when using a custom proxy target (e.g. the local
        // SCW instance at https://scw:25010 which uses a self-signed certificate).
        // This is safe because the proxy middleware is only mounted in dev/preview
        // modes — production builds on Managed Runtime disable it (enableProxy: false).
        secure: !config.commerce.api.proxyHost,
    });
}
