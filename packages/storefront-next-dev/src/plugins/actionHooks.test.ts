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
import { describe, it, expect } from 'vitest';
import { generateActionHooksModule } from './actionHooks';
import type { ActionHookRegistry } from '../extensibility/target-utils';

describe('generateActionHooksModule', () => {
    it('should generate an empty registry when no hooks are registered', () => {
        const result = generateActionHooksModule({});

        expect(result).toContain('const hookRegistry = {');
        expect(result).toContain('export async function runHook');
    });

    it('should generate imports and registry entries for registered hooks', () => {
        const registry: ActionHookRegistry = {
            'sfcc.checkout.shipping.afterMethodsFetch': [
                {
                    hookId: 'sfcc.checkout.shipping.afterMethodsFetch',
                    path: 'extensions/shipping-enrichment/hooks/enrich-shipping.server.ts',
                    namespace: 'ShippingEnrichment',
                    handlerName: 'ShippingEnrichment_EnrichShippingServer',
                    order: 0,
                },
            ],
            'sfcc.checkout.fraud.afterSubmitContactInfo': [
                {
                    hookId: 'sfcc.checkout.fraud.afterSubmitContactInfo',
                    path: 'extensions/fraud-detection/hooks/email-check.server.ts',
                    namespace: 'FraudDetection',
                    handlerName: 'FraudDetection_EmailCheckServer',
                    order: 0,
                },
                {
                    hookId: 'sfcc.checkout.fraud.afterSubmitContactInfo',
                    path: 'extensions/risk-scoring/hooks/risk-score.server.ts',
                    namespace: 'RiskScoring',
                    handlerName: 'RiskScoring_RiskScoreServer',
                    order: 1,
                },
            ],
        };

        const result = generateActionHooksModule(registry);

        expect(result).toContain(
            "import ShippingEnrichment_EnrichShippingServer from '@/extensions/shipping-enrichment/hooks/enrich-shipping.server';"
        );
        expect(result).toContain(
            "import FraudDetection_EmailCheckServer from '@/extensions/fraud-detection/hooks/email-check.server';"
        );
        expect(result).toContain(
            "import RiskScoring_RiskScoreServer from '@/extensions/risk-scoring/hooks/risk-score.server';"
        );
        expect(result).toContain(
            "'sfcc.checkout.shipping.afterMethodsFetch': [ShippingEnrichment_EnrichShippingServer]"
        );
        expect(result).toContain(
            "'sfcc.checkout.fraud.afterSubmitContactInfo': [FraudDetection_EmailCheckServer, RiskScoring_RiskScoreServer]"
        );
    });

    it('should generate a runHook function that passes context through handlers in waterfall', () => {
        const result = generateActionHooksModule({
            'test.hook': [
                {
                    hookId: 'test.hook',
                    path: 'extensions/test/hooks/handler.server.ts',
                    namespace: 'Test',
                    handlerName: 'Test_HandlerServer',
                    order: 0,
                },
            ],
        });

        expect(result).toContain('export async function runHook(hookId, context, options = {})');
        expect(result).toContain('const handlers = hookRegistry[hookId]');
        expect(result).toContain('if (!handlers || handlers.length === 0)');
        expect(result).toContain('return context;');
        expect(result).toContain('let currentContext = context;');
        expect(result).toContain('for (const handler of handlers)');
        expect(result).toContain('withTimeout(handler(currentContext), HANDLER_TIMEOUT_MS');
        expect(result).toContain('currentContext = result ?? currentContext;');
        expect(result).toContain("error.name === 'ActionHookError'");
        expect(result).toContain('if (options.blocking)');
        expect(result).toContain('return currentContext;');
    });

    it('should strip file extensions from import paths', () => {
        const registry: ActionHookRegistry = {
            'test.hook': [
                {
                    hookId: 'test.hook',
                    path: 'extensions/test/hooks/handler.server.tsx',
                    namespace: 'Test',
                    handlerName: 'Test_HandlerServer',
                    order: 0,
                },
            ],
        };

        const result = generateActionHooksModule(registry);

        expect(result).toContain("from '@/extensions/test/hooks/handler.server';");
        expect(result).not.toContain('.tsx');
    });
});
