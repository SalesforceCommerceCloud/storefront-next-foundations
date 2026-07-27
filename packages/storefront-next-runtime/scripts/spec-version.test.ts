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

import { describe, expect, it } from 'vitest';

import {
    type RawAsset,
    compareSemver,
    isMalformedVersion,
    latestReleasedVersion,
    resolveStatus,
} from './spec-version.ts';

describe('compareSemver', () => {
    it('orders by major, then minor, then patch', () => {
        expect(compareSemver('2.0.0', '1.9.9')).toBeGreaterThan(0);
        expect(compareSemver('1.2.0', '1.1.9')).toBeGreaterThan(0);
        expect(compareSemver('1.1.2', '1.1.1')).toBeGreaterThan(0);
        expect(compareSemver('1.1.1', '1.1.1')).toBe(0);
        expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0);
    });
});

describe('isMalformedVersion', () => {
    it('accepts clean MAJOR.MINOR.PATCH', () => {
        expect(isMalformedVersion('1.5.2')).toBe(false);
        expect(isMalformedVersion('0.0.0')).toBe(false);
        expect(isMalformedVersion('10.20.30')).toBe(false);
    });

    it('rejects two-part, pre-release, and build-suffixed versions', () => {
        // The real bug: shopper-experience shipped "1.50" in exchange.json.
        expect(isMalformedVersion('1.50')).toBe(true);
        expect(isMalformedVersion('1.5')).toBe(true);
        expect(isMalformedVersion('1.2.0-master-b68')).toBe(true);
        expect(isMalformedVersion('1.1.0-PR-44-b5')).toBe(true);
        expect(isMalformedVersion('v1.2.3')).toBe(true);
    });

    it('rejects leading-zero components', () => {
        // RELEASE_SEMVER's `(0|[1-9]\d*)` alternation forbids leading zeros, so
        // a typo'd "1.019" is malformed (not 1.0.19). Pinning this guards the
        // regex against a future "simplification" to `\d+`, which would let a
        // leading-zero typo silently mis-rank versions.
        expect(isMalformedVersion('1.019')).toBe(true);
        expect(isMalformedVersion('01.2.3')).toBe(true);
        expect(resolveStatus('1.2.0', '1.019')).toBe('outdated');
    });
});

describe('latestReleasedVersion', () => {
    const asset: RawAsset = {
        versionGroups: [
            {
                versions: [
                    { version: '1.5.2' },
                    { version: '1.5.1' },
                    { version: '1.5.0' },
                    { version: '1.2.0-master-b68' }, // non-release, must be ignored
                    { version: '2.11.0' }, // different major
                ],
            },
        ],
    };

    it('returns the newest clean release matching the apiVersion major', () => {
        expect(latestReleasedVersion(asset, 'v1')).toBe('1.5.2');
        expect(latestReleasedVersion(asset, 'v2')).toBe('2.11.0');
    });

    it('ignores pre-release / build-suffixed versions', () => {
        const onlyPrereleases: RawAsset = {
            versionGroups: [{ versions: [{ version: '1.2.0-master-b68' }, { version: '1.1.0-PR-44-b5' }] }],
        };
        expect(latestReleasedVersion(onlyPrereleases, 'v1')).toBeNull();
    });

    it('returns null when no version matches the major', () => {
        expect(latestReleasedVersion(asset, 'v3')).toBeNull();
    });

    it('tolerates missing versionGroups/versions', () => {
        expect(latestReleasedVersion({}, 'v1')).toBeNull();
        expect(latestReleasedVersion({ versionGroups: [{}] }, 'v1')).toBeNull();
    });
});

describe('resolveStatus', () => {
    it('reports no-release-found when Exchange has no matching release', () => {
        expect(resolveStatus(null, '1.0.0')).toBe('no-release-found');
    });

    it('reports outdated when a newer clean release exists', () => {
        expect(resolveStatus('1.5.2', '1.5.0')).toBe('outdated');
    });

    it('reports up-to-date when tracked matches latest', () => {
        expect(resolveStatus('1.5.2', '1.5.2')).toBe('up-to-date');
    });

    it('does not downgrade when tracked is somehow ahead', () => {
        expect(resolveStatus('1.5.0', '1.5.2')).toBe('up-to-date');
    });

    it('treats a malformed tracked version as outdated, never up-to-date', () => {
        // Regression guard for the shopper-experience "1.50" drift: naive
        // compareSemver('1.5.2', '1.50') parses "1.50" as minor=50 and would
        // (wrongly) say up-to-date, masking a real 1.5.0 -> 1.5.2 drift forever.
        expect(compareSemver('1.5.2', '1.50')).toBeLessThan(0); // the trap
        expect(resolveStatus('1.5.2', '1.50')).toBe('outdated'); // the fix
    });
});
