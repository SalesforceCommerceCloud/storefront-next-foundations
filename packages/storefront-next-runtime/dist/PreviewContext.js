import { r as isPreviewModeActive } from "./modeDetection.js";
import { createContext, useMemo } from "react";
import { jsx } from "react/jsx-runtime";

//#region src/design/react/context/PreviewContext.tsx
const PreviewContext = createContext({ isPreviewMode: false });
const PreviewProvider = ({ children }) => {
	const isPreviewMode = isPreviewModeActive();
	const contextValue = useMemo(() => ({ isPreviewMode }), [isPreviewMode]);
	return /* @__PURE__ */ jsx(PreviewContext.Provider, {
		value: contextValue,
		children
	});
};

//#endregion
export { PreviewContext, PreviewProvider };
//# sourceMappingURL=PreviewContext.js.map