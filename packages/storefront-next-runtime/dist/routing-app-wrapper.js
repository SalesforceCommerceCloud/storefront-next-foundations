import { jsx } from "react/jsx-runtime";
import { Outlet } from "react-router";

//#region src/routing/app-wrapper.tsx
/**
* A pass-through wrapper component that renders an `<Outlet />`.
*
* Used as the parent route component when URL configuration wraps routes under
* a prefix (e.g. `/:siteId/:localeId`). React Router requires a component for
* every route entry — this satisfies that requirement without adding any UI.
*
* Customers re-export this from their own `routes/app-wrapper.tsx` so the file
* lives inside `appDirectory` and React Router generates correct type references.
*/
function AppWrapper() {
	return /* @__PURE__ */ jsx(Outlet, {});
}

//#endregion
export { AppWrapper as default };
//# sourceMappingURL=routing-app-wrapper.js.map