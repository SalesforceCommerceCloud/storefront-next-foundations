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
import { type MiddlewareFunction } from 'react-router';
import { createI18nMiddleware } from '@salesforce/storefront-next-runtime/i18n';
import resources from '@/locales';
import { getConfig } from '@salesforce/storefront-next-runtime/config';

let middleware: MiddlewareFunction<Response> | null = null;

export const i18nextMiddleware: MiddlewareFunction<Response> = async (args, next) => {
    if (!middleware) {
        const config = getConfig(args.context);
        middleware = createI18nMiddleware({
            resources,
            supportedLanguages: config.i18n.supportedLngs,
            fallbackLanguage: config.i18n.fallbackLng,
        });
    }
    return middleware(args, next);
};

// Type augmentation stays in template — references template's locale types for type-safe t()
declare module 'i18next' {
    interface CustomTypeOptions {
        resources: (typeof resources)['en-GB'];
    }
}
