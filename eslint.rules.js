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
// Custom no client actions rule
export const noClientActionsRule = {
    meta: {
        type: 'problem',
        docs: {
            description:
                'For security reasons, it is recommended to use server actions instead of client actions in routes.',
            category: 'Best Practices',
        },
        messages: {
            noClientActions:
                'For security reasons, it is recommended to use server actions instead of client actions in routes.',
        },
        schema: [], // no options
    },

    create(context) {
        const name = 'clientAction';

        return {
            ExportNamedDeclaration(node) {
                if (node.declaration) {
                    // Case: export function clientAction() {}
                    if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id?.name === name) {
                        context.report({ node: node.declaration.id, messageId: 'noClientActions' });
                    }

                    // Case: export const clientAction = ...
                    if (node.declaration.type === 'VariableDeclaration') {
                        for (const d of node.declaration.declarations) {
                            if (d.id.name === name) {
                                context.report({ node: d.id, messageId: 'noClientActions' });
                            }
                        }
                    }
                }

                // Case: export { clientAction } / export { foo as clientAction }
                if (node.specifiers) {
                    for (const s of node.specifiers) {
                        if (s.exported && s.exported.type === 'Identifier' && s.exported.name === name) {
                            context.report({ node: s.exported, messageId: 'noClientActions' });
                        }
                    }
                }
            },
        };
    },
};

// Custom no client loaders rule
export const noClientLoadersRule = {
    meta: {
        type: 'problem',
        docs: {
            description:
                'For better perceived performance and security reasons, it is recommended to use use server loaders instead of client loaders in routes.',
            category: 'Best Practices',
        },
        messages: {
            noClientLoaders:
                'For better perceived performance and security reasons, it is recommended to use use server loaders instead of client loaders in routes.',
        },
        schema: [], // no options
    },

    create(context) {
        const name = 'clientLoader';

        return {
            ExportNamedDeclaration(node) {
                if (node.declaration) {
                    // Case: export function clientLoader() {}
                    if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id?.name === name) {
                        context.report({ node: node.declaration.id, messageId: 'noClientLoaders' });
                    }

                    // Case: export const clientLoader = ...
                    if (node.declaration.type === 'VariableDeclaration') {
                        for (const d of node.declaration.declarations) {
                            if (d.id.name === name) {
                                context.report({ node: d.id, messageId: 'noClientLoaders' });
                            }
                        }
                    }
                }

                // Case: export { clientLoader } / export { foo as clientLoader }
                if (node.specifiers) {
                    for (const s of node.specifiers) {
                        if (s.exported && s.exported.type === 'Identifier' && s.exported.name === name) {
                            context.report({ node: s.exported, messageId: 'noClientLoaders' });
                        }
                    }
                }
            },
        };
    },
};

// Custom color linting rule
export const colorLinterRule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow hardcoded Tailwind color utilities',
            category: 'Best Practices',
            recommended: true,
        },
        fixable: null,
        schema: [],
        messages: {
            hardcodedColor: 'Hardcoded color utility "{{className}}" detected. Use themeable Shadcn utilities instead.',
        },
    },
    create(context) {
        return {
            // Only check className attributes and cn() calls, not all strings
            JSXAttribute(node) {
                if (node.name.name === 'className' && node.value) {
                    if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
                        checkForHardcodedColors(node.value.value, context, node.value);
                    } else if (node.value.type === 'JSXExpressionContainer' && node.value.expression) {
                        if (
                            node.value.expression.type === 'Literal' &&
                            typeof node.value.expression.value === 'string'
                        ) {
                            checkForHardcodedColors(node.value.expression.value, context, node.value.expression);
                        }
                    }
                }
            },
            // Check cn() function calls
            CallExpression(node) {
                if (node.callee.name === 'cn' || (node.callee.property && node.callee.property.name === 'cn')) {
                    node.arguments.forEach((arg) => {
                        if (arg.type === 'Literal' && typeof arg.value === 'string') {
                            checkForHardcodedColors(arg.value, context, arg);
                        }
                    });
                }
            },
        };
    },
};

function checkForHardcodedColors(content, context, node) {
    const classes = content.split(/\s+/);
    classes.forEach((className) => {
        if (!className) return;
        if (isHardcodedColor(className)) {
            context.report({
                node,
                messageId: 'hardcodedColor',
                data: { className },
            });
        }
    });
}

function isHardcodedColor(className) {
    const forbiddenPatterns = [
        /^bg-(gray|red|green|blue|yellow|purple|pink|indigo|teal|orange|cyan|slate|zinc|neutral|stone|emerald|amber|lime|rose|violet|fuchsia|sky)-(50|100|200|300|400|500|600|700|800|900|950)$/,
        /^text-(gray|red|green|blue|yellow|purple|pink|indigo|teal|orange|cyan|slate|zinc|neutral|stone|emerald|amber|lime|rose|violet|fuchsia|sky)-(50|100|200|300|400|500|600|700|800|900|950)$/,
        /^border-(gray|red|green|blue|yellow|purple|pink|indigo|teal|orange|cyan|slate|zinc|neutral|stone|emerald|amber|lime|rose|violet|fuchsia|sky)-(50|100|200|300|400|500|600|700|800|900|950)$/,
        /^ring-(gray|red|green|blue|yellow|purple|pink|indigo|teal|orange|cyan|slate|zinc|neutral|stone|emerald|amber|lime|rose|violet|fuchsia|sky)-(50|100|200|300|400|500|600|700|800|900|950)$/,
        /^(bg|text|border|ring|shadow|divide|placeholder|accent|caret|decoration|outline|fill|stroke)-(white|black|transparent|current)$/,
    ];

    const isForbidden = forbiddenPatterns.some((pattern) => pattern.test(className));
    if (!isForbidden) {
        return false;
    }

    const allowedPatterns = [
        /^(bg|text|border|ring|shadow|divide|placeholder|accent|caret|decoration|outline|fill|stroke)-(background|foreground|card|card-foreground|popover|popover-foreground|primary|primary-foreground|secondary|secondary-foreground|muted|muted-foreground|accent|accent-foreground|destructive|destructive-foreground|border|input|ring|chart-1|chart-2|chart-3|chart-4|chart-5|sidebar|sidebar-foreground|sidebar-primary|sidebar-primary-foreground|sidebar-accent|sidebar-accent-foreground|sidebar-border|sidebar-ring|success|success-foreground|info|info-foreground|warning|warning-foreground|separator|separator-foreground|rating|rating-foreground|paypal-gold|venmo-blue|order-status-new|order-status-new-foreground|order-status-warning|order-status-warning-foreground|order-status-completed|order-status-completed-foreground|order-status-cancelled|order-status-cancelled-foreground|order-border|order-pickup|order-pickup-border)$/,
        /^(bg|text|border|ring|shadow|divide|placeholder|accent|caret|decoration|outline|fill|stroke)-\[var\(--[^)]+\)\]$/,
        /^(bg|text|border|ring|shadow|divide|placeholder|accent|caret|decoration|outline|fill|stroke)-\[\$\{[^}]+\}\]$/,
        /^(bg|text|border|ring|shadow|divide|placeholder|accent|caret|decoration|outline|fill|stroke)-\[--[^\]]+\]$/,
        // Valid CSS keywords - these should always be allowed
        /^(bg|text|border|ring|shadow|divide|placeholder|accent|caret|decoration|outline|fill|stroke)-(transparent|current)$/,
    ];

    const isAllowed = allowedPatterns.some((pattern) => pattern.test(className));
    return !isAllowed;
}
