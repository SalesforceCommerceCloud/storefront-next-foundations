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
import type { RequestHandler } from 'express';
import morgan from 'morgan';
import chalk from 'chalk';
import { minimatch } from 'minimatch';

/**
 * Patterns for URLs to skip logging (static assets and Vite internals)
 */
const SKIP_PATTERNS = [
    '/@vite/**',
    '/@id/**',
    '/@fs/**',
    '/@react-router/**',
    '/src/**',
    '/node_modules/**',
    '**/*.js',
    '**/*.css',
    '**/*.ts',
    '**/*.tsx',
    '**/*.js.map',
    '**/*.css.map',
];

/**
 * Create request logging middleware
 * Used in dev and preview modes for request visibility
 */
export function createLoggingMiddleware(): RequestHandler {
    // Custom format with colors
    morgan.token('status-colored', (req, res) => {
        const status = res.statusCode;
        let color = chalk.green;

        if (status >= 500) {
            color = chalk.red;
        } else if (status >= 400) {
            color = chalk.yellow;
        } else if (status >= 300) {
            color = chalk.cyan;
        }

        return color(String(status));
    });

    morgan.token('method-colored', (req) => {
        const method = req.method;
        const colors: Record<string, typeof chalk.green> = {
            GET: chalk.green,
            POST: chalk.blue,
            PUT: chalk.yellow,
            DELETE: chalk.red,
            PATCH: chalk.magenta,
        };
        const color = (method && colors[method]) || chalk.white;
        return color(method);
    });

    // Format: [METHOD] /path - STATUS (response-time ms)
    return morgan(
        (tokens, req, res) => {
            return [
                tokens['method-colored'](req, res),
                tokens.url(req, res),
                '-',
                tokens['status-colored'](req, res),
                chalk.gray(`(${tokens['response-time'](req, res)}ms)`),
            ].join(' ');
        },
        {
            // Skip logging for static assets to reduce noise
            skip: (req) => {
                return SKIP_PATTERNS.some((pattern) => minimatch(req.url, pattern, { dot: true }));
            },
        }
    );
}
