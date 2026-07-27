#!/usr/bin/env tsx

/**
 * Generate operation maps from OpenAPI TypeScript definitions
 *
 * This script parses generated TypeScript files and extracts the mapping between
 * operation names and their corresponding HTTP methods and path templates.
 *
 * Input: src/scapi-client/generated/*.ts files
 * Output: src/scapi-client/generated/*.operations.ts files
 *
 * Each operation map file exports a const object with this structure:
 * {
 *   operationName: { method: 'GET', path: '/path/template' }
 * }
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GENERATED_DIR = path.join(__dirname, '../src/scapi-client/generated');

/**
 * Operation info shape for extraction (internal use)
 */
interface ExtractedOperationInfo {
  method: string;
  path: string;
}

/**
 * Optimized operation info shape for generation (abbreviated keys)
 * - m: HTTP method
 * - b: Base path
 * - s: Suffix path
 */
interface OptimizedOperationInfo {
  m: string;
  b: string;
  s: string;
}

type OperationMap = Record<string, ExtractedOperationInfo>;
type OptimizedOperationMap = Record<string, OptimizedOperationInfo>;

/**
 * Extract operation mappings from a generated TypeScript file
 *
 * Parses the `paths` interface to find:
 * - Path strings (the object keys)
 * - HTTP methods (object properties like 'get', 'post')
 * - Operation references (values like operations["getCategories"])
 *
 * @param filePath - Path to the generated TypeScript file
 * @returns Object mapping operation names to method and path
 */
function extractOperationMap(filePath: string): OperationMap {
  const content = fs.readFileSync(filePath, 'utf-8');
  const operations: OperationMap = {};

  // Split content into lines for line-by-line processing
  const lines = content.split('\n');

  let currentPath: string | null = null;
  const validMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
  let insidePathsInterface = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track when we enter the paths interface
    if (line.match(/^export interface paths \{/)) {
      insidePathsInterface = true;
      continue;
    }

    // Exit when we leave the paths interface
    if (insidePathsInterface && line.match(/^\}$/)) {
      break;
    }

    if (!insidePathsInterface) {
      continue;
    }

    // Check if this line defines a path (e.g., '    "/organizations/{organizationId}/products": {')
    const pathMatch = line.match(/^\s+"([^"]+)":\s*\{/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }

    // Check if this line defines an operation method
    // Pattern:         get: operations["getProducts"];
    const operationMatch = line.match(/^\s+(\w+):\s*operations\["([^"]+)"\];?/);
    if (operationMatch && currentPath) {
      const [, method, operationName] = operationMatch;

      if (validMethods.includes(method.toLowerCase())) {
        operations[operationName] = {
          method: method.toUpperCase(),
          path: currentPath,
        };
      }
    }

    // Reset currentPath when we exit a path block (closing brace with minimal indentation)
    if (currentPath && line.match(/^\s{4}\};?\s*$/)) {
      currentPath = null;
    }
  }

  return operations;
}

/**
 * Find the longest common prefix for all paths
 *
 * This extracts the base path that's common to all operations in a file,
 * which can then be factored out to reduce bundle size.
 *
 * Strategy:
 * - Find the longest common prefix across all paths
 * - Keep the full common prefix to maximize bundle size savings
 * - Only trim trailing slashes to ensure clean paths
 *
 * Examples:
 * - All paths start with `/organizations/{organizationId}/baskets`
 *   → BASE_PATH = `/organizations/{organizationId}/baskets`
 * - Some operations may have empty suffixes (s: '')
 *
 * @param operations - The operation map
 * @returns The common base path, or empty string if none found
 */
function findCommonBasePath(operations: OperationMap): string {
  const paths = Object.values(operations).map((op) => op.path);

  if (paths.length === 0) {
    return '';
  }

  if (paths.length === 1) {
    // If there's only one path, extract up to the last segment
    const singlePath = paths[0];
    const lastSlashIndex = singlePath.lastIndexOf('/');
    return lastSlashIndex > 0 ? singlePath.substring(0, lastSlashIndex) : '';
  }

  // Find character-by-character common prefix
  let prefix = paths[0];
  for (let i = 1; i < paths.length; i++) {
    const current = paths[i];
    let j = 0;
    while (j < prefix.length && j < current.length && prefix[j] === current[j]) {
      j++;
    }
    prefix = prefix.substring(0, j);

    if (prefix.length === 0) {
      return '';
    }
  }

  // Keep the full common prefix, but trim any trailing slashes
  // This maximizes bundle size savings by extracting the longest possible base path
  const trimmed = prefix.replace(/\/+$/, '');

  // Ensure we have at least one path segment
  if (!trimmed || !trimmed.includes('/')) {
    return '';
  }

  return trimmed;
}

/**
 * Convert an operation map to optimized format with abbreviated keys
 *
 * @param operations - The original operation map
 * @param basePath - The common base path to extract
 * @returns Operation map with abbreviated keys (m, b, s)
 */
function convertToOptimizedOperations(
  operations: OperationMap,
  basePath: string
): OptimizedOperationMap {
  const optimizedOperations: OptimizedOperationMap = {};

  for (const [name, { method, path }] of Object.entries(operations)) {
    const suffix = path.startsWith(basePath) ? path.substring(basePath.length) : path;
    optimizedOperations[name] = {
      m: method, // abbreviated: method
      b: basePath, // abbreviated: base
      s: suffix, // abbreviated: suffix
    };
  }

  return optimizedOperations;
}

/**
 * Generate a TypeScript file with the operation map
 *
 * Creates a .operations.ts file with an exported const object
 * using 'as const' for literal type inference.
 *
 * New format extracts common base paths to reduce bundle size.
 *
 * @param inputFile - Path to the source TypeScript file
 */
function generateOperationFile(inputFile: string): void {
  const operations = extractOperationMap(inputFile);
  const baseName = path.basename(inputFile, '.ts');
  const outputFile = path.join(GENERATED_DIR, `${baseName}.operations.ts`);

  // Count operations for logging
  const operationCount = Object.keys(operations).length;

  if (operationCount === 0) {
    console.warn(`⚠️  No operations found in ${baseName}.ts`);
    return;
  }

  // Find common base path
  const basePath = findCommonBasePath(operations);

  let output: string;

  if (basePath) {
    // Use optimized format with abbreviated keys
    const optimizedOps = convertToOptimizedOperations(operations, basePath);

    // Calculate bundle size savings from base path extraction
    const basePathSavings = basePath.length * operationCount;
    // Additional savings from abbreviated keys: 'method' -> 'm' (5 bytes), 'base' -> 'b' (3 bytes), 'suffix' -> 's' (5 bytes)
    // Total per operation: 13 bytes
    const abbreviationSavings = 13 * operationCount;
    const totalSavings = basePathSavings + abbreviationSavings;

    // Build the operation entries with abbreviated keys
    const entries = Object.entries(optimizedOps)
      .map(([name, { m, b, s }]) => `  ${name}: { m: '${m}' as const, b: BASE_PATH, s: '${s}' }`)
      .join(',\n');

    // Generate the output file content with BASE_PATH constant
    output = `/**
 * Auto-generated operation map for ${baseName}
 *
 * This file maps operation names to their HTTP method and path template.
 * Generated by scripts/generate-operation-maps.ts
 *
 * Optimizations applied:
 * - Base path extraction: Saves ~${basePathSavings} bytes
 * - Abbreviated keys: Saves ~${abbreviationSavings} bytes (m=method, b=base, s=suffix)
 * - Total savings: ~${totalSavings} bytes
 *
 * Property abbreviations:
 * - m: HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)
 * - b: Base path shared across operations
 * - s: Suffix path unique to this operation
 *
 * DO NOT EDIT MANUALLY - Changes will be overwritten on next generation
 */

export const BASE_PATH = '${basePath}' as const;

export const operations = {
${entries}
} as const;
`;

    console.log(
      `✅ Generated ${baseName}.operations.ts (${operationCount} operations, ~${totalSavings}B saved)`,
    );
  } else {
    // No common base path - this shouldn't happen with current specs
    throw new Error(`No common base path found for ${baseName}. This is unexpected.`);
  }

  fs.writeFileSync(outputFile, output, 'utf-8');
}

/**
 * Main execution
 */
function main(): void {
  console.log('🔍 Scanning for generated TypeScript files...\n');

  // Find all generated TypeScript files (excluding .operations.ts files)
  const files = fs
    .readdirSync(GENERATED_DIR)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.operations.ts'))
    .sort();

  if (files.length === 0) {
    console.error('❌ No generated TypeScript files found in', GENERATED_DIR);
    process.exit(1);
  }

  console.log(`Found ${files.length} generated files\n`);

  // Process each file
  let totalOperations = 0;
  for (const file of files) {
    const filePath = path.join(GENERATED_DIR, file);
    try {
      const beforeCount = totalOperations;
      generateOperationFile(filePath);
      // Count operations in this file
      const operations = extractOperationMap(filePath);
      totalOperations += Object.keys(operations).length;
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
      process.exit(1);
    }
  }

  console.log(`\n✨ Done! Generated operation maps for ${files.length} APIs`);
  console.log(`   Total operations: ${totalOperations}`);
}

// Run the script
main();
