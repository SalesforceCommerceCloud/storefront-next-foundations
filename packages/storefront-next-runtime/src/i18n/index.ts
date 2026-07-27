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
// Server-capable i18n entry. Browser-only client init lives in the sibling
// `@salesforce/storefront-next-runtime/i18n/client` subpath so that SSR bundles
// don't drag in i18next-browser-languagedetector.
export { getTranslation, getLocale, mockI18nContext } from './context.js';
export { createI18nMiddleware } from './middleware.js';
// `defaultInterpolation` is exported so customers layering custom formatters
// (e.g. `{{ value, currency }}`) can delegate the unhandled cases to our
// number formatter without copy-pasting it.
export { defaultInterpolation } from './defaults.js';
// `I18nMiddlewareConfig` and `LocaleLoader` are exported for customers who
// factor i18n config out of the inline `createI18nMiddleware`/`initI18next`
// call site (helpers, factories, shared loaders) and need a named type.
export type { I18nMiddlewareConfig, LocaleLoader } from './types.js';
