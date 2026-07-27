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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getLogger, loggerContext } from './logger.server';
import { setLogLevel, type Logger } from './logger';
import { correlationContext } from '@/lib/correlation';

const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('getLogger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setLogLevel(undefined);
    });

    afterEach(() => {
        setLogLevel(undefined);
    });

    it('includes correlation ID from router context', () => {
        const mockContext = {
            get: vi.fn((ctx: unknown) => {
                if (ctx === correlationContext) return 'corr-abc-123';
                return undefined;
            }),
        } as any;

        const logger = getLogger(mockContext);
        logger.info('Session created');

        expect(mockConsoleLog).toHaveBeenCalledWith(
            'INFO Session created',
            JSON.stringify({ correlationId: 'corr-abc-123' })
        );
    });

    it('merges correlation ID with call-site metadata', () => {
        const mockContext = {
            get: vi.fn((ctx: unknown) => {
                if (ctx === correlationContext) return 'corr-xyz';
                return undefined;
            }),
        } as any;

        const logger = getLogger(mockContext);
        logger.info('Product loaded', { productId: 'prod-789' });

        expect(mockConsoleLog).toHaveBeenCalledWith(
            'INFO Product loaded',
            JSON.stringify({ correlationId: 'corr-xyz', productId: 'prod-789' })
        );
    });

    it('returns injected logger from loggerContext when present', () => {
        const infoSpy = vi.fn();
        const injectedLogger: Logger = {
            error: vi.fn(),
            warn: vi.fn(),
            info: infoSpy,
            debug: vi.fn(),
        };
        const mockContext = {
            get: vi.fn((ctx: unknown) => {
                if (ctx === loggerContext) return injectedLogger;
                return undefined;
            }),
        } as any;

        const logger = getLogger(mockContext);
        expect(logger).toBe(injectedLogger);

        logger.info('test');
        expect(infoSpy).toHaveBeenCalledWith('test');
        expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('works without correlation ID in context', () => {
        const mockContext = {
            get: vi.fn(() => undefined),
        } as any;

        const logger = getLogger(mockContext);
        logger.info('Product loaded');

        expect(mockConsoleLog).toHaveBeenCalledWith('INFO Product loaded');
    });
});
