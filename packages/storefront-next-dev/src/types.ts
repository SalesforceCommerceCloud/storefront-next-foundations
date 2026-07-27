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
export type DependencyRecord = Record<string, string>;
export type SSRParameters = Record<string, unknown>;
export type FilePatterns = string[];

// Encoding type for bundle data
export type BundleEncoding = 'base64';

// Bundle configuration (internal format - camelCase)
export interface BundleConfig {
    ssrParameters?: SSRParameters;
    ssrOnly?: FilePatterns;
    ssrShared?: FilePatterns;
}

export interface BundleMetadata {
    dependencies: DependencyRecord;
    [key: string]: unknown;
}

// Bundle format (API format - snake_case to match external API)
export interface Bundle {
    message: string;
    encoding: BundleEncoding;
    data: string;
    ssr_parameters: SSRParameters;
    ssr_only: FilePatterns;
    ssr_shared: FilePatterns;
    bundle_metadata: BundleMetadata;
}

export interface ProjectPackage {
    name?: string;
    dependencies?: DependencyRecord;
    devDependencies?: DependencyRecord;
    ccExtensibility?: {
        overridesDir?: string;
        extends?: string;
    };
    mobify?: BundleConfig;
}

interface DependencyNode {
    version?: string;
    dependencies?: Record<string, DependencyNode>;
}

export interface DependencyTree {
    dependencies?: Record<string, DependencyNode>;
}

/**
 * Managed Runtime SSR Configuration
 * Defines which files are server-only vs shared between server and client
 */
export interface MrtSsrConfig {
    /** Files that should only be deployed to SSR functions (server-side only) */
    ssrOnly: string[];
    /** Files that should be shared between SSR and client (static assets, client bundles) */
    ssrShared: string[];
    /** SSR function parameters (e.g., Node.js version) */
    ssrParameters: {
        ssrFunctionNodeVersion: string;
        [key: string]: string | number | boolean;
    };
}
