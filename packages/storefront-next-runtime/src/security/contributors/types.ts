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
import type { CspDirectives } from '../types.js';

/**
 * The CSP directive names a contributor may target. Mirrors the keys of
 * `CspDirectives` minus the valueless `upgrade-insecure-requests` (a
 * contributor adds origins; it does not toggle that keyword).
 */
export type CspDirectiveName = Exclude<keyof CspDirectives, 'upgrade-insecure-requests'>;

/** A per-directive map of origin strings a contributor wants added. */
export type CspContribution = Partial<Record<CspDirectiveName, string[]>>;

/**
 * Context passed to a contributor's `isActive` / `contribute` at BOOT.
 * Intentionally minimal and feature-agnostic: the SDK does not know about
 * any specific feature's config shape (that lives in the template). The
 * template supplies whatever its contributors need via closure when it
 * constructs them — this context only carries SDK-known, boot-stable data.
 */
export interface CspResolutionContext {
    /**
     * The fully-resolved customer CSP directives (defaults merged with
     * config.server.ts overrides). Read-only; contributors must not mutate it.
     */
    readonly baseDirectives: Readonly<CspDirectives>;
}

/**
 * A feature's CSP needs, expressed once as a typed contract.
 *
 * Lifecycle: `isActive` and `contribute` run at BOOT only. `perRequest`, when
 * present, marks the contribution as request-varying — its `shouldApply` runs
 * on the hot path and MUST be cheap (string ops on the raw URL only).
 */
export interface CspContributor {
    /** Stable unique id — used for dedupe, the fired-set cache key, logging. */
    readonly id: string;

    /** Does this feature apply at all? Reads the feature's own config. Boot-time. */
    isActive(ctx: CspResolutionContext): boolean;

    /** Origins to add, per directive. EXACT hosts. Pure — no I/O. Boot-time. */
    contribute(ctx: CspResolutionContext): CspContribution;

    /**
     * OPTIONAL. Present ONLY when the contribution varies per request.
     * Absent → the contribution folds into the boot-static body (zero hot-path
     * cost). Present → the body is built lazily and cached per fired-set.
     */
    readonly perRequest?: {
        /**
         * Cheap predicate deciding whether this contributor applies to a
         * request. Receives ONLY the raw URL string — no Request, headers,
         * context, or I/O. Must be allocation-free in the common case
         * (e.g. `url => url.includes('mode=')`). No catastrophic-backtracking
         * regexes.
         */
        shouldApply(rawUrl: string): boolean;
    };
}
