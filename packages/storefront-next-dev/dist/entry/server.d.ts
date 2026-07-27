import { ServerEntryModule } from "react-router";

//#region src/entry/server.d.ts

/**
 * Composes a server entry module with platform-level features.
 *
 * - Spreads all app module properties to forward unknown/future exports
 * - Wraps the default handler for platform-level processing
 * - Prepends a platform instrumentation to instrumentations
 */
declare function composeServerEntry(appModule: ServerEntryModule): ServerEntryModule;
//#endregion
export { composeServerEntry };
//# sourceMappingURL=server.d.ts.map