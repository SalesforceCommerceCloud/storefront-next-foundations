import { createContext, useContext } from "react";

//#region src/security/nonce-context.tsx
/** React Context carrying the per-request CSP nonce through the SSR React tree. */
const NonceContext = createContext(void 0);
/**
* React component-side reader for the per-request nonce.
*
* Returns `undefined` if no `NonceContext.Provider` is in the tree
* (e.g. in tests, or a customer who hasn't ejected `entry.server.tsx`).
* Callers should coerce `undefined` to omit the `nonce` attribute on
* rendered `<script>` tags (React 19 omits attributes whose value is
* `undefined`).
*/
function useSecurityNonceFromContext() {
	return useContext(NonceContext);
}

//#endregion
export { NonceContext, useSecurityNonceFromContext };
//# sourceMappingURL=security-react.js.map