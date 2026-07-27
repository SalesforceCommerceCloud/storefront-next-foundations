import { t as BaseConfig } from "./schema.js";

//#region src/config/load-config.d.ts

/**
 * Dynamically imports `config.server.ts` from the project root (CWD) and returns
 * the full configuration object. This runs at route discovery time under vite-node
 * (typegen, dev, build), which handles the TS transformation.
 *
 * Uses jiti to transpile TypeScript on the fly, which works regardless of whether
 * the caller runs under vite-node, a plain Node process, or any other runtime.
 * This avoids the fragile assumption that vite-node will intercept dynamic imports
 * from pre-compiled npm packages (it won't — Vite externalizes node_modules).
 *
 * Returns the full config including `metadata`, `runtime`, and `app` sections.
 * Callers that only need `app` can destructure: `const { app } = await loadConfig()`.
 *
 * - If the config file is missing, throws with a clear message.
 * - If the config file exists but fails to import, throws with the original error as cause.
 *
 * @returns The full configuration object.
 * @throws If `config.server.ts` is not found or fails to import.
 */
declare function loadConfig<T extends BaseConfig = BaseConfig>(): Promise<T>;
//#endregion
export { loadConfig };
//# sourceMappingURL=config-load.d.ts.map