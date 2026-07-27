import { MiddlewareFunction, RouterContextProvider } from "react-router";
import * as i18next0 from "i18next";
import { InterpolationOptions, Resource, ResourceLanguage, ThirdPartyModule, i18n } from "i18next";

//#region src/i18n/context.d.ts

/**
 * Gets the i18next instance and translation function for non-component code.
 * Use `useTranslation` hook for React components. Mirrors the `getConfig`/`useConfig` pattern.
 */
declare function getTranslation(context?: Readonly<RouterContextProvider>): {
  i18next: i18n;
  t: i18next0.TFunction<["translation", ...string[]], undefined>;
};
/**
 * Gets the active locale string from server context.
 * Returns undefined on the client (locale is on the document element or URL).
 */
declare function getLocale(context: Readonly<RouterContextProvider>): string | undefined;
/**
 * Sets up a mock i18n context on a RouterContextProvider for use in tests.
 * Replaces the need to import the internal i18nextContext key directly.
 */
declare function mockI18nContext(contextProvider: RouterContextProvider, options?: {
  locale?: string;
  instance?: i18n;
}): void;
//#endregion
//#region src/i18n/types.d.ts
/** Config passed to `createI18nMiddleware`. All values come from the template — the SDK never reads config values directly. */
interface I18nMiddlewareConfig {
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
type LocaleLoader = (language: string) => Promise<{
  default: ResourceLanguage;
}>;
//#endregion
//#region src/i18n/middleware.d.ts
/**
 * Creates a server-side i18next middleware from the provided config.
 * Lazy-initializes on first request so supported languages can come from runtime config.
 */
declare function createI18nMiddleware(config: I18nMiddlewareConfig): MiddlewareFunction<Response>;
//#endregion
//#region src/i18n/defaults.d.ts
/** Shared i18next interpolation config. Disables HTML escaping (React handles that) and adds `{{ value, number }}` formatting via `toLocaleString`. */
declare const defaultInterpolation: InterpolationOptions;
//#endregion
export { type I18nMiddlewareConfig, type LocaleLoader, createI18nMiddleware, defaultInterpolation, getLocale, getTranslation, mockI18nContext };
//# sourceMappingURL=i18n.d.ts.map