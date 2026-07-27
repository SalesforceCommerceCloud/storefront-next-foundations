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
 * Pure version-resolution logic for the SCAPI spec updater, split out from
 * update-scapi-specs.ts so it can be unit-tested without network or filesystem
 * access. update-scapi-specs.ts runs `main()` at import time, so it isn't
 * directly importable — these are the parts worth locking down with tests.
 */

// Only MAJOR.MINOR.PATCH with no pre-release/build suffix — released specs only.
// See https://semver.org/. Matches raml-toolkit's releaseSemverRegex.
export const RELEASE_SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** Minimal shape of an Exchange asset response (only the fields we read). */
export interface RawAsset {
    files?: Array<{ classifier: string; externalLink?: string }>;
    versionGroups?: Array<{ versions?: Array<{ version: string }> }>;
}

export type SpecStatus = 'up-to-date' | 'outdated' | 'no-release-found';

/** Compare two clean semver strings. Returns >0 when `a` is newer than `b`. */
export function compareSemver(a: string, b: string): number {
    const [aMaj, aMin, aPat] = a.split('.').map(Number);
    const [bMaj, bMin, bPat] = b.split('.').map(Number);
    if (aMaj !== bMaj) return aMaj - bMaj;
    if (aMin !== bMin) return aMin - bMin;
    return aPat - bPat;
}

/**
 * Latest released version for a tracked API: the newest clean semver across the
 * asset's version groups whose major matches the tracked apiVersion number
 * (SCAPI convention: shopper-baskets v1 ↔ 1.x.x, v2 ↔ 2.x.x). Returns null when
 * no released version matches (e.g. only pre-releases exist).
 */
export function latestReleasedVersion(asset: RawAsset, apiVersion: string): string | null {
    const targetMajor = Number(apiVersion.replace(/^v/, ''));
    const candidates: string[] = [];
    for (const group of asset.versionGroups ?? []) {
        for (const { version } of group.versions ?? []) {
            if (RELEASE_SEMVER.test(version) && Number(version.split('.')[0]) === targetMajor) {
                candidates.push(version);
            }
        }
    }
    if (candidates.length === 0) return null;
    return candidates.sort(compareSemver).at(-1) ?? null;
}

/** True when a tracked `exchange.json` version is not clean MAJOR.MINOR.PATCH. */
export function isMalformedVersion(trackedVersion: string): boolean {
    return !RELEASE_SEMVER.test(trackedVersion);
}

/**
 * Decide the update status for one tracked spec.
 *
 * A malformed tracked version (e.g. a hand-edited "1.50") would make
 * compareSemver parse it as [1, 50, NaN] and silently rank a real "1.5.2"
 * release as older — masking genuine drift. Such a version is treated as
 * outdated so the caller pulls the latest clean release and repairs the data.
 */
export function resolveStatus(latest: string | null, trackedVersion: string): SpecStatus {
    if (latest === null) return 'no-release-found';
    if (isMalformedVersion(trackedVersion)) return 'outdated';
    return compareSemver(latest, trackedVersion) > 0 ? 'outdated' : 'up-to-date';
}
