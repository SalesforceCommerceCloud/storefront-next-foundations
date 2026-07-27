import { Preset } from "@react-router/dev/config";

//#region src/configs/react-router.config.d.ts

/**
 * Storefront Next preset for React Router configuration.
 * This preset enforces standard configuration for SFCC Storefront Next applications.
 * Users cannot override these values - they will be validated and an error will be thrown if modified.
 *
 * Environment variables:
 * - `SFW_FALCON_INSTANCE` — (Optional) The Falcon instance identifier (e.g., `aws-dev2-uswest2`).
 *   When set together with `SFW_FUNCTIONAL_DOMAIN`, adds workspace proxy domains to
 *   `allowedActionOrigins` for CSRF protection on form actions.
 * - `SFW_FUNCTIONAL_DOMAIN` — (Optional) The functional domain name (e.g., `cvw-dataplane-test`).
 *   Required alongside `SFW_FALCON_INSTANCE` to construct workspace origin patterns.
 */
declare function storefrontNextPreset(): Preset;
//#endregion
export { storefrontNextPreset };
//# sourceMappingURL=react-router.config.d.ts.map