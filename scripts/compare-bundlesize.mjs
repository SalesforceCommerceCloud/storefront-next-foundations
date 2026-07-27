#!/usr/bin/env node
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
 * Compares two bundlemeta JSON files (produced by vite-plugin-bundlesize) and
 * exits non-zero if any chunk pattern group grows beyond the given tolerance.
 * Reductions (candidate smaller than baseline) are always acceptable.
 *
 * A growth is only a failure when it exceeds BOTH the percentage tolerance AND
 * an absolute-byte floor (`--min-delta-bytes`). Without the floor, a few bytes
 * added to a sub-kB chunk reads as a large percentage (e.g. +22 bytes on a
 * 244-byte route chunk = 9%) and fails the gate over pure noise. Large chunks
 * are unaffected — 1.5% of any chunk above ~17 kB already exceeds 256 bytes.
 *
 * Usage:
 *   node compare-bundlesize.mjs \
 *       --baseline path/to/client-bundlemeta.json \
 *       --candidate path/to/client-bundlemeta.json \
 *       [--tolerance 1] \
 *       [--min-delta-bytes 256]
 *
 * @env BUNDLES_SIZE_CHECK — not required; this script reads pre-built metadata.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
    options: {
        baseline: { type: 'string' },
        candidate: { type: 'string' },
        tolerance: { type: 'string', default: '1' },
        'min-delta-bytes': { type: 'string', default: '256' },
    },
});

if (!values.baseline || !values.candidate) {
    console.error('Usage: compare-bundlesize.mjs --baseline <path> --candidate <path> [--tolerance <pct>]');
    process.exit(2);
}

const tolerance = parseFloat(values.tolerance);
const minDeltaBytes = parseInt(values['min-delta-bytes'], 10);
const baseline = JSON.parse(readFileSync(resolve(values.baseline), 'utf8'));
const candidate = JSON.parse(readFileSync(resolve(values.candidate), 'utf8'));

function stripHash(chunkId) {
    return chunkId.replace(/^assets\//, '').replace(/\.[A-Za-z0-9_-]{6,12}\.(js|css)$/, '');
}

const baselineByPattern = new Map();
for (const [id, chunk] of Object.entries(baseline.chunks)) {
    baselineByPattern.set(stripHash(id), chunk.size);
}

const candidateByPattern = new Map();
for (const [id, chunk] of Object.entries(candidate.chunks)) {
    candidateByPattern.set(stripHash(id), chunk.size);
}

const allPatterns = new Set([...baselineByPattern.keys(), ...candidateByPattern.keys()]);
const failures = [];
const rows = [];

for (const pat of [...allPatterns].sort()) {
    const bSize = baselineByPattern.get(pat);
    const cSize = candidateByPattern.get(pat);

    if (bSize == null || cSize == null) {
        const status = bSize == null ? 'NEW' : 'REMOVED';
        rows.push({ pat, bSize: bSize ?? 0, cSize: cSize ?? 0, delta: (cSize ?? 0) - (bSize ?? 0), pct: status });
        if (status === 'NEW' && cSize > 1024) {
            failures.push(`${pat}: new chunk (${(cSize / 1024).toFixed(1)} kB) with no baseline equivalent`);
        }
        continue;
    }

    const delta = cSize - bSize;
    const pct = bSize > 0 ? (delta / bSize) * 100 : 0;

    if (Math.abs(delta) > 0) {
        rows.push({ pat, bSize, cSize, delta, pct: pct.toFixed(3) + '%' });
    }

    // Fail only when growth exceeds BOTH the percentage tolerance and the
    // absolute-byte floor — keeps tiny deltas on small chunks from tripping
    // the gate on noise.
    if (pct > tolerance && delta > minDeltaBytes) {
        failures.push(`${pat}: ${pct.toFixed(3)}% (+${delta} bytes)`);
    }
}

console.log('=== Bundle Size Parity Report ===');
console.log(`Tolerance: ${tolerance}% (min delta to fail: ${minDeltaBytes} bytes)`);
console.log(`Chunks compared: ${allPatterns.size}`);
console.log(`Chunks with delta: ${rows.length}`);
console.log('');

if (rows.length > 0) {
    const header =
        'Pattern'.padEnd(60) + 'Baseline'.padStart(10) + 'Candidate'.padStart(11) + 'Delta'.padStart(8) + '     %';
    console.log(header);
    console.log('-'.repeat(header.length));
    for (const r of rows.sort(
        (a, b) =>
            Math.abs(typeof b.delta === 'number' ? b.delta : 0) - Math.abs(typeof a.delta === 'number' ? a.delta : 0)
    )) {
        const line =
            r.pat.slice(0, 58).padEnd(60) +
            String(r.bSize).padStart(10) +
            String(r.cSize).padStart(11) +
            String(r.delta).padStart(8) +
            '  ' +
            r.pct;
        console.log(line);
    }
}

console.log('');

if (failures.length > 0) {
    console.error(`FAIL: ${failures.length} chunk(s) exceed ${tolerance}% tolerance:`);
    for (const f of failures) {
        console.error(`  • ${f}`);
    }
    process.exit(1);
} else {
    console.log(`PASS: all chunks within ${tolerance}% tolerance`);
}
