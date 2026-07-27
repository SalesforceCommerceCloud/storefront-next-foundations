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
import chalk from 'chalk';
import { type FlatEntry } from '../../utils/objects.js';

/**
 * Converts a PUBLIC__-prefixed env key to dot-notation config path.
 * Example: PUBLIC__app__commerce__api__clientId → app.commerce.api.clientId
 */
export function envKeyToConfigPath(envKey: string): string {
    return envKey.replace(/^PUBLIC__/, '').replace(/__/g, '.');
}

/**
 * Converts a dot-notation config path to a PUBLIC__-prefixed env key.
 * Example: app.commerce.api.clientId → PUBLIC__app__commerce__api__clientId
 */
export function configPathToEnvKey(configPath: string): string {
    return `PUBLIC__${configPath.replace(/\./g, '__')}`;
}

/**
 * Determines the source of each flattened config path.
 * Returns ".env" when there is a corresponding PUBLIC__-prefixed key in envKeys;
 * returns "config" otherwise.
 *
 * @param flattenedKeys - Array of dot-notation config paths
 * @param envKeys - Set of PUBLIC__-prefixed keys found in .env
 */
export function getValueSources(flattenedKeys: string[], envKeys: Set<string>): Map<string, string> {
    const sources = new Map<string, string>();
    for (const configPath of flattenedKeys) {
        sources.set(configPath, envKeys.has(configPathToEnvKey(configPath)) ? '.env' : 'config');
    }
    return sources;
}

export interface FormatInspectOutputOpts {
    flatConfig: FlatEntry[];
    sources: Map<string, string>;
    localVars: Map<string, string>;
    mrtVars: Map<string, string> | null;
}

/**
 * Formats the full inspection output as a string.
 */
export function formatInspectOutput({ flatConfig, sources, localVars, mrtVars }: FormatInspectOutputOpts): string {
    const lines: string[] = [];
    const maxKeyLen = (keys: string[]): number => keys.reduce((max, k) => Math.max(max, k.length), 0);

    const envOverrides = flatConfig
        .filter((e) => sources.get(e.key) === '.env')
        .sort((a, b) => a.key.localeCompare(b.key));

    const totalCount = flatConfig.length;
    if (totalCount > 0) {
        lines.push(`  Config:  config.server.ts (${totalCount} values, ${envOverrides.length} overridden by .env)`);
    } else {
        lines.push(chalk.dim('  (no config loaded)'));
    }
    lines.push('');

    lines.push(chalk.bold('=== .env Overrides ==='));
    lines.push(chalk.dim('  Config paths overridden by PUBLIC__ env vars in .env.'));
    lines.push('');
    if (envOverrides.length === 0) {
        lines.push(chalk.dim('  (no .env overrides)'));
    } else {
        const padLen = maxKeyLen(envOverrides.map((e) => e.key));
        for (const { key, value } of envOverrides) {
            const isLocalOnly = mrtVars !== null && !mrtVars.has(configPathToEnvKey(key));
            const tag = isLocalOnly ? `  ${chalk.yellow('[local only]')}` : '';
            lines.push(`  ${key.padEnd(padLen)} = ${JSON.stringify(value)}${tag}`);
        }
    }
    lines.push('');

    if (mrtVars !== null) {
        lines.push(chalk.bold('=== MRT Overrides ==='));
        lines.push(chalk.dim('  Config paths overridden by PUBLIC__ env vars in MRT. Values are masked by MRT.'));
        lines.push('');
        const mrtPublicEntries = [...mrtVars.entries()]
            .filter(([key]) => key.startsWith('PUBLIC__'))
            .map(([key, value]): [string, string, string] => [key, value, envKeyToConfigPath(key)])
            .sort(([, , configPath1], [, , configPath2]) => configPath1.localeCompare(configPath2));
        if (mrtPublicEntries.length === 0) {
            lines.push(chalk.dim('  (no MRT config overrides)'));
        } else {
            const padLen = maxKeyLen(mrtPublicEntries.map(([, , configPath]) => configPath));
            for (const [key, value, configPath] of mrtPublicEntries) {
                const isMrtOnly = !localVars.has(key);
                const tag = isMrtOnly ? `  ${chalk.cyan('[MRT only]')}` : '';
                lines.push(`  ${configPath.padEnd(padLen)} = ${value}${tag}`);
            }
        }
        lines.push('');
    }

    return lines.join('\n');
}
