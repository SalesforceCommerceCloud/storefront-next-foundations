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
import type { InterpolationOptions, Resource, ResourceLanguage, ThirdPartyModule } from 'i18next';

/** Config passed to `createI18nMiddleware`. All values come from the template — the SDK never reads config values directly. */
export interface I18nMiddlewareConfig {
    resources: Resource;
    supportedLanguages: string[];
    fallbackLanguage: string;
    interpolation?: InterpolationOptions;
    plugins?: ThirdPartyModule[];
}

/**
 * Callback that dynamically imports all translations for a given language.
 * Must be defined in template code so Vite can resolve the `import()` path at build time
 * and split translations into per-language chunks.
 *
 * @example
 * const loadLocale: LocaleLoader = (language) => import(`@/locales/${language}/index.ts`);
 */
export type LocaleLoader = (language: string) => Promise<{ default: ResourceLanguage }>;
