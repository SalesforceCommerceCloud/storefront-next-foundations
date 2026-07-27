import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import YAML from "yaml";
import { BUILT_IN_CLIENT_DEFAULTS, isBuiltInClientKey } from "@salesforce/storefront-next-runtime/scapi";

//#region src/scapi/schema-utils.ts
/**
* Convert an API name like "shopper-products" to a camelCase client key like "shopperProducts".
*
* Some SDK clients are versioned (e.g., shopper-baskets v1 → shopperBasketsV1, v2 → shopperBasketsV2).
* If `apiVersion` is provided and the version-suffixed key matches a built-in client, we return
* that — otherwise we fall back to the bare camelCase name. This means `shopper-products` always
* resolves to `shopperProducts`, but `shopper-baskets` correctly resolves to `shopperBasketsV1`
* or `shopperBasketsV2` depending on which version the user is registering.
*/
function deriveClientKey(apiName, apiVersion) {
	const camel = apiName.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
	if (apiVersion) {
		const versioned = `${camel}${apiVersion.charAt(0).toUpperCase() + apiVersion.slice(1)}`;
		if (versioned in BUILT_IN_CLIENT_DEFAULTS) return versioned;
	}
	return camel;
}
/**
* Derive the SCAPI base path from an OpenAPI schema file.
*
* Parses the `servers[].url` field. SCAPI schemas typically have server URLs like:
*   https://{shortCode}.api.commercecloud.salesforce.com/product/shopper-products/v1
*
* Returns the path portion (e.g., "/product/shopper-products/v1").
*
* @param schemaPath - Path to the OAS YAML/JSON file
* @returns The derived base path, or undefined if it cannot be determined
*/
function deriveBasePath(schemaPath) {
	const content = readFileSync(schemaPath, "utf-8");
	const ext = extname(schemaPath).toLowerCase();
	let schema;
	if (ext === ".yaml" || ext === ".yml") schema = YAML.parse(content);
	else schema = JSON.parse(content);
	const servers = schema.servers;
	if (!servers || servers.length === 0) return void 0;
	const serverUrl = servers[0].url;
	if (!serverUrl) return void 0;
	try {
		const normalizedUrl = serverUrl.replace(/\{[^}]+\}/g, "placeholder");
		const pathname = new URL(normalizedUrl).pathname;
		return pathname && pathname !== "/" ? pathname : void 0;
	} catch {
		if (serverUrl.startsWith("/") && serverUrl !== "/") return serverUrl;
		return serverUrl.match(/(?:https?:\/\/[^/]+)?(\/.+)/)?.[1] ?? void 0;
	}
}
/**
* Read all .meta.json sidecars from a schemas directory.
*/
function readAllSchemaMetadata(schemasDir) {
	if (!existsSync(schemasDir)) return [];
	return readdirSync(schemasDir).filter((f) => f.endsWith(".meta.json")).map((f) => {
		const content = JSON.parse(readFileSync(join(schemasDir, f), "utf-8"));
		const schemaName = f.replace(".meta.json", "");
		return {
			...content,
			schemaName
		};
	});
}
/**
* Write a .meta.json sidecar for a schema file.
*/
function writeSchemaMetadata(schemasDir, schemaName, meta) {
	writeFileSync(join(schemasDir, `${schemaName}.meta.json`), `${JSON.stringify(meta, null, 4)}\n`, "utf-8");
}

//#endregion
export { readAllSchemaMetadata as a, isBuiltInClientKey as i, deriveBasePath as n, writeSchemaMetadata as o, deriveClientKey as r, BUILT_IN_CLIENT_DEFAULTS as t };