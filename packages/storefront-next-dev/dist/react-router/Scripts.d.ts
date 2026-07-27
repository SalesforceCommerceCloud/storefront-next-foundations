import { Scripts as Scripts$1 } from "react-router";
import * as react_jsx_runtime0 from "react/jsx-runtime";

//#region src/react-router/Scripts.d.ts

/**
 * Enhanced Scripts component that wraps React Router's Scripts component with Storefront Next-specific functionality.
 *
 * This component extends the standard React Router Scripts component by injecting additional
 * bundle configuration scripts during server-side rendering. It ensures that bundle metadata
 * (ID and path) are available on the client before any other scripts execute.
 *
 * @private This is an internal SDK component — do not import directly.
 * It is automatically applied via the `patchReactRouter` Vite plugin at build time.
 * Customers should use `Scripts` from `react-router` as normal; the plugin transparently
 * substitutes this enhanced version in production builds.
 *
 * @param props - Props passed through to the underlying React Router Scripts component
 * @returns A fragment containing internal bundle scripts and React Router scripts
 */
declare function Scripts(props: React.ComponentProps<typeof Scripts$1>): react_jsx_runtime0.JSX.Element;
//#endregion
export { Scripts };
//# sourceMappingURL=Scripts.d.ts.map