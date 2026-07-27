import { ResourceLanguage, i18n } from "i18next";

//#region src/i18n/types.d.ts

/**
 * Callback that dynamically imports all translations for a given language.
 * Must be defined in template code so Vite can resolve the `import()` path at build time
 * and split translations into per-language chunks.
 *
 * @example
 * const loadLocale: LocaleLoader = (language) => import(`@/locales/${language}/index.ts`);
 */
type LocaleLoader = (language: string) => Promise<{
  default: ResourceLanguage;
}>;
//#endregion
//#region src/i18n/client.d.ts

/**
 * Initialize i18next on the client side.
 * Pass a `loadLocale` callback containing the dynamic import so Vite can resolve it
 * at build time relative to the template's source tree.
 *
 * @example
 * // In root.tsx — Vite resolves the import() relative to this file
 * initI18next({
 *     language: document.documentElement.lang || undefined,
 *     loadLocale: (language) => import(`@/locales/${language}/index.ts`),
 * });
 */
declare function initI18next(options?: {
  language?: string;
  instance?: i18n;
  loadLocale?: LocaleLoader;
}): i18n;
//#endregion
export { initI18next };
//# sourceMappingURL=i18n-client.d.ts.map