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
import type { ComponentDataBinding, DataBindingRequirement, QualifierContext, ResolvedDataBinding } from '../types';
import type { ShopperExperience } from '@/scapi-client/types';

/**
 * Pattern matching bare expressions: `type.field`.
 */
const BARE_EXPRESSION_PATTERN = /^(\w+)\.(\w+)$/;

/**
 * Coerces a string value returned by the data binding API into a boolean or
 * number when the contents represent one. The data provider returns every
 * field as a string, so callers expecting typed values would otherwise receive
 * `"true"` instead of `true` or `"2026"` instead of `2026`.
 *
 * Non-string inputs are returned as-is. Strings that are neither booleans nor
 * finite numbers are returned unchanged.
 */
export function parseFieldValue(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value.trim() === '') return value;
    const num = Number(value);
    if (Number.isFinite(num)) return num;
    return value;
}

/**
 * Parses a binding expression string into its provider type and field name.
 * Supports the bare `type.field` format.
 *
 * @param expression - The expression string to parse.
 * @returns The parsed type and field, or `null` if the expression is invalid.
 *
 * @example
 * ```ts
 * parseExpression('content_asset.title');  // { type: 'content_asset', field: 'title' }
 * parseExpression('invalid');              // null
 * ```
 */
export function parseExpression(expression: string): { type: string; field: string } | null {
    const match = expression.trim().match(BARE_EXPRESSION_PATTERN);
    if (match) {
        return { type: match[1], field: match[2] };
    }

    return null;
}

/**
 * Resolves a single binding expression against the component's data contexts
 * and the resolved data bindings from context resolution.
 *
 * Returns the resolved field value, or an empty string if the expression is
 * invalid, the matching context or record is not found, or the field does not
 * exist on the resolved record.
 *
 * @param expression - The expression string (e.g. `"content_asset.body"`).
 * @param contexts - The component's data binding contexts.
 * @param dataBindings - The resolved data bindings from {@link QualifierContext}.
 * @returns The resolved value, or `''` if resolution fails.
 */
export function resolveExpression(
    expression: string,
    contexts: DataBindingRequirement[],
    dataBindings: NonNullable<QualifierContext['dataBindings']>
): unknown {
    const parsed = parseExpression(expression);
    if (!parsed) return '';

    const context = contexts.find((c) => c.type === parsed.type);
    if (!context) return '';

    const record: ResolvedDataBinding | undefined = dataBindings[context.type]?.[context.id];
    if (!record) return '';

    return parseFieldValue(record[parsed.field] ?? '');
}

/**
 * Resolves data binding expressions for a single component. Replaces attribute
 * values in the component's `data` with the resolved values from context
 * resolution. Attributes without a matching expression are preserved as-is.
 * When an expression cannot be resolved, the attribute value is set to an
 * empty string.
 *
 * Returns the component unchanged if it has no data binding metadata or if
 * `dataBindings` is `undefined`.
 *
 * @param component - The component to resolve data bindings for.
 * @param binding - The component's data binding metadata from the page manifest's `componentInfo`, or `null`/`undefined` if not bound.
 * @param dataBindings - The resolved data bindings from {@link QualifierContext}, or `undefined` if no bindings were resolved.
 * @returns The component with resolved attribute values, or the original component if no bindings apply.
 *
 * @example
 * ```ts
 * import { resolveComponentDataBindings } from '@salesforce/storefront-next-runtime/design/data';
 *
 * const component = {
 *     id: 'banner',
 *     typeId: 'commerce_assets.contentBanner',
 *     data: { heading: 'Fallback Title', body: 'Fallback Body' },
 *     regions: [],
 * };
 *
 * const binding = {
 *     expressions: {
 *         heading: 'content_asset.title',
 *         body: 'content_asset.body',
 *     },
 *     contexts: [{ type: 'content_asset', id: 'winter-sale-uuid' }],
 * };
 *
 * const dataBindings = {
 *     content_asset: {
 *         'winter-sale-uuid': {
 *             title: 'Winter Sale',
 *             body: '<div>Free Shipping on all orders!</div>',
 *         },
 *     },
 * };
 *
 * const resolved = resolveComponentDataBindings(component, binding, dataBindings);
 * // resolved.data.heading === 'Winter Sale'
 * // resolved.data.body === '<div>Free Shipping on all orders!</div>'
 * ```
 */
export function resolveComponentDataBindings(
    component: ShopperExperience.schemas['Component'],
    binding: ComponentDataBinding | null | undefined,
    dataBindings: QualifierContext['dataBindings']
): ShopperExperience.schemas['Component'] {
    if (!dataBindings) {
        return component;
    }

    if (!binding?.contexts?.length) return component;

    const expressionEntries = Object.entries(binding.expressions ?? {});
    if (expressionEntries.length === 0) return component;

    const resolvedData: Record<string, unknown> = {
        ...(component.data as Record<string, unknown> | undefined),
    };

    for (const [attrName, expression] of expressionEntries) {
        resolvedData[attrName] = resolveExpression(expression, binding.contexts, dataBindings);
    }

    return {
        ...component,
        data: resolvedData as typeof component.data,
    };
}
