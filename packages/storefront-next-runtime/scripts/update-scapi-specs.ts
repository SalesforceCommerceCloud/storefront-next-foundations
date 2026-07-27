#!/usr/bin/env tsx

/**
 * Update SCAPI OpenAPI specifications from Anypoint Exchange.
 *
 * Replaces the manual "download specs → bump redocly.yaml → regenerate" loop
 * documented in src/scapi-client/README.md. For every spec we already track
 * under `openapi-specs/`, this script asks Anypoint Exchange for the latest
 * released (clean MAJOR.MINOR.PATCH) version in the matching version group,
 * and — when a newer one exists — downloads it, swaps the spec folder, rewrites
 * the `root:` path in `redocly.yaml`, and (unless `--check`) regenerates the
 * client via `pnpm scapi:generate`.
 *
 * The flow mirrors Salesforce's own raml-toolkit exchange connector:
 *   1. POST /accounts/login            → bearer token (username/password)
 *   2. GET  /exchange/api/v1/assets/{groupId}/{assetId}
 *                                      → versionGroups[].versions[]
 *   3. GET  /exchange/api/v1/assets/{groupId}/{assetId}/{version}
 *                                      → files[] (classifier "fat-oas").externalLink
 *   4. download + unzip the fat-oas archive into openapi-specs/
 *
 * Each tracked spec folder carries an `exchange.json` (groupId / assetId /
 * version / apiVersion) — that is the source of truth for what we ship and what
 * to diff against. A version group is matched to a tracked API by semver major
 * == the API version number (SCAPI convention: shopper-baskets v1 ↔ 1.x.x,
 * v2 ↔ 2.x.x).
 *
 * Modes:
 *   (default)   Apply updates: download, swap folders, rewrite redocly.yaml,
 *               then run `pnpm scapi:generate`.
 *   --check     Dry run. Queries Exchange (so it needs credentials), reports
 *               what is out of date, and exits non-zero if any spec has drifted.
 *               Never writes or downloads. Use in CI to gate.
 *   --json      Emit a machine-readable summary of the plan/result to stdout
 *               (in addition to human logs on stderr) for tooling/debugging.
 *   --pr-body <path>
 *               Write a Markdown summary of the applied updates to <path>, for
 *               use as a PR body in CI. Only written in apply mode when a spec
 *               actually changed.
 *
 * @env ANYPOINT_USERNAME - Required in all modes, including `--check`: detecting
 *   drift means asking Exchange for the latest versions, which needs a token.
 *   Anypoint Platform username used to obtain a bearer token. Example:
 *   `svc_sfnext_ci`. (`--check` queries Exchange but never writes or downloads.)
 * @env ANYPOINT_PASSWORD - Required in all modes (see ANYPOINT_USERNAME).
 *   Password for ANYPOINT_USERNAME.
 * @env ANYPOINT_BASE_URL - Optional. Override the Anypoint base URL (default
 *   `https://anypoint.mulesoft.com`). Used by tests/CI to point at a mock
 *   Exchange instead of hitting the live platform. Example:
 *   `http://localhost:8080`.
 *
 * @example
 * ```bash
 * # See what would change without touching anything (exits 1 if drifted):
 * pnpm scapi:update-specs --check
 *
 * # Apply updates and regenerate the client:
 * ANYPOINT_USERNAME=... ANYPOINT_PASSWORD=... pnpm scapi:update-specs
 * ```
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    type RawAsset,
    type SpecStatus,
    compareSemver,
    isMalformedVersion,
    latestReleasedVersion,
    resolveStatus,
} from './spec-version.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_ROOT = path.join(__dirname, '..');
const SPECS_DIR = path.join(PACKAGE_ROOT, 'openapi-specs');
const REDOCLY_PATH = path.join(SPECS_DIR, 'redocly.yaml');

// Anypoint Exchange is the confirmed current source of truth for SCAPI OAS
// specs (same source raml-toolkit / commerce-sdk pull from). A customer-facing
// SCAPI endpoint that returns the latest OAS files was floated as "upcoming"
// (#cc-odyssey) but does not exist yet — migrate this fetch layer to it when it
// ships; the rest of the script (version selection, swap, regenerate) is source-agnostic.
// Overridable so tests / CI can point the fetch layer at a mock Exchange
// instead of hitting live Anypoint (and needing real credentials).
const ANYPOINT_BASE = process.env.ANYPOINT_BASE_URL ?? 'https://anypoint.mulesoft.com';
const EXCHANGE_API_V1 = `${ANYPOINT_BASE}/exchange/api/v1`;

/** The `exchange.json` descriptor shipped inside every spec folder. */
interface ExchangeMeta {
    main: string;
    assetId: string;
    groupId: string;
    version: string;
    apiVersion: string; // e.g. "v1", "v2"
    classifier: string;
}

/** One SCAPI spec we currently track, joined across redocly.yaml + exchange.json. */
interface TrackedSpec {
    /** redocly.yaml api key, e.g. "shopper-baskets-v2". */
    redoclyKey: string;
    /** `root:` value verbatim from redocly.yaml (relative to openapi-specs/). */
    redoclyRoot: string;
    /** Current spec folder name, e.g. "shopper-baskets-oas-2.3.3". */
    dir: string;
    meta: ExchangeMeta;
}

interface UpdatePlan {
    spec: TrackedSpec;
    /** null when up to date or no matching released version was found. */
    latestVersion: string | null;
    status: SpecStatus;
    /**
     * True when the tracked `exchange.json` version is not clean
     * MAJOR.MINOR.PATCH (e.g. a hand-edited "1.50"). We still treat it as
     * outdated, but flag it loudly: a malformed tracked version silently breaks
     * semver comparison and is exactly the kind of manual typo this automation
     * exists to eliminate — it must not pass unnoticed.
     */
    malformedVersion?: boolean;
}

const argv = process.argv.slice(2);
const args = new Set(argv);
const CHECK_ONLY = args.has('--check');
const EMIT_JSON = args.has('--json');
// `--pr-body <path>` writes a Markdown summary of the applied updates, for use
// as a PR body in CI. Only written in apply mode when something changed.
const PR_BODY_PATH = (() => {
    const i = argv.indexOf('--pr-body');
    return i !== -1 ? argv[i + 1] : null;
})();

/** Human-readable logs go to stderr so `--json` stdout stays parseable. */
function log(message: string): void {
    process.stderr.write(`${message}\n`);
}

function fail(message: string): never {
    log(`\n❌ ${message}`);
    process.exit(1);
}

/**
 * Discover every tracked spec by parsing redocly.yaml for `<key>: { root: ... }`
 * entries and joining each to its folder's exchange.json. redocly.yaml is the
 * authoritative list of specs the client is generated from; exchange.json
 * supplies the Exchange coordinates.
 */
function readTrackedSpecs(): TrackedSpec[] {
    const redocly = fs.readFileSync(REDOCLY_PATH, 'utf-8');
    const lines = redocly.split('\n');

    const specs: TrackedSpec[] = [];
    let currentKey: string | null = null;

    for (const line of lines) {
        // Top-level api key under `apis:` — two-space indent, ends with ':'.
        const keyMatch = line.match(/^ {2}([\w-]+):\s*$/);
        if (keyMatch) {
            currentKey = keyMatch[1];
            continue;
        }
        const rootMatch = line.match(/^ {4}root:\s*(.+?)\s*$/);
        if (rootMatch && currentKey) {
            const redoclyRoot = rootMatch[1];
            // root looks like ./shopper-baskets-oas-2.3.3/shopper-baskets-oas-v2-public.yaml
            const dir = redoclyRoot.replace(/^\.\//, '').split('/')[0];
            const exchangePath = path.join(SPECS_DIR, dir, 'exchange.json');
            if (!fs.existsSync(exchangePath)) {
                fail(`Spec folder "${dir}" (redocly key "${currentKey}") is missing exchange.json.`);
            }
            const meta = JSON.parse(fs.readFileSync(exchangePath, 'utf-8')) as ExchangeMeta;
            specs.push({ redoclyKey: currentKey, redoclyRoot, dir, meta });
            currentKey = null;
        }
    }

    if (specs.length === 0) {
        fail(`No specs discovered in ${REDOCLY_PATH}. Has the redocly.yaml format changed?`);
    }
    return specs;
}

async function getBearerToken(): Promise<string> {
    const username = process.env.ANYPOINT_USERNAME;
    const password = process.env.ANYPOINT_PASSWORD;
    if (!username || !password) {
        fail('ANYPOINT_USERNAME and ANYPOINT_PASSWORD must be set to query Anypoint Exchange.');
    }
    const res = await fetch(`${ANYPOINT_BASE}/accounts/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    if (res.status === 401) {
        fail('Anypoint login failed: invalid username/password.');
    }
    if (!res.ok) {
        fail(`Anypoint login failed: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as { access_token?: string };
    if (!json.access_token) {
        fail('Anypoint login succeeded but no access_token was returned.');
    }
    return json.access_token;
}

async function fetchAsset(token: string, assetPath: string): Promise<RawAsset> {
    const res = await fetch(`${EXCHANGE_API_V1}/assets/${assetPath}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        fail(`Failed to fetch asset "${assetPath}" from Exchange: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as RawAsset;
}

/** Download + extract the fat-oas archive for a specific version into a temp dir. */
async function downloadSpec(token: string, spec: TrackedSpec, version: string): Promise<string> {
    const { groupId, assetId } = spec.meta;
    const asset = await fetchAsset(token, `${groupId}/${assetId}/${version}`);
    const fatOas = asset.files?.find((f) => f.classifier === 'fat-oas');
    if (!fatOas?.externalLink) {
        fail(`Asset ${assetId}/${version} has no downloadable "fat-oas" file.`);
    }

    const res = await fetch(fatOas.externalLink);
    if (!res.ok) {
        fail(`Failed to download ${assetId}/${version}: ${res.status} ${res.statusText}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfnext-scapi-'));
    const zipPath = path.join(tempDir, `${assetId}-${version}.zip`);
    fs.writeFileSync(zipPath, buffer);

    const extractDir = path.join(tempDir, 'extracted');
    fs.mkdirSync(extractDir, { recursive: true });
    try {
        // `unzip` is preinstalled on macOS and the ubuntu CI runners.
        execFileSync('unzip', ['-o', '-q', zipPath, '-d', extractDir], { stdio: 'pipe' });
    } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        fail(`Failed to unzip ${assetId}/${version} (is \`unzip\` installed?): ${detail}`);
    }
    return extractDir;
}

/**
 * Swap the spec folder on disk: drop the new files into
 * `openapi-specs/${assetId}-${version}/`, strip any `*-internal.yaml`, and
 * remove the previous folder. Returns the new folder name.
 */
function swapSpecFolder(spec: TrackedSpec, version: string, extractDir: string): string {
    const newDir = `${spec.meta.assetId}-${version}`;
    const newDirPath = path.join(SPECS_DIR, newDir);

    // The fat-oas zip extracts to a flat set of files (spec yaml + exchange.json),
    // sometimes nested one level. Find the directory that contains exchange.json.
    const sourceDir = findExchangeRoot(extractDir);
    if (!sourceDir) {
        fail(`Downloaded archive for ${spec.meta.assetId}@${version} has no exchange.json.`);
    }

    fs.rmSync(newDirPath, { recursive: true, force: true });
    fs.mkdirSync(newDirPath, { recursive: true });
    // Copy the tree recursively. fat-oas archives are flat today, but a spec
    // can ship a `components/` subfolder of $ref targets (raw OAS structure) —
    // skipping subdirectories (as a file-only loop would) silently drops those
    // and breaks $ref resolution at generation time. raml-toolkit / commerce-sdk
    // likewise preserve the full extracted tree (unzipper / AdmZip).
    copySpecTree(sourceDir, newDirPath);

    if (newDir !== spec.dir) {
        fs.rmSync(path.join(SPECS_DIR, spec.dir), { recursive: true, force: true });
    }
    return newDir;
}

/**
 * Recursively copy the extracted spec tree into `destDir`, preserving
 * subdirectories (e.g. a `components/` folder of $ref targets) and stripping
 * any `*-internal.yaml` at any depth — we never ship internal specs.
 */
function copySpecTree(srcDir: string, destDir: string): void {
    fs.mkdirSync(destDir, { recursive: true });
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        const src = path.join(srcDir, entry.name);
        const dest = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            copySpecTree(src, dest);
        } else if (entry.isFile() && !entry.name.endsWith('-internal.yaml')) {
            fs.copyFileSync(src, dest);
        }
    }
}

/** Find the directory under `root` (≤3 deep) that contains an exchange.json. */
function findExchangeRoot(root: string, depth = 0): string | null {
    if (depth > 3) return null;
    const entries = fs.readdirSync(root, { withFileTypes: true });
    if (entries.some((e) => e.isFile() && e.name === 'exchange.json')) return root;
    for (const entry of entries) {
        if (entry.isDirectory()) {
            const found = findExchangeRoot(path.join(root, entry.name), depth + 1);
            if (found) return found;
        }
    }
    return null;
}

/** Rewrite the `root:` path for one api entry in redocly.yaml. */
function rewriteRedoclyRoot(spec: TrackedSpec, newDir: string): void {
    const newMeta = JSON.parse(
        fs.readFileSync(path.join(SPECS_DIR, newDir, 'exchange.json'), 'utf-8')
    ) as ExchangeMeta;
    const newRoot = `./${newDir}/${newMeta.main}`;
    if (newRoot === spec.redoclyRoot) return;

    const redocly = fs.readFileSync(REDOCLY_PATH, 'utf-8');
    const updated = redocly.replace(`root: ${spec.redoclyRoot}`, `root: ${newRoot}`);
    if (updated === redocly) {
        fail(`Could not rewrite redocly.yaml root for "${spec.redoclyKey}" (expected "${spec.redoclyRoot}").`);
    }
    fs.writeFileSync(REDOCLY_PATH, updated);
}

async function main(): Promise<void> {
    const specs = readTrackedSpecs();
    log(`Discovered ${specs.length} tracked SCAPI specs.\n`);

    const token = await getBearerToken();

    // Fetch each unique asset once, then resolve the target version per entry
    // (a single asset like shopper-baskets-oas backs both v1 and v2).
    const assetCache = new Map<string, RawAsset>();
    const plans: UpdatePlan[] = [];
    for (const spec of specs) {
        const assetKey = `${spec.meta.groupId}/${spec.meta.assetId}`;
        let asset = assetCache.get(assetKey);
        if (!asset) {
            asset = await fetchAsset(token, assetKey);
            assetCache.set(assetKey, asset);
        }
        const latest = latestReleasedVersion(asset, spec.meta.apiVersion);
        const status = resolveStatus(latest, spec.meta.version);
        // Flag a non-semver tracked version so the report/PR calls it out — it's
        // treated as outdated (see resolveStatus) but must not pass unnoticed.
        const malformedVersion = isMalformedVersion(spec.meta.version);
        plans.push({ spec, latestVersion: latest, status, malformedVersion });
    }

    const outdated = plans.filter((p) => p.status === 'outdated');
    const noRelease = plans.filter((p) => p.status === 'no-release-found');

    log('Spec status:');
    for (const p of plans) {
        const key = p.spec.redoclyKey.padEnd(28);
        const current = p.spec.meta.version;
        if (p.status === 'outdated' && p.malformedVersion) {
            log(`  ⚠️  ${key} ${current} → ${p.latestVersion} (tracked version "${current}" is not valid semver — fixing)`);
        } else if (p.status === 'outdated') {
            log(`  ⬆️  ${key} ${current} → ${p.latestVersion}`);
        } else if (p.status === 'no-release-found') {
            log(`  ⚠️  ${key} ${current} (no released version found on Exchange)`);
        } else {
            log(`  ✅ ${key} ${current} (up to date)`);
        }
    }
    log('');

    if (EMIT_JSON) {
        process.stdout.write(
            `${JSON.stringify(
                {
                    outdated: outdated.map((p) => ({
                        key: p.spec.redoclyKey,
                        assetId: p.spec.meta.assetId,
                        apiVersion: p.spec.meta.apiVersion,
                        from: p.spec.meta.version,
                        to: p.latestVersion,
                    })),
                    noRelease: noRelease.map((p) => p.spec.redoclyKey),
                },
                null,
                2
            )}\n`
        );
    }

    if (outdated.length === 0) {
        log('✅ All SCAPI specs are up to date.');
        return;
    }

    if (CHECK_ONLY) {
        log(`Found ${outdated.length} outdated spec(s). Run \`pnpm scapi:update-specs\` to update.`);
        process.exit(1);
    }

    // Two phases so a failure can't leave a half-updated working tree:
    //   1. Download + extract every outdated spec to a temp dir (all the
    //      network work — this is what realistically fails mid-run).
    //   2. Only once all downloads succeed, swap folders on disk and rewrite
    //      redocly.yaml (fast, local, low-risk).
    // If phase 1 throws on spec #3, specs #1–2 were only staged in temp; the
    // tracked openapi-specs/ folders and redocly.yaml are still pristine.
    const staged: Array<{ plan: UpdatePlan; extractDir: string }> = [];
    for (const plan of outdated) {
        const { spec, latestVersion } = plan;
        log(`Downloading ${spec.redoclyKey}: ${spec.meta.version} → ${latestVersion}...`);
        const extractDir = await downloadSpec(token, spec, latestVersion as string);
        staged.push({ plan, extractDir });
    }

    for (const { plan, extractDir } of staged) {
        const { spec, latestVersion } = plan;
        const newDir = swapSpecFolder(spec, latestVersion as string, extractDir);
        rewriteRedoclyRoot(spec, newDir);
    }

    log('\nRegenerating SCAPI client (pnpm scapi:generate)...');
    execFileSync('pnpm', ['scapi:generate'], { cwd: PACKAGE_ROOT, stdio: 'inherit' });

    if (PR_BODY_PATH) {
        fs.writeFileSync(PR_BODY_PATH, renderPrBody(outdated));
        log(`Wrote PR body to ${PR_BODY_PATH}`);
    }

    log(`\n✅ Updated ${outdated.length} spec(s) and regenerated the client.`);
    log('Review the diff under openapi-specs/ and src/scapi-client/generated/, then run `pnpm test`.');
}

/** Render a Markdown PR body summarizing the applied spec bumps. */
function renderPrBody(applied: UpdatePlan[]): string {
    const rows = applied
        .map((p) => `| \`${p.spec.redoclyKey}\` | ${p.spec.meta.version} | **${p.latestVersion}** |`)
        .join('\n');
    return [
        'Automated update of the SCAPI OpenAPI specs and regenerated client.',
        '',
        'Generated by the **SCAPI Spec Update** workflow (`pnpm scapi:update-specs`).',
        '',
        '| API | From | To |',
        '| --- | ---- | -- |',
        rows,
        '',
        '### Review checklist',
        '- Diff `openapi-specs/` to confirm the version bump(s) are expected.',
        '- Diff `src/scapi-client/generated/` for breaking vs. non-breaking changes.',
        '- `pnpm typecheck` and `pnpm test:unit` ran in CI for this branch.',
        '',
        'See `src/scapi-client/README.md` → "Updating to New OpenAPI Specifications".',
        '',
    ].join('\n');
}

main().catch((err: unknown) => {
    const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
    fail(`Unexpected error: ${detail}`);
});
