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
 * Fixture loader for the Page Designer Attribute Serialization parity
 * harness. Pure data — no runtime dependencies. Both ECOM-side parity
 * tests (when run) and MRT-side parity tests load fixtures through this
 * single accessor so the layout on disk stays an implementation detail.
 *
 * Each fixture is a triple `(manifest, expected, meta)` stored under
 * `fixtures/<fixture-id>/`. See `README.md` for the on-disk layout
 * contract.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, 'fixtures');

/**
 * Capture metadata for a fixture: the ECOM stack identifier, the
 * request host the SCAPI getPage call was issued against, and the
 * locale parameters used so the MRT harness can replay the resolution
 * deterministically.
 */
export interface ParityFixtureMeta {
    /** Free-form identifier of the ECOM stack the capture came from. */
    sourceStack: string;
    /** Storefront origin used when SCAPI getPage was captured (e.g. `https://www.shop.example`). */
    requestHost: string;
    /** Locale the page was resolved at (e.g. `en_US`). */
    locale: string;
    /** Site default locale (e.g. `en_US`). */
    defaultLocale: string;
    /** Site identifier for URL building (e.g. `RefArch`). */
    siteId: string;
    /** ISO 8601 capture timestamp. */
    capturedAt: string;
    /** Free-form description of what this fixture exercises. */
    description: string;
}

/**
 * A single parity fixture: input manifest, expected SCAPI getPage
 * response, and capture metadata. The `manifest` and `expected` types
 * are intentionally `unknown` so this loader has zero coupling to
 * either the SDK's `PageManifest` shape or the SCAPI `Page` shape —
 * callers are expected to cast on consumption.
 */
export interface ParityFixture {
    id: string;
    manifest: unknown;
    expected: unknown;
    meta: ParityFixtureMeta;
}

/**
 * Lists fixture IDs (subdirectory names under `fixtures/`).
 * Filters out hidden entries (those starting with `.`).
 */
export function listFixtureIds(): string[] {
    if (!fs.existsSync(fixturesDir)) return [];

    return fs
        .readdirSync(fixturesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => entry.name)
        .sort();
}

/**
 * Loads a single fixture by ID. Throws if any of the three files
 * (`manifest.json`, `expected.json`, `meta.json`) is missing.
 */
export function loadFixture(id: string): ParityFixture {
    const dir = path.join(fixturesDir, id);
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    const expected = JSON.parse(fs.readFileSync(path.join(dir, 'expected.json'), 'utf8'));
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')) as ParityFixtureMeta;

    return { id, manifest, expected, meta };
}

/** Loads every fixture in {@link listFixtureIds} order. */
export function loadAllFixtures(): ParityFixture[] {
    return listFixtureIds().map(loadFixture);
}

/**
 * Canonicalises a JSON value by sorting object keys recursively. Used
 * by the parity harness to compare resolved pages independently of
 * key order. Arrays preserve their order.
 */
export function canonicalize<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map(canonicalize) as unknown as T;
    }

    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;

        return Object.keys(obj)
            .sort()
            .reduce<Record<string, unknown>>((acc, key) => {
                acc[key] = canonicalize(obj[key]);
                return acc;
            }, {}) as unknown as T;
    }

    return value;
}
