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
 * Generate TypeScript types from an OpenAPI schema using openapi-typescript,
 * then generate the operation map from the resulting types.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateOperationFile } from './generate-operation-map';

/**
 * Generate TypeScript types and operation map from an OpenAPI schema file.
 *
 * @param schemaPath - Absolute path to the OAS YAML/JSON schema
 * @param outputDir - Directory where generated files will be written
 * @param baseName - Base name for the generated files (e.g., "shopper-products-v1")
 * @returns Object with paths to the generated types and operations files
 */
export async function generateFromSchema(
    schemaPath: string,
    outputDir: string,
    baseName: string
): Promise<{ typesFile: string; operationsFile: string }> {
    // Dynamically import openapi-typescript (it's ESM-only)
    const openapiTS = await import('openapi-typescript');

    const schemaUrl = new URL(`file://${schemaPath}`);

    // Generate TypeScript AST nodes, then convert to string
    const ast = await openapiTS.default(schemaUrl);
    const output = openapiTS.astToString(ast);

    // Ensure output directory exists
    mkdirSync(outputDir, { recursive: true });

    const typesFile = join(outputDir, `${baseName}.ts`);
    writeFileSync(typesFile, output, 'utf-8');

    // Generate operation map from the types
    const operationsFile = generateOperationFile(typesFile);

    return { typesFile, operationsFile };
}
