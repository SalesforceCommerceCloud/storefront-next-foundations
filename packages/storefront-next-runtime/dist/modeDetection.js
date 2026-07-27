//#region src/design/modeDetection.ts
/**
* Get the mode parameter from URL search params
* @param url - Optional URL string or Request object for server-side usage. If not provided, uses window.location on client-side
* @returns The mode parameter value or null if not found
*/
const getUrlMode = (url) => {
	let searchParams;
	if (url) if (url instanceof Request) searchParams = new URL(url.url).searchParams;
	else searchParams = new URL(url).searchParams;
	else {
		if (typeof window === "undefined") return null;
		searchParams = new URLSearchParams(window.location.search);
	}
	return searchParams.get("mode");
};
/**
* Check if design mode is active
* @param url - Optional URL string or Request object for server-side usage
* @returns True if mode=EDIT is present in URL
*/
const isDesignModeActive = (url) => getUrlMode(url) === "EDIT";
/**
* Check if preview mode is active
* @param url - Optional URL string or Request object for server-side usage
* @returns True if mode=PREVIEW is present in URL
*/
const isPreviewModeActive = (url) => getUrlMode(url) === "PREVIEW";

//#endregion
export { isDesignModeActive as n, isPreviewModeActive as r, getUrlMode as t };
//# sourceMappingURL=modeDetection.js.map