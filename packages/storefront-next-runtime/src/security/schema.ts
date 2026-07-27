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
import { z } from 'zod';
import type { SecurityConfig } from './types.js';

export const VALID_CSP_DIRECTIVES = [
    'default-src',
    'script-src',
    'style-src',
    'img-src',
    'font-src',
    'connect-src',
    'frame-src',
    'frame-ancestors',
    'form-action',
    'base-uri',
    'object-src',
    'manifest-src',
    'media-src',
    'worker-src',
    'child-src',
    'report-uri',
    'report-to',
    'upgrade-insecure-requests',
] as const;

const cspDirectivesSchema = z
    .record(z.string(), z.union([z.array(z.string()), z.literal(true)]))
    .superRefine((directives, ctx) => {
        for (const name of Object.keys(directives)) {
            if (!(VALID_CSP_DIRECTIVES as readonly string[]).includes(name)) {
                ctx.addIssue({
                    code: 'custom',
                    message: `Invalid CSP directive name "${name}". Valid: ${VALID_CSP_DIRECTIVES.join(', ')}`,
                    path: [name],
                });
            }
            if (name === 'upgrade-insecure-requests') {
                if (directives[name] !== true) {
                    ctx.addIssue({
                        code: 'custom',
                        message: `'upgrade-insecure-requests' must be the literal value true`,
                        path: [name],
                    });
                }
            } else if (!Array.isArray(directives[name])) {
                ctx.addIssue({
                    code: 'custom',
                    message: `Directive "${name}" must be a string array`,
                    path: [name],
                });
            }
        }
    });

const cspConfigSchema = z.object({
    directives: cspDirectivesSchema.optional(),
    reportOnly: z.boolean().optional(),
});

const hstsConfigSchema = z.object({
    maxAge: z.number().int().nonnegative().optional(),
    includeSubDomains: z.boolean().optional(),
    preload: z.boolean().optional(),
});

const referrerPolicySchema = z.enum([
    'no-referrer',
    'no-referrer-when-downgrade',
    'origin',
    'origin-when-cross-origin',
    'same-origin',
    'strict-origin',
    'strict-origin-when-cross-origin',
    'unsafe-url',
]);

const securityConfigSchema = z.object({
    enabled: z.boolean().optional(),
    csp: z.union([cspConfigSchema, z.literal(false)]).optional(),
    hsts: z.union([hstsConfigSchema, z.literal(false)]).optional(),
    frameOptions: z.union([z.enum(['DENY', 'SAMEORIGIN']), z.literal(false)]).optional(),
    contentTypeOptions: z.union([z.literal('nosniff'), z.literal(false)]).optional(),
    referrerPolicy: z.union([referrerPolicySchema, z.literal(false)]).optional(),
    permissionsPolicy: z.union([z.record(z.string(), z.array(z.string())), z.literal(false)]).optional(),
});

/**
 * Validate a `SecurityConfig`. Throws a `ZodError` with a clear message on
 * invalid directive names or value shapes. Called once at server boot.
 */
export function parseSecurityConfig(input: unknown): SecurityConfig {
    return securityConfigSchema.parse(input) as SecurityConfig;
}
