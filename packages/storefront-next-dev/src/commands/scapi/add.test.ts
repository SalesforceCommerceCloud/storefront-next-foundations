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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Add from './add';
import { createScapiSchemasClient, toOrganizationId } from '@salesforce/b2c-tooling-sdk/clients';
import { generateFromSchema } from '../../scapi/generate-types';
import { deriveBasePath, writeSchemaMetadata } from '../../scapi/schema-utils';
import { generateCustomClientsFile } from '../../scapi/generate-custom-clients';

vi.mock('../../scapi/generate-types', () => ({
    generateFromSchema: vi.fn(),
}));

vi.mock('../../scapi/generate-custom-clients', () => ({
    generateCustomClientsFile: vi.fn(),
}));

vi.mock('@salesforce/b2c-tooling-sdk/clients', () => ({
    createScapiSchemasClient: vi.fn(),
    toOrganizationId: vi.fn(),
}));

vi.mock('../../scapi/schema-utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../scapi/schema-utils')>();
    return {
        ...actual,
        deriveBasePath: vi.fn(),
        writeSchemaMetadata: vi.fn(),
    };
});

describe('scapi add command', () => {
    const tempDirs: string[] = [];
    const mockGenerateFromSchema = vi.mocked(generateFromSchema);
    const mockDeriveBasePath = vi.mocked(deriveBasePath);
    const mockWriteSchemaMetadata = vi.mocked(writeSchemaMetadata);
    const mockGenerateCustomClientsFile = vi.mocked(generateCustomClientsFile);
    const mockCreateScapiSchemasClient = vi.mocked(createScapiSchemasClient);
    const mockToOrganizationId = vi.mocked(toOrganizationId);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
    });

    const createProjectDir = () => {
        const projectDir = mkdtempSync(join(tmpdir(), 'sfnext-scapi-add-'));
        tempDirs.push(projectDir);
        return projectDir;
    };

    it('copies a local schema, writes metadata, and generates client files', async () => {
        const projectDir = createProjectDir();
        const localSchemaDir = join(projectDir, 'local-schemas');
        const localSchemaPath = join(localSchemaDir, 'loyalty-api.yaml');
        const generatedDir = join(projectDir, 'src', 'scapi', 'generated');
        const copiedSchemaPath = join(projectDir, 'src', 'scapi', 'schemas', 'loyalty-api.yaml');

        mkdirSync(localSchemaDir, { recursive: true });
        writeFileSync(localSchemaPath, 'openapi: 3.0.0\nservers:\n  - url: /custom/loyalty/v1\n', 'utf-8');

        mockDeriveBasePath.mockReturnValue('/custom/loyalty/v1');
        mockGenerateFromSchema.mockResolvedValue({
            typesFile: join(generatedDir, 'loyalty-api.ts'),
            operationsFile: join(generatedDir, 'loyalty-api.operations.ts'),
        });

        const cmd = new Add([], {} as never);
        vi.spyOn(cmd, 'log').mockImplementation(() => {});
        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                schema: './local-schemas/loyalty-api.yaml',
                name: 'loyalty',
                'project-directory': projectDir,
                'base-path': undefined,
                'supports-locale': true,
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(existsSync(copiedSchemaPath)).toBe(true);
        expect(readFileSync(copiedSchemaPath, 'utf-8')).toBe(readFileSync(localSchemaPath, 'utf-8'));
        expect(mockDeriveBasePath).toHaveBeenCalledWith(copiedSchemaPath);
        expect(mockWriteSchemaMetadata).toHaveBeenCalledWith(
            join(projectDir, 'src', 'scapi', 'schemas'),
            'loyalty-api',
            {
                clientKey: 'loyalty',
                basePath: '/custom/loyalty/v1',
                supportsLocale: true,
                orgPrefix: true,
                kind: 'custom',
            }
        );
        expect(mockGenerateFromSchema).toHaveBeenCalledWith(copiedSchemaPath, generatedDir, 'loyalty-api');
        expect(mockGenerateCustomClientsFile).toHaveBeenCalledWith(join(projectDir, 'src', 'scapi'));
    });

    it('records kind=override when the resolved client key matches a built-in client', async () => {
        const projectDir = createProjectDir();
        const localSchemaDir = join(projectDir, 'local-schemas');
        const localSchemaPath = join(localSchemaDir, 'shopper-products-v1.yaml');
        const generatedDir = join(projectDir, 'src', 'scapi', 'generated');
        const copiedSchemaPath = join(projectDir, 'src', 'scapi', 'schemas', 'shopper-products-v1.yaml');

        mkdirSync(localSchemaDir, { recursive: true });
        writeFileSync(localSchemaPath, 'openapi: 3.0.0\nservers:\n  - url: /product/shopper-products/v1\n', 'utf-8');

        mockDeriveBasePath.mockReturnValue('/product/shopper-products/v1');
        mockGenerateFromSchema.mockResolvedValue({
            typesFile: join(generatedDir, 'shopper-products-v1.ts'),
            operationsFile: join(generatedDir, 'shopper-products-v1.operations.ts'),
        });

        const cmd = new Add([], {} as never);
        const logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});
        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                schema: './local-schemas/shopper-products-v1.yaml',
                name: 'shopperProducts',
                'project-directory': projectDir,
                'base-path': undefined,
                'supports-locale': true,
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(mockWriteSchemaMetadata).toHaveBeenCalledWith(
            join(projectDir, 'src', 'scapi', 'schemas'),
            'shopper-products-v1',
            expect.objectContaining({
                clientKey: 'shopperProducts',
                kind: 'override',
            })
        );

        const logCalls = logSpy.mock.calls.map((call) => String(call[0]));
        expect(
            logCalls.some((line) => line.includes('Registering override for built-in client: shopperProducts'))
        ).toBe(true);
        expect(logCalls.some((line) => line.includes('Override for "shopperProducts" is ready'))).toBe(true);
        expect(copiedSchemaPath).toBeDefined();
    });

    it('inherits SDK defaults for an override when --supports-locale is not passed', async () => {
        const projectDir = createProjectDir();
        const localSchemaDir = join(projectDir, 'local-schemas');
        const localSchemaPath = join(localSchemaDir, 'shopper-products-v1.yaml');
        const generatedDir = join(projectDir, 'src', 'scapi', 'generated');

        mkdirSync(localSchemaDir, { recursive: true });
        writeFileSync(localSchemaPath, 'openapi: 3.0.0\nservers:\n  - url: /product/shopper-products/v1\n', 'utf-8');

        mockDeriveBasePath.mockReturnValue('/product/shopper-products/v1');
        mockGenerateFromSchema.mockResolvedValue({
            typesFile: join(generatedDir, 'shopper-products-v1.ts'),
            operationsFile: join(generatedDir, 'shopper-products-v1.operations.ts'),
        });

        const cmd = new Add([], {} as never);
        vi.spyOn(cmd, 'log').mockImplementation(() => {});
        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                schema: './local-schemas/shopper-products-v1.yaml',
                name: 'shopperProducts',
                'project-directory': projectDir,
                'base-path': undefined,
                'supports-locale': undefined,
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        // shopperProducts is locale-aware in the SDK — the override must inherit that.
        expect(mockWriteSchemaMetadata).toHaveBeenCalledWith(
            join(projectDir, 'src', 'scapi', 'schemas'),
            'shopper-products-v1',
            expect.objectContaining({
                clientKey: 'shopperProducts',
                supportsLocale: true,
                orgPrefix: false,
                kind: 'override',
            })
        );
    });

    it('inherits non-locale-aware default when overriding a non-locale-aware built-in', async () => {
        const projectDir = createProjectDir();
        const localSchemaDir = join(projectDir, 'local-schemas');
        const localSchemaPath = join(localSchemaDir, 'shopper-login-v1.yaml');
        const generatedDir = join(projectDir, 'src', 'scapi', 'generated');

        mkdirSync(localSchemaDir, { recursive: true });
        writeFileSync(localSchemaPath, 'openapi: 3.0.0\nservers:\n  - url: /shopper/auth/v1\n', 'utf-8');

        mockDeriveBasePath.mockReturnValue('/shopper/auth/v1');
        mockGenerateFromSchema.mockResolvedValue({
            typesFile: join(generatedDir, 'shopper-login-v1.ts'),
            operationsFile: join(generatedDir, 'shopper-login-v1.operations.ts'),
        });

        const cmd = new Add([], {} as never);
        vi.spyOn(cmd, 'log').mockImplementation(() => {});
        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                schema: './local-schemas/shopper-login-v1.yaml',
                name: 'shopperLogin',
                'project-directory': projectDir,
                'base-path': undefined,
                'supports-locale': undefined,
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        // shopperLogin does not use locale in the SDK — default must reflect that.
        expect(mockWriteSchemaMetadata).toHaveBeenCalledWith(
            join(projectDir, 'src', 'scapi', 'schemas'),
            'shopper-login-v1',
            expect.objectContaining({
                clientKey: 'shopperLogin',
                supportsLocale: false,
                kind: 'override',
            })
        );
    });

    it('requires --name when adding from a local schema file', async () => {
        const projectDir = createProjectDir();
        const localSchemaDir = join(projectDir, 'local-schemas');
        const localSchemaPath = join(localSchemaDir, 'loyalty-api.yaml');

        mkdirSync(localSchemaDir, { recursive: true });
        writeFileSync(localSchemaPath, 'openapi: 3.0.0\n', 'utf-8');

        const cmd = new Add([], {} as never);
        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                schema: './local-schemas/loyalty-api.yaml',
                name: undefined,
                'project-directory': projectDir,
                'base-path': undefined,
                'supports-locale': false,
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });
        vi.spyOn(cmd as any, 'error').mockImplementation((...args: unknown[]) => {
            throw new Error(String(args[0]));
        });

        await expect(cmd.run()).rejects.toThrow('--name is required when using --schema (e.g., --name loyalty)');
    });

    it('errors when a local schema file does not exist', async () => {
        const projectDir = createProjectDir();
        const cmd = new Add([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                schema: './local-schemas/missing.yaml',
                name: 'loyalty',
                'project-directory': projectDir,
                'base-path': undefined,
                'supports-locale': false,
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });
        vi.spyOn(cmd as any, 'error').mockImplementation((...args: unknown[]) => {
            throw new Error(String(args[0]));
        });

        await expect(cmd.run()).rejects.toThrow(
            `Schema file not found: ${join(projectDir, 'local-schemas', 'missing.yaml')}`
        );
    });

    it('requires api coordinates when pulling a schema from SCAPI', async () => {
        const projectDir = createProjectDir();
        const cmd = new Add([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                schema: undefined,
                name: undefined,
                'project-directory': projectDir,
                'base-path': undefined,
                'supports-locale': false,
                'expand-custom-properties': true,
            },
            args: {
                apiFamily: 'custom',
                apiName: undefined,
                apiVersion: 'v1',
            },
            argv: [],
            raw: [],
            metadata: {},
        });
        vi.spyOn(cmd as any, 'error').mockImplementation((...args: unknown[]) => {
            throw new Error(String(args[0]));
        });

        await expect(cmd.run()).rejects.toThrow(
            'Provide either --schema for a local file, or <apiFamily> <apiName> <apiVersion> to pull from the API.'
        );
    });

    it('requires a short code when pulling a schema from SCAPI', async () => {
        const projectDir = createProjectDir();
        const cmd = new Add([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                schema: undefined,
                name: undefined,
                'project-directory': projectDir,
                'base-path': undefined,
                'supports-locale': false,
                'expand-custom-properties': true,
            },
            args: {
                apiFamily: 'custom',
                apiName: 'loyalty',
                apiVersion: 'v1',
            },
            argv: [],
            raw: [],
            metadata: {},
        });
        (cmd as any).resolvedConfig = {
            values: {
                shortCode: undefined,
                tenantId: 'f_ecom_zzpq',
            },
        };
        vi.spyOn(cmd as any, 'error').mockImplementation((...args: unknown[]) => {
            throw new Error(String(args[0]));
        });

        await expect(cmd.run()).rejects.toThrow(
            'SCAPI short code required. Provide --short-code, set SFCC_SHORTCODE, or configure short-code in dw.json.'
        );
    });

    it('pulls a schema from SCAPI and falls back to coordinates when base path cannot be derived', async () => {
        const projectDir = createProjectDir();
        const generatedDir = join(projectDir, 'src', 'scapi', 'generated');
        const schemaPath = join(projectDir, 'src', 'scapi', 'schemas', 'loyalty-v1.yaml');
        const getSchema = vi.fn().mockResolvedValue({
            data: {
                openapi: '3.0.0',
                servers: [{ url: '/' }],
            },
            error: undefined,
            response: {
                status: 200,
                statusText: 'OK',
            },
        });

        mockToOrganizationId.mockReturnValue('f_ecom_zzpq_013');
        mockCreateScapiSchemasClient.mockReturnValue({
            GET: getSchema,
        } as never);
        mockDeriveBasePath.mockReturnValue(undefined);
        mockGenerateFromSchema.mockResolvedValue({
            typesFile: join(generatedDir, 'loyalty-v1.ts'),
            operationsFile: join(generatedDir, 'loyalty-v1.operations.ts'),
        });

        const cmd = new Add([], {} as never);
        const logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});
        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                schema: undefined,
                name: undefined,
                'project-directory': projectDir,
                'base-path': undefined,
                'supports-locale': undefined,
                'expand-custom-properties': true,
            },
            args: {
                apiFamily: 'custom',
                apiName: 'loyalty',
                apiVersion: 'v1',
            },
            argv: [],
            raw: [],
            metadata: {},
        });
        // OAuthCommand normally sets this up before command execution.
        (cmd as any).resolvedConfig = {
            values: {
                shortCode: 'kv7kzm78',
                tenantId: 'f_ecom_zzpq',
            },
        };
        vi.spyOn(cmd as any, 'getOAuthStrategy').mockReturnValue({} as never);

        await cmd.run();

        expect(mockToOrganizationId).toHaveBeenCalledWith('f_ecom_zzpq');
        expect(mockCreateScapiSchemasClient).toHaveBeenCalledWith(
            { shortCode: 'kv7kzm78', tenantId: 'f_ecom_zzpq' },
            {}
        );
        expect(getSchema).toHaveBeenCalledWith(
            '/organizations/{organizationId}/schemas/{apiFamily}/{apiName}/{apiVersion}',
            {
                params: {
                    path: {
                        organizationId: 'f_ecom_zzpq_013',
                        apiFamily: 'custom',
                        apiName: 'loyalty',
                        apiVersion: 'v1',
                    },
                    query: { expand: 'custom_properties' },
                },
            }
        );
        expect(existsSync(schemaPath)).toBe(true);
        expect(mockWriteSchemaMetadata).toHaveBeenCalledWith(
            join(projectDir, 'src', 'scapi', 'schemas'),
            'loyalty-v1',
            {
                clientKey: 'loyalty',
                basePath: '/custom/loyalty/v1',
                supportsLocale: false,
                orgPrefix: true,
                kind: 'custom',
            }
        );
        expect(mockGenerateFromSchema).toHaveBeenCalledWith(schemaPath, generatedDir, 'loyalty-v1');
        expect(logSpy).toHaveBeenCalledWith('Constructed base path from API coordinates: /custom/loyalty/v1');
    });

    it('surfaces SCAPI schema fetch failures', async () => {
        const projectDir = createProjectDir();
        const getSchema = vi.fn().mockResolvedValue({
            data: undefined,
            error: { message: 'No schema' },
            response: {
                status: 404,
                statusText: 'Not Found',
            },
        });

        mockToOrganizationId.mockReturnValue('f_ecom_zzpq_013');
        mockCreateScapiSchemasClient.mockReturnValue({
            GET: getSchema,
        } as never);

        const cmd = new Add([], {} as never);
        vi.spyOn(cmd, 'log').mockImplementation(() => {});
        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                schema: undefined,
                name: undefined,
                'project-directory': projectDir,
                'base-path': undefined,
                'supports-locale': false,
                'expand-custom-properties': false,
            },
            args: {
                apiFamily: 'custom',
                apiName: 'loyalty',
                apiVersion: 'v1',
            },
            argv: [],
            raw: [],
            metadata: {},
        });
        (cmd as any).resolvedConfig = {
            values: {
                shortCode: 'kv7kzm78',
                tenantId: 'f_ecom_zzpq',
            },
        };
        vi.spyOn(cmd as any, 'getOAuthStrategy').mockReturnValue({} as never);
        vi.spyOn(cmd as any, 'error').mockImplementation((...args: unknown[]) => {
            throw new Error(String(args[0]));
        });

        await expect(cmd.run()).rejects.toThrow('Failed to fetch schema: 404 Not Found');
    });
});
