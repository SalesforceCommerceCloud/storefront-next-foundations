import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import I18nextBrowserLanguageDetector from "i18next-browser-languagedetector";

//#region src/i18n/defaults.ts
/** Shared i18next interpolation config. Disables HTML escaping (React handles that) and adds `{{ value, number }}` formatting via `toLocaleString`. */
const defaultInterpolation = {
	escapeValue: false,
	format: (value, format) => {
		if (format === "number" && typeof value === "number") return value.toLocaleString();
		return value;
	}
};

//#endregion
//#region src/i18n/client.ts
/**
* Custom i18next backend that calls the provided `loadLocale` callback to dynamically
* import translations. Keeping the import() call in the template lets Vite resolve the
* dynamic path at build time and split translations into per-language chunks.
*/
function createDynamicImportBackend(instance, loadLocale) {
	return {
		type: "backend",
		init() {},
		read(language, namespace, callback) {
			loadLocale(language).then((module) => {
				const translations = module.default;
				Object.entries(translations).forEach(([ns, nsTranslations]) => {
					instance.addResourceBundle(language, ns, nsTranslations, true, true);
				});
				callback(null, translations[namespace] ?? {});
			}).catch((error) => {
				callback(error, false);
			});
		}
	};
}
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
function initI18next(options) {
	const language = options?.language;
	const instance = options?.instance ?? i18next;
	const loadLocale = options?.loadLocale;
	if (language) instance.language = language;
	const i18nextInstance = instance.use(initReactI18next);
	if (loadLocale) i18nextInstance.use(createDynamicImportBackend(instance, loadLocale));
	if (!language) i18nextInstance.use(I18nextBrowserLanguageDetector);
	i18nextInstance.init({
		ns: [],
		...language ? { lng: language } : { detection: {
			order: ["htmlTag"],
			caches: []
		} },
		interpolation: defaultInterpolation
	});
	return instance;
}

//#endregion
export { initI18next };
//# sourceMappingURL=i18n-client.js.map