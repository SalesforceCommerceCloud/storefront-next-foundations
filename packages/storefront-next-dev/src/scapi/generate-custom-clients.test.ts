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
import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateCustomClientsFile } from './generate-custom-clients';

describe('generateCustomClientsFile', () => {
    const tempDirs: string[] = [];

    afterEach(() => {
        tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
    });

    const createScapiDir = () => {
        const root = mkdtempSync(join(tmpdir(), 'sfnext-scapi-custom-clients-'));
        tempDirs.push(root);
        const scapiDir = join(root, 'src', 'scapi');
        mkdirSync(join(scapiDir, 'schemas'), { recursive: true });
        return scapiDir;
    };

    it('writes the fallback file when there are no custom clients', () => {
        const scapiDir = createScapiDir();

        generateCustomClientsFile(scapiDir);

        const content = readFileSync(join(scapiDir, 'custom-clients.ts'), 'utf-8');
        expect(content).toContain(
            "export { type Clients as AppClients } from '@salesforce/storefront-next-runtime/scapi';"
        );
        expect(content).toContain('export const customClients: never[] = [];');
    });

    it('writes a transparent re-export barrel when no overrides are registered', () => {
        const scapiDir = createScapiDir();

        generateCustomClientsFile(scapiDir);

        const indexContent = readFileSync(join(scapiDir, 'index.ts'), 'utf-8');
        expect(indexContent).toContain("export * from '@salesforce/storefront-next-runtime/scapi';");
        expect(indexContent).toContain("export { customClients, type AppClients } from './custom-clients';");
    });

    it('writes a barrel that substitutes overridden namespaces and emits a namespace wrapper', () => {
        const scapiDir = createScapiDir();
        const schemasDir = join(scapiDir, 'schemas');

        writeFileSync(
            join(schemasDir, 'shopper-products-v1.meta.json'),
            JSON.stringify(
                {
                    clientKey: 'shopperProducts',
                    basePath: '/product/shopper-products/v1',
                    supportsLocale: true,
                    orgPrefix: false,
                    kind: 'override',
                },
                null,
                2
            ),
            'utf-8'
        );

        generateCustomClientsFile(scapiDir);

        const indexContent = readFileSync(join(scapiDir, 'index.ts'), 'utf-8');
        // Wildcard re-exports the entire runtime SCAPI surface so future SDK additions
        // (new types, helpers, etc.) flow through automatically without re-running codegen.
        expect(indexContent).toContain("export * from '@salesforce/storefront-next-runtime/scapi';");
        // The overridden namespace is re-exported explicitly below the wildcard so it
        // shadows the runtime version of ShopperProducts.
        expect(indexContent).toContain(
            "export type { ShopperProducts } from './generated/shopper-products-v1.namespace';"
        );
        // Active-overrides note is in the generated header so reviewers can see which
        // namespaces are shadowed without tracing the file structure.
        expect(indexContent).toContain('Active overrides: ShopperProducts');
        // Custom-clients passthrough still present
        expect(indexContent).toContain("export { customClients, type AppClients } from './custom-clients';");

        // The namespace wrapper exists and matches the runtime namespace shape
        const namespacePath = join(scapiDir, 'generated', 'shopper-products-v1.namespace.ts');
        expect(existsSync(namespacePath)).toBe(true);
        const namespaceContent = readFileSync(namespacePath, 'utf-8');
        expect(namespaceContent).toContain('export namespace ShopperProducts');
        expect(namespaceContent).toContain('export type endpoints = Source.paths;');
        expect(namespaceContent).toContain("export type schemas = Source.components['schemas'];");
        expect(namespaceContent).toContain('export type operations = Source.operations;');
    });

    it('infers override kind from a built-in client key when meta.kind is absent', () => {
        const scapiDir = createScapiDir();
        const schemasDir = join(scapiDir, 'schemas');

        writeFileSync(
            join(schemasDir, 'shopper-baskets-v2.meta.json'),
            JSON.stringify(
                {
                    clientKey: 'shopperBasketsV2',
                    basePath: '/checkout/shopper-baskets/v2',
                    supportsLocale: true,
                    orgPrefix: false,
                },
                null,
                2
            ),
            'utf-8'
        );

        generateCustomClientsFile(scapiDir);

        const indexContent = readFileSync(join(scapiDir, 'index.ts'), 'utf-8');
        expect(indexContent).toContain(
            "export type { ShopperBasketsV2 } from './generated/shopper-baskets-v2.namespace';"
        );
        expect(existsSync(join(scapiDir, 'generated', 'shopper-baskets-v2.namespace.ts'))).toBe(true);
    });

    it('writes imports, merged AppClients type, and registry entries for custom clients', () => {
        const scapiDir = createScapiDir();
        const schemasDir = join(scapiDir, 'schemas');

        writeFileSync(
            join(schemasDir, 'loyalty-v1.meta.json'),
            JSON.stringify(
                {
                    clientKey: 'loyalty',
                    basePath: '/custom/loyalty/v1',
                    supportsLocale: false,
                    orgPrefix: true,
                },
                null,
                2
            ),
            'utf-8'
        );
        writeFileSync(
            join(schemasDir, 'store-inventory-v1.meta.json'),
            JSON.stringify(
                {
                    clientKey: 'storeInventory',
                    basePath: '/custom/store-inventory/v1',
                    supportsLocale: true,
                    orgPrefix: false,
                },
                null,
                2
            ),
            'utf-8'
        );

        generateCustomClientsFile(scapiDir);

        const content = readFileSync(join(scapiDir, 'custom-clients.ts'), 'utf-8');
        expect(content).toContain("import type { paths as P0 } from './generated/loyalty-v1';");
        expect(content).toContain("import { operations as ops1 } from './generated/store-inventory-v1.operations';");
        expect(content).toContain('loyalty: ProxyClient<Client<P0>, typeof ops0>;');
        expect(content).toContain('storeInventory: ProxyClient<Client<P1>, typeof ops1>;');
        expect(content).toContain(
            "{ key: 'loyalty', basePath: '/custom/loyalty/v1', ops: ops0, locale: false, orgPrefix: true },"
        );
        expect(content).toContain(
            "{ key: 'storeInventory', basePath: '/custom/store-inventory/v1', ops: ops1, locale: true, orgPrefix: false },"
        );
    });
});
