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
import type { Plugin, ResolvedConfig } from 'vite';
import { buildTargetRegistry, type ActionHookRegistry } from '../extensibility/target-utils';
import path from 'path';

const ACTION_HOOKS_VIRTUAL_ID = 'virtual:action-hooks';
const ACTION_HOOKS_RESOLVED_ID = `\0${ACTION_HOOKS_VIRTUAL_ID}`;

/**
 * Generate the virtual module code for the action hook registry.
 *
 * The generated module exports a `hookRegistry` map of hookId → handler[],
 * and a `runHook` function that executes registered handlers in order.
 */
export function generateActionHooksModule(actionHookRegistry: ActionHookRegistry): string {
    const imports: string[] = [];
    const registryEntries: string[] = [];

    for (const [hookId, handlers] of Object.entries(actionHookRegistry)) {
        const handlerNames: string[] = [];
        for (const handler of handlers) {
            const importPath = `@/${handler.path.replace(/\.(ts|tsx|js|jsx)$/, '')}`;
            imports.push(`import ${handler.handlerName} from '${importPath}';`);
            handlerNames.push(handler.handlerName);
        }
        registryEntries.push(`  '${hookId}': [${handlerNames.join(', ')}]`);
    }

    return `${imports.join('\n')}

const HANDLER_TIMEOUT_MS = 5000;

const hookRegistry = {
${registryEntries.join(',\n')}
};

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(\`Action hook handler timed out after \${ms}ms: \${label}\`)), ms)
    ),
  ]);
}

export async function runHook(hookId, context, options = {}) {
  const handlers = hookRegistry[hookId];
  if (!handlers || handlers.length === 0) {
    return context;
  }
  let currentContext = context;
  for (const handler of handlers) {
    try {
      const result = await withTimeout(handler(currentContext), HANDLER_TIMEOUT_MS, hookId);
      currentContext = result ?? currentContext;
    } catch (error) {
      if (error && error.name === 'ActionHookError') {
        throw error;
      }
      if (options.blocking) {
        throw error;
      }
      console.error(\`[action-hooks] handler for "\${hookId}" failed, skipping to next handler\`, error);
    }
  }
  return currentContext;
}
`;
}

/**
 * Vite plugin that resolves `virtual:action-hooks` to a generated module
 * mapping hookIds to their registered handlers.
 */
export function actionHooksPlugin(): Plugin {
    let actionHookRegistry: ActionHookRegistry;
    let sourceDir: string;
    let isProduction = false;

    return {
        name: 'storefront-next:action-hooks',
        enforce: 'pre' as const,
        configResolved(config: ResolvedConfig) {
            sourceDir =
                config.resolve.alias.find((alias) => alias.find === '@')?.replacement ||
                path.resolve(__dirname, './src');
            isProduction = config.mode === 'production';
        },
        buildStart() {
            const registry = buildTargetRegistry(sourceDir, { isProduction });
            actionHookRegistry = registry.actionHookRegistry;
        },
        resolveId(id: string) {
            if (id === ACTION_HOOKS_VIRTUAL_ID) {
                return ACTION_HOOKS_RESOLVED_ID;
            }
        },
        load(id: string) {
            if (id === ACTION_HOOKS_RESOLVED_ID) {
                return generateActionHooksModule(actionHookRegistry);
            }
        },
    };
}
