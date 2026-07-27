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

import path from 'path';
import { glob } from 'glob';
import {
    validateMetaDefinitionFile,
    MetaDefinitionDetectionError,
    type MetaDefinitionValidationResult,
} from '@salesforce/b2c-tooling-sdk/operations/content';

export interface ValidationSummary {
    results: MetaDefinitionValidationResult[];
    totalFiles: number;
    validFiles: number;
    totalErrors: number;
    skippedFiles: string[];
}

/**
 * Validate all Page Designer metadata JSON files in a directory.
 *
 * Globs for `**\/*.json` in `metadataDir`, validates each file against
 * the appropriate metadefinition schema, and returns a summary.
 *
 * Files whose schema type cannot be detected are skipped and reported
 * in `skippedFiles`.
 */
export async function validateCartridgeMetadata(metadataDir: string): Promise<ValidationSummary> {
    const filePaths = await glob('**/*.json', { cwd: metadataDir, absolute: true, nodir: true });

    const results: MetaDefinitionValidationResult[] = [];
    const skippedFiles: string[] = [];

    for (const filePath of filePaths) {
        try {
            const result = validateMetaDefinitionFile(filePath);
            results.push(result);
        } catch (error) {
            if (error instanceof MetaDefinitionDetectionError) {
                skippedFiles.push(path.relative(metadataDir, filePath));
                continue;
            }
            throw error;
        }
    }

    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const validFiles = results.filter((r) => r.valid).length;

    return {
        results,
        totalFiles: results.length,
        validFiles,
        totalErrors,
        skippedFiles,
    };
}
