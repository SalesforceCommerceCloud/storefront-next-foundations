import { n as isDesignModeActive, r as isPreviewModeActive } from "./modeDetection.js";
import { n as defaultSecurityHeaders, r as pageDesignerFrameAncestors, t as defaultCspDirectives } from "./defaults.js";
import { t as isRemote } from "./env2.js";
import { createContext } from "react-router";
import { randomBytes } from "node:crypto";
import { z } from "zod";

//#region src/security/nonce.ts
/** 16 bytes (128 bits) of CSPRNG-grade entropy, base64-encoded → 24 chars. */
const NONCE_BYTES = 16;
/** Generate a fresh CSP nonce. Each request must call this exactly once. */
function generateNonce() {
	return randomBytes(NONCE_BYTES).toString("base64");
}
/** React Router context carrying the current request's CSP nonce. */
const securityContext = createContext(null);
/**
* Read the current request's CSP nonce. Returns `null` when the security
* middleware is disabled. Server-only — call from a loader or action.
*
* Naming: `get*` (not `use*`) because this is not a React hook — it reads
* the React Router context directly. Mirrors `getLocale` / `getTranslation`
* in the i18n module.
*
* The nonce is meaningful only on the SSR-rendered inline script. On
* client navigations, the loader runs again and returns a fresh nonce,
* but no new CSP header is emitted, so the loader-returned value should
* not be applied to scripts injected client-side.
*
* @example
* ```ts
* // In root.tsx loader:
* const nonce = getSecurityNonce(args.context);
* return { nonce, ...other };
* ```
*/
function getSecurityNonce(context) {
	return context.get(securityContext)?.nonce ?? null;
}

//#endregion
//#region src/security/schema.ts
const VALID_CSP_DIRECTIVES = [
	"default-src",
	"script-src",
	"style-src",
	"img-src",
	"font-src",
	"connect-src",
	"frame-src",
	"frame-ancestors",
	"form-action",
	"base-uri",
	"object-src",
	"manifest-src",
	"media-src",
	"worker-src",
	"child-src",
	"report-uri",
	"report-to",
	"upgrade-insecure-requests"
];
const cspDirectivesSchema = z.record(z.string(), z.union([z.array(z.string()), z.literal(true)])).superRefine((directives, ctx) => {
	for (const name of Object.keys(directives)) {
		if (!VALID_CSP_DIRECTIVES.includes(name)) ctx.addIssue({
			code: "custom",
			message: `Invalid CSP directive name "${name}". Valid: ${VALID_CSP_DIRECTIVES.join(", ")}`,
			path: [name]
		});
		if (name === "upgrade-insecure-requests") {
			if (directives[name] !== true) ctx.addIssue({
				code: "custom",
				message: `'upgrade-insecure-requests' must be the literal value true`,
				path: [name]
			});
		} else if (!Array.isArray(directives[name])) ctx.addIssue({
			code: "custom",
			message: `Directive "${name}" must be a string array`,
			path: [name]
		});
	}
});
const cspConfigSchema = z.object({
	directives: cspDirectivesSchema.optional(),
	reportOnly: z.boolean().optional()
});
const hstsConfigSchema = z.object({
	maxAge: z.number().int().nonnegative().optional(),
	includeSubDomains: z.boolean().optional(),
	preload: z.boolean().optional()
});
const referrerPolicySchema = z.enum([
	"no-referrer",
	"no-referrer-when-downgrade",
	"origin",
	"origin-when-cross-origin",
	"same-origin",
	"strict-origin",
	"strict-origin-when-cross-origin",
	"unsafe-url"
]);
const securityConfigSchema = z.object({
	enabled: z.boolean().optional(),
	csp: z.union([cspConfigSchema, z.literal(false)]).optional(),
	hsts: z.union([hstsConfigSchema, z.literal(false)]).optional(),
	frameOptions: z.union([z.enum(["DENY", "SAMEORIGIN"]), z.literal(false)]).optional(),
	contentTypeOptions: z.union([z.literal("nosniff"), z.literal(false)]).optional(),
	referrerPolicy: z.union([referrerPolicySchema, z.literal(false)]).optional(),
	permissionsPolicy: z.union([z.record(z.string(), z.array(z.string())), z.literal(false)]).optional()
});
/**
* Validate a `SecurityConfig`. Throws a `ZodError` with a clear message on
* invalid directive names or value shapes. Called once at server boot.
*/
function parseSecurityConfig(input) {
	return securityConfigSchema.parse(input);
}

//#endregion
//#region src/security/serialize.ts
/**
* Serialize a `CspDirectives` map to a CSP header string.
*
* If `nonce` is provided, it is appended to `script-src` (creating it
* if absent). Empty directive arrays are omitted.
* `upgrade-insecure-requests` is serialized as a bare keyword.
*/
function serializeCsp(directives, options) {
	const parts = [];
	let scriptSrcEmitted = false;
	for (const [name, value] of Object.entries(directives)) {
		if (name === "upgrade-insecure-requests") {
			if (value === true) parts.push("upgrade-insecure-requests");
			continue;
		}
		const sources = value;
		if (!sources || sources.length === 0) continue;
		if (name === "script-src" && options?.nonce) {
			parts.push(`script-src ${[...sources, `'nonce-${options.nonce}'`].join(" ")}`);
			scriptSrcEmitted = true;
		} else parts.push(`${name} ${sources.join(" ")}`);
	}
	if (options?.nonce && !scriptSrcEmitted) parts.push(`script-src 'nonce-${options.nonce}'`);
	return parts.join("; ");
}
/**
* Serialize a Permissions-Policy map to a header string.
*
* Per the W3C structured-field grammar, the keywords `self` and `*` are
* emitted unquoted; all other allowlist entries are emitted as quoted
* strings (the schema rejects malformed origins before they reach here).
* Empty allowlists serialize to `name=()` (deny).
*
* Reference: https://www.w3.org/TR/permissions-policy/#permissions-policy-http-header-field
*/
function serializePermissionsPolicy(policy) {
	return Object.entries(policy).map(([feature, allowlist]) => {
		if (allowlist.length === 0) return `${feature}=()`;
		return `${feature}=(${allowlist.map((origin) => origin === "self" || origin === "*" ? origin : `"${origin}"`).join(" ")})`;
	}).join(", ");
}
/**
* Serialize an HSTS config to a header string.
*/
function serializeHsts(hsts) {
	const parts = [`max-age=${hsts.maxAge}`];
	if (hsts.includeSubDomains) parts.push("includeSubDomains");
	if (hsts.preload) parts.push("preload");
	return parts.join("; ");
}

//#endregion
//#region src/security/contributors/lru-cache.ts
/**
* Copyright 2026 Salesforce, Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
/**
* Minimal bounded LRU cache. Map preserves insertion order, so the first key
* in iteration order is the least-recently-used; `get` re-inserts to refresh
* recency. No external dependency. Used by the CSP resolver to memoize
* per-request bodies keyed on the fired-set.
*/
var BoundedCache = class {
	store = /* @__PURE__ */ new Map();
	constructor(capacity) {
		this.capacity = capacity;
		if (capacity < 1) throw new Error("BoundedCache capacity must be >= 1");
	}
	get(key) {
		if (!this.store.has(key)) return void 0;
		const value = this.store.get(key);
		this.store.delete(key);
		this.store.set(key, value);
		return value;
	}
	set(key, value) {
		this.store.delete(key);
		this.store.set(key, value);
		if (this.store.size > this.capacity) {
			const oldest = this.store.keys().next().value;
			if (oldest !== void 0) this.store.delete(oldest);
		}
	}
	get size() {
		return this.store.size;
	}
};

//#endregion
//#region src/security/contributors/origin.ts
/**
* Inspect a candidate CSP origin against the safety rules: must be a string,
* contain no `*` (wildcard), no whitespace or CSP separators (`;` `,` — which
* could split/inject directives), be a parseable `https:` URL, and carry no
* userinfo credentials. Returns the canonical origin when safe.
*
* Note: a safe-but-non-canonical value (e.g. one with a path) has `issue: null`
* and a normalized `origin` — callers decide whether to normalize (use `origin`)
* or reject (compare the raw input to `origin`).
*/
function inspectCspOrigin(value) {
	if (typeof value !== "string") return {
		issue: "not-string",
		origin: null
	};
	if (value.includes("*")) return {
		issue: "wildcard",
		origin: null
	};
	if (/[\s;,]/.test(value)) return {
		issue: "separator",
		origin: null
	};
	let url;
	try {
		url = new URL(value);
	} catch {
		return {
			issue: "unparseable",
			origin: null
		};
	}
	if (url.protocol !== "https:") return {
		issue: "not-https",
		origin: null
	};
	if (url.username !== "" || url.password !== "") return {
		issue: "credentials",
		origin: null
	};
	return {
		issue: null,
		origin: url.origin
	};
}
/**
* Normalize a config URL to an exact CSP source origin, or null if unsafe.
* Strips any path/query/fragment — returns `scheme://host[:port]` only.
* This is the canonical helper template-side contributors should use to turn
* a configured URL into a CSP directive value.
*/
function normalizeCspOrigin(value) {
	return inspectCspOrigin(value).origin;
}

//#endregion
//#region src/security/contributors/registry.ts
const DIRECTIVE_SET = new Set(VALID_CSP_DIRECTIVES.filter((d) => d !== "upgrade-insecure-requests"));
/**
* Validate a single contributor origin string. Returns an error message, or
* null when valid. Rules: https only, no wildcard, no whitespace or CSP
* separators that could split/inject directives.
*/
function originError(origin) {
	const { issue, origin: canonical } = inspectCspOrigin(origin);
	switch (issue) {
		case "wildcard": return `wildcard not allowed in contributor origin: "${origin}"`;
		case "separator": return `invalid origin (whitespace or separator): "${origin}"`;
		case "not-string":
		case "unparseable": return `invalid origin (unparseable): "${origin}"`;
		case "not-https": return `contributor origin must be https: "${origin}"`;
		case "credentials": return `invalid origin (must not contain credentials): "${origin}"`;
	}
	if (origin !== canonical) return `invalid origin (must be an exact scheme+host[:port] with no path/query/fragment): "${origin}"`;
	return null;
}
function validateContribution(id, contribution) {
	for (const [directive, origins] of Object.entries(contribution)) {
		if (!DIRECTIVE_SET.has(directive)) throw new Error(`[security] contributor "${id}" targets unknown directive "${directive}".`);
		for (const origin of origins ?? []) {
			const err = originError(origin);
			if (err) throw new Error(`[security] contributor "${id}": ${err}`);
		}
	}
}
/**
* Boot-time guardrails for the CSP contributor set. Throws (fail-loud) on any
* malformed contributor so the problem surfaces in CI / first deploy, not in
* production. Also emits the resolved contributor set for observability.
*
* Each contributor's `contribute()` is validated against the SAME
* `baseDirectives` the resolver will serve it with — so we validate exactly the
* contribution that reaches the header, not a probe approximation. `contribute`
* is expected to be pure (it returns origins to ADD regardless of base), but
* validating the real output removes any reliance on that assumption.
*
* @param baseDirectives The resolved base directives the resolver folds
* contributions into. Defaults to `{}` for standalone validation.
*/
function validateContributors(contributors, baseDirectives = {}) {
	const seen = /* @__PURE__ */ new Set();
	const ctx = { baseDirectives };
	const summaries = [];
	for (const c of contributors) {
		if (typeof c.id !== "string" || c.id.trim() === "") throw new Error("[security] contributor has a missing or empty id.");
		if (!/^[A-Za-z0-9._-]+$/.test(c.id)) throw new Error(`[security] contributor id "${c.id}" must match /^[A-Za-z0-9._-]+$/ (no separators or whitespace).`);
		if (seen.has(c.id)) throw new Error(`[security] duplicate contributor id "${c.id}".`);
		seen.add(c.id);
		if (typeof c.isActive !== "function" || typeof c.contribute !== "function") throw new Error(`[security] contributor "${c.id}" must define isActive and contribute.`);
		if (c.perRequest !== void 0 && typeof c.perRequest.shouldApply !== "function") throw new Error(`[security] contributor "${c.id}" perRequest.shouldApply must be a function.`);
		const contribution = c.contribute(ctx);
		validateContribution(c.id, contribution);
		const dirs = Object.keys(contribution).join(",");
		summaries.push(`${c.id}[${dirs}]${c.perRequest ? "(perRequest)" : ""}`);
	}
	console.info(`[security] CSP contributors registered: ${summaries.join(" ") || "(none)"}`);
}

//#endregion
//#region src/security/contributors/resolve-csp.ts
/** Default cap on memoized per-request bodies. Tunable; see the design doc. */
const DEFAULT_CACHE_CEILING = 256;
/** Union `addition` into `target` per directive, de-duplicating, returning a new map. */
function mergeContribution(target, addition) {
	const out = { ...target };
	for (const [directive, origins] of Object.entries(addition)) {
		const merged = [...out[directive] ?? []];
		for (const origin of origins) if (!merged.includes(origin)) merged.push(origin);
		out[directive] = merged;
	}
	return out;
}
/**
* Resolve CSP from base directives + contributors.
*
* Boot: contributors are guardrail-validated (fail-loud), then active boot-static
* contributors fold into `staticDirectives` once.
* Per request: per-request contributors' cheap `shouldApply(rawUrl)` guards run;
* if none fire, the shared `staticDirectives` is returned (no build). If some
* fire, the body is built once and memoized keyed on the fired-set id list.
*
* Validation runs here so a consumer cannot resolve a CSP from unvalidated
* contributors (which could leak a wildcard / non-https / malformed origin into
* the header). It is boot-time and idempotent.
*/
function resolveCsp(input) {
	const { baseDirectives, contributors } = input;
	const ceiling = input.cacheCeiling ?? DEFAULT_CACHE_CEILING;
	validateContributors(contributors, baseDirectives);
	const active = contributors.filter((c) => c.isActive({ baseDirectives }));
	const bootStatic = active.filter((c) => c.perRequest === void 0);
	let staticDirectives = { ...baseDirectives };
	for (const c of bootStatic) staticDirectives = mergeContribution(staticDirectives, c.contribute({ baseDirectives }));
	const perRequest = [];
	for (const c of active) {
		if (c.perRequest === void 0) continue;
		perRequest.push({
			id: c.id,
			perRequest: c.perRequest,
			contribution: c.contribute({ baseDirectives })
		});
	}
	const p = perRequest.length;
	const combos = p >= 31 ? Number.POSITIVE_INFINITY : 2 ** p;
	if (combos > ceiling) console.warn(`[security] CSP per-request contributors P=${p} → 2^${p} possible bodies exceeds cache ceiling ${ceiling}; LRU eviction may cause rebuilds. Review whether this many per-request contributors is intended.`);
	const cache = new BoundedCache(Math.max(1, Math.min(combos, ceiling)));
	function directivesForRequest(rawUrl) {
		if (perRequest.length === 0) return staticDirectives;
		let firedKey = "";
		let fired;
		for (const c of perRequest) if (c.perRequest.shouldApply(rawUrl)) {
			(fired ??= []).push(c);
			firedKey += firedKey ? `|${c.id}` : c.id;
		}
		if (fired === void 0) return staticDirectives;
		const cached = cache.get(firedKey);
		if (cached) return cached;
		let built = staticDirectives;
		for (const c of fired) built = mergeContribution(built, c.contribution);
		cache.set(firedKey, built);
		return built;
	}
	return {
		staticDirectives,
		directivesForRequest
	};
}

//#endregion
//#region src/security/middleware.ts
/**
* Merge customer config with SDK defaults. Per-directive replace: any
* directive the customer sets fully replaces the SDK default for that key
* (object spread semantics).
*
* Narrows defaults via a runtime check rather than `as Required<...>` casts,
* so a future change that sets `defaults.csp = false` or `defaults.hsts = false`
* is caught here instead of producing `max-age=undefined` at the wire.
*/
function resolve(input) {
	const defaultsCsp = defaultSecurityHeaders.csp === false ? null : defaultSecurityHeaders.csp;
	const defaultsHsts = defaultSecurityHeaders.hsts === false ? null : defaultSecurityHeaders.hsts;
	return {
		enabled: input.enabled ?? defaultSecurityHeaders.enabled,
		csp: input.csp === false ? false : {
			directives: {
				...defaultsCsp?.directives ?? {},
				...input.csp?.directives ?? {}
			},
			reportOnly: input.csp?.reportOnly ?? false
		},
		hsts: input.hsts === false ? false : input.hsts === void 0 ? defaultsHsts ?? false : {
			...defaultsHsts ?? {
				maxAge: 0,
				includeSubDomains: false,
				preload: false
			},
			...input.hsts
		},
		frameOptions: input.frameOptions ?? defaultSecurityHeaders.frameOptions,
		contentTypeOptions: input.contentTypeOptions ?? defaultSecurityHeaders.contentTypeOptions,
		referrerPolicy: input.referrerPolicy ?? defaultSecurityHeaders.referrerPolicy,
		permissionsPolicy: input.permissionsPolicy ?? defaultSecurityHeaders.permissionsPolicy
	};
}
/**
* Boot-time warnings. Logged once per server start when potentially
* unsafe configurations are active.
*/
function warnIfUnsafe(resolved) {
	if (!resolved.enabled) {
		console.warn("[security] All security headers disabled via config. This is not recommended for production.");
		return;
	}
	if (resolved.csp === false) console.warn("[security] CSP disabled via config. Other headers still applied.");
	else if (resolved.csp.reportOnly) console.warn("[security] CSP is in report-only mode. This is intended for migration only. Set csp.reportOnly to false before going to production.");
	if (resolved.csp !== false) {
		const scriptSrc = resolved.csp.directives["script-src"];
		if (Array.isArray(scriptSrc) && !scriptSrc.includes("'self'")) console.warn("[security] CSP script-src does not include 'self'. The inline window.__APP_CONFIG__ script may fail to execute.");
	}
}
/**
* Create the React Router middleware that applies default security
* response headers.
*
* - Validates customer config via zod at factory call (boot). Throws on
*   invalid directive names with a clear message.
* - Generates a fresh CSP nonce per request (16 bytes / 24 base64 chars).
*   Sets it on `securityContext` for `getSecurityNonce()` consumers.
* - Merges customer directives over SDK defaults (per-directive replace).
* - HSTS is suppressed locally — emitted only when running on MRT
*   (BUNDLE_ID set and not 'local').
*
* @param input - Customer security config from `config.server.ts`. Any
* field omitted falls back to the SDK default.
* @param contributors - Boot-static CSP contributors to fold into the
* directives after env-adjust. Contributors' origins are validated and
* merged at boot, then folded after #2016 local-dev adjustments.
*
* Reads (at boot, once):
* - `process.env.BUNDLE_ID` — when set and not 'local', emit HSTS.
*
* @example
* ```ts
* const mw = createSecurityHeadersMiddleware(config.security, contributors);
* // register in root.tsx middleware chain before appConfigMiddleware
* ```
*/
function createSecurityHeadersMiddleware(input = {}, contributors = []) {
	parseSecurityConfig(input);
	const resolved = resolve(input);
	warnIfUnsafe(resolved);
	const remote = isRemote();
	if (!remote && resolved.csp !== false) {
		const connectSrc = resolved.csp.directives["connect-src"];
		if (Array.isArray(connectSrc)) {
			const devSocketSources = ["ws://localhost:*", "ws://127.0.0.1:*"];
			resolved.csp.directives["connect-src"] = [...connectSrc, ...devSocketSources.filter((s) => !connectSrc.includes(s))];
		}
		delete resolved.csp.directives["upgrade-insecure-requests"];
	}
	if (contributors.length > 0 && resolved.csp !== false) resolved.csp.directives = resolveCsp({
		baseDirectives: resolved.csp.directives,
		contributors
	}).staticDirectives;
	const staticHsts = remote && resolved.hsts !== false ? serializeHsts(resolved.hsts) : null;
	const permissionsHeader = resolved.permissionsPolicy === false ? null : serializePermissionsPolicy(resolved.permissionsPolicy);
	const cspHeaderName = resolved.csp !== false && resolved.csp.reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
	let staticCspBody = null;
	let staticCspBodyForPageDesigner = null;
	let baseScriptSrc = "";
	if (resolved.csp !== false) {
		const { "script-src": scriptSrc,...rest } = resolved.csp.directives;
		staticCspBody = serializeCsp(rest);
		baseScriptSrc = (scriptSrc ?? []).join(" ");
		const customerFrameAncestors = rest["frame-ancestors"] ?? [];
		if (!customerFrameAncestors.some((src) => src !== "'self'")) staticCspBodyForPageDesigner = serializeCsp({
			...rest,
			"frame-ancestors": [...customerFrameAncestors, ...pageDesignerFrameAncestors]
		});
	}
	/**
	* Apply the resolved security headers to a response. Pulled into a helper
	* so we can run it on the success path AND on a thrown Response (RR
	* loaders/actions throw `Response` for 404/redirect/etc.). Without this,
	* a 404 error response would ship without security headers.
	*/
	const applyHeaders = (response, nonce, cspBody, isEmbeddable) => {
		if (cspBody !== null && nonce !== null) {
			const scriptSrcClause = baseScriptSrc.length > 0 ? `script-src ${baseScriptSrc} 'nonce-${nonce}'` : `script-src 'nonce-${nonce}'`;
			const csp = cspBody.length > 0 ? `${cspBody}; ${scriptSrcClause}` : scriptSrcClause;
			response.headers.set(cspHeaderName, csp);
		}
		if (staticHsts !== null) response.headers.set("Strict-Transport-Security", staticHsts);
		if (resolved.frameOptions !== false && !isEmbeddable) response.headers.set("X-Frame-Options", resolved.frameOptions);
		if (resolved.contentTypeOptions !== false) response.headers.set("X-Content-Type-Options", resolved.contentTypeOptions);
		if (resolved.referrerPolicy !== false) response.headers.set("Referrer-Policy", resolved.referrerPolicy);
		if (permissionsHeader !== null) response.headers.set("Permissions-Policy", permissionsHeader);
		return response;
	};
	return async (args, next) => {
		if (!resolved.enabled) return next();
		const nonce = resolved.csp === false ? null : generateNonce();
		if (nonce !== null) args.context.set(securityContext, { nonce });
		const isEmbeddable = staticCspBodyForPageDesigner !== null && (isDesignModeActive(args.request) || isPreviewModeActive(args.request));
		const cspBody = isEmbeddable ? staticCspBodyForPageDesigner : staticCspBody;
		try {
			return applyHeaders(await next(), nonce, cspBody, isEmbeddable);
		} catch (err) {
			if (err instanceof Response) throw applyHeaders(err, nonce, cspBody, isEmbeddable);
			throw err;
		}
	};
}

//#endregion
export { BoundedCache, createSecurityHeadersMiddleware, defaultCspDirectives, defaultSecurityHeaders, getSecurityNonce, inspectCspOrigin, normalizeCspOrigin, resolveCsp, securityContext, validateContributors };
//# sourceMappingURL=security.js.map