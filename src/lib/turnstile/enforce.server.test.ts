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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enforceTurnstile, resolveVerificationMode } from './enforce.server';
import { redactEmailForLog } from './log-redact.server';
import type { AppConfig } from '@/types/config';

// Compute redacted form once. Tests assert that the production code applies redaction —
// they do NOT pin the specific hash output, so changing the hashing scheme only requires
// updating the helper, not every test.
const SHOPPER_EMAIL = 'shopper@example.com';
const REDACTED_SHOPPER_EMAIL = redactEmailForLog(SHOPPER_EMAIL);
const USER_EMAIL = 'user@example.com';
const REDACTED_USER_EMAIL = redactEmailForLog(USER_EMAIL);

vi.mock('@/lib/turnstile/verify.server', () => ({
    verifyTurnstileToken: vi.fn(),
}));
vi.mock('@/lib/turnstile/utils', () => ({
    getTurnstileSiteKey: vi.fn(),
    getTurnstileSecretKey: vi.fn(),
}));
vi.mock('@/lib/turnstile/health.server', () => ({
    isTurnstileDegraded: vi.fn(),
    getSiteverifyMetricsSnapshot: vi.fn(() => ({
        sampleCount: 0,
        failureCount: 0,
        failureRate: 0,
        p95LatencyMs: 0,
        currentVerdict: false,
    })),
}));

function mockLogger() {
    return { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
}

function makeRequest(origin = 'https://storefront.example.com') {
    return new Request('https://storefront.example.com/action/test', {
        method: 'POST',
        headers: { origin },
    });
}

const TURNSTILE_ENABLED_CONFIG = {
    security: {
        turnstile: {
            enabled: true,
            verification: { enabled: true },
            sites: {},
        },
    },
} as unknown as AppConfig;

describe('enforceTurnstile', () => {
    let mockVerifyTurnstileToken: ReturnType<typeof vi.fn>;
    let mockGetTurnstileSiteKey: ReturnType<typeof vi.fn>;
    let mockGetTurnstileSecretKey: ReturnType<typeof vi.fn>;
    let mockIsTurnstileDegraded: ReturnType<typeof vi.fn>;
    let mockGetSiteverifyMetricsSnapshot: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();

        const verifyMod = await import('@/lib/turnstile/verify.server');
        mockVerifyTurnstileToken = vi.mocked(verifyMod.verifyTurnstileToken);

        const utilsMod = await import('@/lib/turnstile/utils');
        mockGetTurnstileSiteKey = vi.mocked(utilsMod.getTurnstileSiteKey);
        mockGetTurnstileSecretKey = vi.mocked(utilsMod.getTurnstileSecretKey);

        const healthMod = await import('@/lib/turnstile/health.server');
        mockIsTurnstileDegraded = vi.mocked(healthMod.isTurnstileDegraded);
        mockIsTurnstileDegraded.mockResolvedValue(false);
        mockGetSiteverifyMetricsSnapshot = vi.mocked(healthMod.getSiteverifyMetricsSnapshot);
        mockGetSiteverifyMetricsSnapshot.mockReturnValue({
            sampleCount: 0,
            failureCount: 0,
            failureRate: 0,
            p95LatencyMs: 0,
            currentVerdict: false,
        });
    });

    it('allows request when verification is disabled', async () => {
        const config = { security: { turnstile: { enabled: true, verification: { enabled: false } } } };
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest(),
            config: config as unknown as AppConfig,
            turnstileToken: undefined,
            logger,
            actionName: 'test',
        });

        expect(result).toBe(true);
        expect(mockVerifyTurnstileToken).not.toHaveBeenCalled();
    });

    it('allows request when turnstile.enabled is false', async () => {
        const config = { security: { turnstile: { enabled: false, verification: { enabled: true } } } };
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest(),
            config: config as unknown as AppConfig,
            turnstileToken: undefined,
            logger,
            actionName: 'test',
        });

        expect(result).toBe(true);
    });

    it('allows request when security config is absent', async () => {
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest(),
            config: {} as AppConfig,
            turnstileToken: undefined,
            logger,
            actionName: 'test',
        });

        expect(result).toBe(true);
    });

    it('blocks request when Origin and Referer headers are both missing', async () => {
        const logger = mockLogger();
        const request = new Request('https://storefront.example.com/action/test', {
            method: 'POST',
            // No origin or referer header
        });

        const result = await enforceTurnstile({
            request,
            config: TURNSTILE_ENABLED_CONFIG,
            turnstileToken: 'some-token',
            logger,
            actionName: 'test-action',
            email: 'user@example.com',
        });

        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('No Origin or Referer header'),
            expect.objectContaining({ action: 'test-action' })
        );
    });

    it('blocks request when origin does not match any configured domain', async () => {
        mockGetTurnstileSiteKey.mockReturnValue(null);
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest('https://evil.example.com'),
            config: TURNSTILE_ENABLED_CONFIG,
            turnstileToken: 'some-token',
            logger,
            actionName: 'test-action',
            email: 'user@example.com',
        });

        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('No site key match'),
            expect.objectContaining({ action: 'test-action' })
        );
    });

    it('blocks request when no secret key is configured for the site', async () => {
        mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
        mockGetTurnstileSecretKey.mockReturnValue(null);
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest(),
            config: TURNSTILE_ENABLED_CONFIG,
            turnstileToken: 'some-token',
            logger,
            actionName: 'test-action',
        });

        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('No secret key configured'),
            expect.objectContaining({ siteKey: 'site-key-123' })
        );
    });

    it('blocks request when turnstile token is missing', async () => {
        mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
        mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest(),
            config: TURNSTILE_ENABLED_CONFIG,
            turnstileToken: undefined,
            logger,
            actionName: 'test-action',
            email: 'user@example.com',
        });

        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Missing token'),
            expect.objectContaining({
                action: 'test-action',
                // Email is redacted in log output: hash@domain
                email: expect.stringMatching(/^[0-9a-f]{8}@example\.com$/),
            })
        );
        expect(mockVerifyTurnstileToken).not.toHaveBeenCalled();
    });

    it('blocks request when Cloudflare verification fails', async () => {
        mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
        mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
        mockVerifyTurnstileToken.mockResolvedValue({ success: false, errorCodes: ['invalid-input-response'] });
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest(),
            config: TURNSTILE_ENABLED_CONFIG,
            turnstileToken: 'bad-token',
            logger,
            actionName: 'test-action',
        });

        expect(result).toBe(false);
        expect(mockVerifyTurnstileToken).toHaveBeenCalledWith({
            token: 'bad-token',
            secretKey: 'secret-key-456',
            remoteIp: undefined,
        });
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Verification failed'),
            expect.objectContaining({ errorCodes: ['invalid-input-response'] })
        );
    });

    it('allows request when Cloudflare verification succeeds', async () => {
        mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
        mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
        mockVerifyTurnstileToken.mockResolvedValue({
            success: true,
            challengeTs: '2026-04-22T00:00:00Z',
            errorCodes: [],
        });
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest(),
            config: TURNSTILE_ENABLED_CONFIG,
            turnstileToken: 'valid-token',
            logger,
            actionName: 'test-action',
        });

        expect(result).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith(
            expect.stringContaining('Verification passed'),
            expect.objectContaining({ action: 'test-action' })
        );
    });

    it('extracts remote IP from x-forwarded-for header', async () => {
        mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
        mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
        mockVerifyTurnstileToken.mockResolvedValue({ success: true, errorCodes: [] });

        const request = new Request('https://storefront.example.com/action/test', {
            method: 'POST',
            headers: {
                origin: 'https://storefront.example.com',
                'x-forwarded-for': '203.0.113.50, 70.41.3.18',
            },
        });

        await enforceTurnstile({
            request,
            config: TURNSTILE_ENABLED_CONFIG,
            turnstileToken: 'valid-token',
            logger: mockLogger(),
            actionName: 'test-action',
        });

        expect(mockVerifyTurnstileToken).toHaveBeenCalledWith(expect.objectContaining({ remoteIp: '203.0.113.50' }));
    });

    describe('graceful degradation', () => {
        it('allows request with missing token when Cloudflare CDN is down', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
            mockIsTurnstileDegraded.mockResolvedValue(true);
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: undefined,
                logger,
                actionName: 'test-action',
                email: 'user@example.com',
            });

            expect(result).toBe(true);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Turnstile platform degraded'),
                expect.objectContaining({ action: 'test-action' })
            );
            expect(mockVerifyTurnstileToken).not.toHaveBeenCalled();
        });

        it('blocks request with missing token when Cloudflare CDN is healthy', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
            mockIsTurnstileDegraded.mockResolvedValue(false);
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: undefined,
                logger,
                actionName: 'test-action',
                email: 'user@example.com',
            });

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Missing token'),
                expect.objectContaining({ action: 'test-action' })
            );
        });

        it('allows request when siteverify returns internal-error (Cloudflare infrastructure)', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
            mockVerifyTurnstileToken.mockResolvedValue({ success: false, errorCodes: ['internal-error'] });
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'some-token',
                logger,
                actionName: 'test-action',
            });

            expect(result).toBe(true);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('infrastructure issue'),
                expect.objectContaining({ errorCodes: ['internal-error'] })
            );
        });

        it('allows request when siteverify endpoint returns HTTP 5xx', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
            mockVerifyTurnstileToken.mockResolvedValue({ success: false, errorCodes: ['http-error-503'] });
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'some-token',
                logger,
                actionName: 'test-action',
            });

            expect(result).toBe(true);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('infrastructure issue'),
                expect.objectContaining({ errorCodes: ['http-error-503'] })
            );
        });

        it('blocks request when siteverify returns timeout-or-duplicate (token reuse)', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
            mockVerifyTurnstileToken.mockResolvedValue({ success: false, errorCodes: ['timeout-or-duplicate'] });
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'reused-token',
                logger,
                actionName: 'test-action',
            });

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('bot or replay'),
                expect.objectContaining({ errorCodes: ['timeout-or-duplicate'] })
            );
        });

        it('blocks request when siteverify returns invalid-input-response (bot)', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
            mockVerifyTurnstileToken.mockResolvedValue({ success: false, errorCodes: ['invalid-input-response'] });
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'forged-token',
                logger,
                actionName: 'test-action',
            });

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('bot or replay'),
                expect.objectContaining({ errorCodes: ['invalid-input-response'] })
            );
        });
    });

    describe('fail-open log enrichment with metrics snapshot', () => {
        // Operators tail MRT logs to diagnose Turnstile incidents. Every fail-open
        // decision MUST carry the metrics snapshot so the rate, latency, sample count,
        // and current verdict are visible alongside the warn message.

        it('includes metrics in missing-token-degraded log', async () => {
            const metricsSample = {
                sampleCount: 17,
                failureCount: 12,
                failureRate: 12 / 17,
                p95LatencyMs: 4500,
                currentVerdict: true,
            };
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
            mockIsTurnstileDegraded.mockResolvedValue(true);
            mockGetSiteverifyMetricsSnapshot.mockReturnValue(metricsSample);
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: undefined,
                logger,
                actionName: 'test-action',
                email: 'shopper@example.com',
            });

            expect(result).toBe(true);

            expect(logger.warn).toHaveBeenCalledTimes(1);
            const [message, meta] = logger.warn.mock.calls[0] as [string, Record<string, unknown>];
            expect(message).toBe('[Turnstile] Missing token — allowed (Turnstile platform degraded)');
            expect(meta).toMatchObject({
                email: REDACTED_SHOPPER_EMAIL,
                action: 'test-action',
                metrics: metricsSample,
            });
            // Field-level value check
            expect((meta.metrics as typeof metricsSample).sampleCount).toBe(17);
            expect((meta.metrics as typeof metricsSample).failureCount).toBe(12);
            expect((meta.metrics as typeof metricsSample).failureRate).toBeCloseTo(0.706);
            expect((meta.metrics as typeof metricsSample).p95LatencyMs).toBe(4500);
            expect((meta.metrics as typeof metricsSample).currentVerdict).toBe(true);
        });

        it('includes metrics in infrastructure-error fail-open log', async () => {
            const metricsSample = {
                sampleCount: 9,
                failureCount: 8,
                failureRate: 8 / 9,
                p95LatencyMs: 5200,
                currentVerdict: true,
            };
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
            mockVerifyTurnstileToken.mockResolvedValue({ success: false, errorCodes: ['internal-error'] });
            mockGetSiteverifyMetricsSnapshot.mockReturnValue(metricsSample);
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token-abc',
                logger,
                actionName: 'authorize-passwordless-email',
                email: 'shopper@example.com',
            });

            expect(result).toBe(true);

            expect(logger.warn).toHaveBeenCalledTimes(1);
            const [message, meta] = logger.warn.mock.calls[0] as [string, Record<string, unknown>];
            expect(message).toBe('[Turnstile] Verification failed due to infrastructure issue — allowed (fail-open)');
            expect(meta).toMatchObject({
                errorCodes: ['internal-error'],
                action: 'authorize-passwordless-email',
                email: REDACTED_SHOPPER_EMAIL,
                metrics: metricsSample,
            });
            expect((meta.metrics as typeof metricsSample).failureRate).toBeCloseTo(0.889);
            expect((meta.metrics as typeof metricsSample).p95LatencyMs).toBe(5200);
        });

        it('includes metrics for HTTP 5xx infrastructure failures', async () => {
            const metricsSample = {
                sampleCount: 12,
                failureCount: 12,
                failureRate: 1,
                p95LatencyMs: 4900,
                currentVerdict: true,
            };
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
            mockVerifyTurnstileToken.mockResolvedValue({ success: false, errorCodes: ['http-error-503'] });
            mockGetSiteverifyMetricsSnapshot.mockReturnValue(metricsSample);
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token-abc',
                logger,
                actionName: 'test-action',
            });

            expect(result).toBe(true);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('infrastructure issue'),
                expect.objectContaining({
                    metrics: metricsSample,
                    errorCodes: ['http-error-503'],
                })
            );
        });

        it('does NOT include metrics in fail-CLOSED logs (block paths)', async () => {
            // Block paths don't need the snapshot - operators only need it when fail-open
            // fires. This test asserts we don't bloat block logs unnecessarily.
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
            mockVerifyTurnstileToken.mockResolvedValue({ success: false, errorCodes: ['invalid-input-response'] });
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'forged',
                logger,
                actionName: 'test-action',
            });

            const meta = (logger.warn.mock.calls[0] as [string, Record<string, unknown>])[1];
            expect(meta).not.toHaveProperty('metrics');
        });

        it('does NOT include metrics in missing-token-but-healthy block log', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
            mockIsTurnstileDegraded.mockResolvedValue(false);
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: undefined,
                logger,
                actionName: 'test-action',
            });

            const meta = (logger.warn.mock.calls[0] as [string, Record<string, unknown>])[1];
            expect(meta).not.toHaveProperty('metrics');
        });
    });

    describe('header and origin edge cases', () => {
        it('falls back to Referer when Origin header is missing', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-456');
            mockVerifyTurnstileToken.mockResolvedValue({ success: true, errorCodes: [] });
            const logger = mockLogger();

            const request = new Request('https://storefront.example.com/action/test', {
                method: 'POST',
                headers: { referer: 'https://storefront.example.com/checkout' },
            });

            const result = await enforceTurnstile({
                request,
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(result).toBe(true);
            // Site key was looked up using the Referer URL
            expect(mockGetTurnstileSiteKey).toHaveBeenCalledWith(
                expect.anything(),
                'https://storefront.example.com/checkout'
            );
        });

        it('prefers Origin over Referer when both are present', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-456');
            mockVerifyTurnstileToken.mockResolvedValue({ success: true, errorCodes: [] });
            const logger = mockLogger();

            const request = new Request('https://storefront.example.com/action/test', {
                method: 'POST',
                headers: {
                    origin: 'https://storefront.example.com',
                    referer: 'https://attacker.example.com/spoof',
                },
            });

            await enforceTurnstile({
                request,
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(mockGetTurnstileSiteKey).toHaveBeenCalledWith(expect.anything(), 'https://storefront.example.com');
        });

        it('extracts remote IP from cf-connecting-ip when x-forwarded-for is absent', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-456');
            mockVerifyTurnstileToken.mockResolvedValue({ success: true, errorCodes: [] });
            const logger = mockLogger();

            const request = new Request('https://storefront.example.com/action/test', {
                method: 'POST',
                headers: {
                    origin: 'https://storefront.example.com',
                    'cf-connecting-ip': '203.0.113.99',
                },
            });

            await enforceTurnstile({
                request,
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(mockVerifyTurnstileToken).toHaveBeenCalledWith(
                expect.objectContaining({ remoteIp: '203.0.113.99' })
            );
        });

        it('takes the first hop from x-forwarded-for when it contains multiple', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-456');
            mockVerifyTurnstileToken.mockResolvedValue({ success: true, errorCodes: [] });
            const logger = mockLogger();

            const request = new Request('https://storefront.example.com/action/test', {
                method: 'POST',
                headers: {
                    origin: 'https://storefront.example.com',
                    'x-forwarded-for': '198.51.100.10, 10.0.0.1, 10.0.0.2',
                },
            });

            await enforceTurnstile({
                request,
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(mockVerifyTurnstileToken).toHaveBeenCalledWith(
                expect.objectContaining({ remoteIp: '198.51.100.10' })
            );
        });

        it('handles whitespace in x-forwarded-for first hop', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-456');
            mockVerifyTurnstileToken.mockResolvedValue({ success: true, errorCodes: [] });
            const logger = mockLogger();

            const request = new Request('https://storefront.example.com/action/test', {
                method: 'POST',
                headers: {
                    origin: 'https://storefront.example.com',
                    'x-forwarded-for': '  198.51.100.10  , 10.0.0.1',
                },
            });

            await enforceTurnstile({
                request,
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            // Whitespace trimmed
            expect(mockVerifyTurnstileToken).toHaveBeenCalledWith(
                expect.objectContaining({ remoteIp: '198.51.100.10' })
            );
        });

        it('passes undefined remoteIp when no IP headers are present', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-456');
            mockVerifyTurnstileToken.mockResolvedValue({ success: true, errorCodes: [] });
            const logger = mockLogger();

            const request = new Request('https://storefront.example.com/action/test', {
                method: 'POST',
                headers: { origin: 'https://storefront.example.com' },
            });

            await enforceTurnstile({
                request,
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(mockVerifyTurnstileToken).toHaveBeenCalledWith(expect.objectContaining({ remoteIp: undefined }));
        });
    });

    describe('http-error-* error code classification', () => {
        // The infrastructure-error path matches both `internal-error` and `http-error-*`.
        // These tests pin that classification.

        it('treats http-error-500 as fail-open infrastructure', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-456');
            mockVerifyTurnstileToken.mockResolvedValue({
                success: false,
                errorCodes: ['http-error-500'],
            });
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(result).toBe(true);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('infrastructure issue'),
                expect.any(Object)
            );
        });

        it('treats http-error-503 as fail-open infrastructure', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-456');
            mockVerifyTurnstileToken.mockResolvedValue({
                success: false,
                errorCodes: ['http-error-503'],
            });
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(result).toBe(true);
        });

        it('blocks (fail-closed) on http-error-400 — our request was malformed, not CF-side', async () => {
            // 4xx from siteverify means we sent a bad request (wrong secret, malformed body,
            // unauthorized). Failing open here would let a misconfigured secret silently
            // bypass verification. Only 5xx is a CF-side failure that justifies fail-open.
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-456');
            mockVerifyTurnstileToken.mockResolvedValue({
                success: false,
                errorCodes: ['http-error-400'],
            });
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('bot or replay'),
                expect.objectContaining({ errorCodes: ['http-error-400'] })
            );
        });

        it('blocks (fail-closed) on http-error-401 and http-error-403', async () => {
            for (const code of ['http-error-401', 'http-error-403', 'http-error-499']) {
                mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
                mockGetTurnstileSecretKey.mockReturnValue('secret-456');
                mockVerifyTurnstileToken.mockResolvedValue({ success: false, errorCodes: [code] });
                const logger = mockLogger();

                const result = await enforceTurnstile({
                    request: makeRequest(),
                    config: TURNSTILE_ENABLED_CONFIG,
                    turnstileToken: 'token',
                    logger,
                    actionName: 'test',
                });

                expect(result).toBe(false);
            }
        });

        it('fails open on every 5xx (http-error-500..599)', async () => {
            for (const status of [500, 501, 502, 503, 504, 599]) {
                mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
                mockGetTurnstileSecretKey.mockReturnValue('secret-456');
                mockVerifyTurnstileToken.mockResolvedValue({
                    success: false,
                    errorCodes: [`http-error-${status}`],
                });
                const logger = mockLogger();

                const result = await enforceTurnstile({
                    request: makeRequest(),
                    config: TURNSTILE_ENABLED_CONFIG,
                    turnstileToken: 'token',
                    logger,
                    actionName: 'test',
                });

                expect(result).toBe(true);
            }
        });

        it('mixed errorCodes: any infrastructure code triggers fail-open', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
            mockGetTurnstileSecretKey.mockReturnValue('secret-456');
            mockVerifyTurnstileToken.mockResolvedValue({
                success: false,
                errorCodes: ['invalid-input-response', 'internal-error'],
            });
            const logger = mockLogger();

            // Even though `invalid-input-response` is a block-worthy code, the presence
            // of `internal-error` flips this to fail-open. This pins the OR semantics.
            const result = await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(result).toBe(true);
        });
    });

    describe('exhaustive log-meta shape per decision', () => {
        // For each decision, pin both the message AND the complete meta object shape.
        // Operators query MRT logs by these fields; an accidental rename or omission
        // would silently break dashboards.

        function makeRequestWithHeaders(headers: Record<string, string>): Request {
            return new Request('https://storefront.example.com/action/test', {
                method: 'POST',
                headers,
            });
        }

        it('missing-headers warn log carries action and email only (no IP/UA)', async () => {
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequestWithHeaders({}),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test-action',
                email: 'shopper@example.com',
            });

            expect(logger.warn).toHaveBeenCalledTimes(1);
            const [, meta] = logger.warn.mock.calls[0] as [string, Record<string, unknown>];
            // Header-resolution failed before remoteIp/userAgent were extracted.
            expect(meta).toEqual({
                action: 'test-action',
                email: REDACTED_SHOPPER_EMAIL,
            });
        });

        it('site-key-not-found warn log includes requestUrl, IP, UA, email, action', async () => {
            mockGetTurnstileSiteKey.mockReturnValue(null);
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequestWithHeaders({
                    origin: 'https://attacker.example.com',
                    'x-forwarded-for': '203.0.113.1',
                    'user-agent': 'TestUA/1.0',
                }),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test-action',
                email: 'shopper@example.com',
            });

            expect(logger.warn).toHaveBeenCalledTimes(1);
            const [message, meta] = logger.warn.mock.calls[0] as [string, Record<string, unknown>];
            expect(message).toBe('[Turnstile] No site key match for request origin — blocked');
            expect(meta).toEqual({
                requestUrl: 'https://attacker.example.com',
                remoteIp: '203.0.113.1',
                userAgent: 'TestUA/1.0',
                email: REDACTED_SHOPPER_EMAIL,
                action: 'test-action',
            });
        });

        it('site-key-not-found path does NOT call getTurnstileSecretKey', async () => {
            mockGetTurnstileSiteKey.mockReturnValue(null);
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(mockGetTurnstileSecretKey).not.toHaveBeenCalled();
        });

        it('secret-key-not-found warn log carries siteKey, requestUrl, action only', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-abc');
            mockGetTurnstileSecretKey.mockReturnValue(null);
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequest('https://storefront.example.com'),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test-action',
            });

            expect(logger.warn).toHaveBeenCalledTimes(1);
            const [message, meta] = logger.warn.mock.calls[0] as [string, Record<string, unknown>];
            expect(message).toBe('[Turnstile] No secret key configured for site — blocked');
            // This branch logs only siteKey/requestUrl/action - intentionally narrower
            // because a missing secret is a deployment misconfiguration, not a forensics
            // event needing IP/UA.
            expect(meta).toEqual({
                siteKey: 'site-abc',
                requestUrl: 'https://storefront.example.com',
                action: 'test-action',
            });
        });

        it('missing-token-blocked log shape (healthy platform branch)', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-abc');
            mockGetTurnstileSecretKey.mockReturnValue('secret-abc');
            mockIsTurnstileDegraded.mockResolvedValue(false);
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequestWithHeaders({
                    origin: 'https://storefront.example.com',
                    'x-forwarded-for': '198.51.100.7',
                    'user-agent': 'Mozilla/5.0 ...',
                }),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: undefined,
                logger,
                actionName: 'test-action',
                email: 'shopper@example.com',
            });

            expect(logger.warn).toHaveBeenCalledTimes(1);
            const [message, meta] = logger.warn.mock.calls[0] as [string, Record<string, unknown>];
            expect(message).toBe('[Turnstile] Missing token — blocked request without challenge completion');
            expect(meta).toEqual({
                email: REDACTED_SHOPPER_EMAIL,
                remoteIp: '198.51.100.7',
                userAgent: 'Mozilla/5.0 ...',
                action: 'test-action',
            });
            // Specifically NOT logging metrics on the block path
            expect(meta).not.toHaveProperty('metrics');
        });

        it('missing-token-degraded log shape (fail-open branch) carries metrics', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-abc');
            mockGetTurnstileSecretKey.mockReturnValue('secret-abc');
            mockIsTurnstileDegraded.mockResolvedValue(true);
            mockGetSiteverifyMetricsSnapshot.mockReturnValue({
                sampleCount: 7,
                failureCount: 5,
                failureRate: 5 / 7,
                p95LatencyMs: 4200,
                currentVerdict: true,
            });
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequestWithHeaders({
                    origin: 'https://storefront.example.com',
                    'x-forwarded-for': '198.51.100.7',
                    'user-agent': 'Mozilla/5.0 ...',
                }),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: undefined,
                logger,
                actionName: 'test-action',
                email: 'shopper@example.com',
            });

            expect(logger.warn).toHaveBeenCalledTimes(1);
            const [message, meta] = logger.warn.mock.calls[0] as [string, Record<string, unknown>];
            expect(message).toBe('[Turnstile] Missing token — allowed (Turnstile platform degraded)');
            expect(meta).toEqual({
                email: REDACTED_SHOPPER_EMAIL,
                remoteIp: '198.51.100.7',
                userAgent: 'Mozilla/5.0 ...',
                action: 'test-action',
                metrics: {
                    sampleCount: 7,
                    failureCount: 5,
                    failureRate: 5 / 7,
                    p95LatencyMs: 4200,
                    currentVerdict: true,
                },
            });
        });

        it('infrastructure-error fail-open log shape carries errorCodes AND metrics', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-abc');
            mockGetTurnstileSecretKey.mockReturnValue('secret-abc');
            mockVerifyTurnstileToken.mockResolvedValue({ success: false, errorCodes: ['internal-error'] });
            mockGetSiteverifyMetricsSnapshot.mockReturnValue({
                sampleCount: 12,
                failureCount: 11,
                failureRate: 11 / 12,
                p95LatencyMs: 4500,
                currentVerdict: true,
            });
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequestWithHeaders({
                    origin: 'https://storefront.example.com',
                    'x-forwarded-for': '198.51.100.7',
                    'user-agent': 'Mozilla/5.0 ...',
                }),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token-abc',
                logger,
                actionName: 'test-action',
                email: 'shopper@example.com',
            });

            expect(logger.warn).toHaveBeenCalledTimes(1);
            const [message, meta] = logger.warn.mock.calls[0] as [string, Record<string, unknown>];
            expect(message).toBe('[Turnstile] Verification failed due to infrastructure issue — allowed (fail-open)');
            expect(meta).toEqual({
                errorCodes: ['internal-error'],
                email: REDACTED_SHOPPER_EMAIL,
                remoteIp: '198.51.100.7',
                userAgent: 'Mozilla/5.0 ...',
                action: 'test-action',
                metrics: {
                    sampleCount: 12,
                    failureCount: 11,
                    failureRate: 11 / 12,
                    p95LatencyMs: 4500,
                    currentVerdict: true,
                },
            });
            // Specifically NOT logging hasToken on the fail-open path
            expect(meta).not.toHaveProperty('hasToken');
        });

        it('bot-or-replay block log shape carries errorCodes AND hasToken (no metrics)', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-abc');
            mockGetTurnstileSecretKey.mockReturnValue('secret-abc');
            mockVerifyTurnstileToken.mockResolvedValue({
                success: false,
                errorCodes: ['invalid-input-response'],
            });
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequestWithHeaders({
                    origin: 'https://storefront.example.com',
                    'x-forwarded-for': '198.51.100.7',
                    'user-agent': 'Mozilla/5.0 ...',
                }),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'forged-token',
                logger,
                actionName: 'test-action',
                email: 'shopper@example.com',
            });

            expect(logger.warn).toHaveBeenCalledTimes(1);
            const [message, meta] = logger.warn.mock.calls[0] as [string, Record<string, unknown>];
            expect(message).toBe('[Turnstile] Verification failed — potential bot or replay attack');
            expect(meta).toEqual({
                errorCodes: ['invalid-input-response'],
                email: REDACTED_SHOPPER_EMAIL,
                remoteIp: '198.51.100.7',
                userAgent: 'Mozilla/5.0 ...',
                action: 'test-action',
                hasToken: true,
            });
            // Block paths intentionally omit metrics
            expect(meta).not.toHaveProperty('metrics');
        });

        it('successful-verification debug log carries challengeTs and action only', async () => {
            mockGetTurnstileSiteKey.mockReturnValue('site-abc');
            mockGetTurnstileSecretKey.mockReturnValue('secret-abc');
            mockVerifyTurnstileToken.mockResolvedValue({
                success: true,
                challengeTs: '2026-05-08T12:34:56Z',
                errorCodes: [],
            });
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'good-token',
                logger,
                actionName: 'test-action',
                email: 'shopper@example.com',
            });

            expect(result).toBe(true);
            expect(logger.warn).not.toHaveBeenCalled();
            expect(logger.debug).toHaveBeenCalledTimes(1);
            const [message, meta] = logger.debug.mock.calls[0] as [string, Record<string, unknown>];
            expect(message).toBe('[Turnstile] Verification passed');
            // Debug log is intentionally minimal: no email, no IP, no UA
            expect(meta).toEqual({
                challengeTs: '2026-05-08T12:34:56Z',
                action: 'test-action',
            });
        });

        it('verification passes returns true without logging when challengeTs is undefined', async () => {
            // verifyTurnstileToken may return success without challengeTs (test keys, etc.)
            mockGetTurnstileSiteKey.mockReturnValue('site-abc');
            mockGetTurnstileSecretKey.mockReturnValue('secret-abc');
            mockVerifyTurnstileToken.mockResolvedValue({ success: true, errorCodes: [] });
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequest(),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            const [, meta] = logger.debug.mock.calls[0] as [string, Record<string, unknown>];
            expect(meta).toEqual({
                challengeTs: undefined,
                action: 'test',
            });
        });

        it('user-agent is propagated from request header into log meta', async () => {
            mockGetTurnstileSiteKey.mockReturnValue(null); // forces site-key-not-found path
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequestWithHeaders({
                    origin: 'https://attacker.example.com',
                    'user-agent': 'Mozilla/5.0 (Linux) AppleWebKit',
                }),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            const [, meta] = logger.warn.mock.calls[0] as [string, Record<string, unknown>];
            expect(meta.userAgent).toBe('Mozilla/5.0 (Linux) AppleWebKit');
        });

        it('user-agent is undefined in log meta when header is absent', async () => {
            mockGetTurnstileSiteKey.mockReturnValue(null);
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequestWithHeaders({ origin: 'https://attacker.example.com' }),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            const [, meta] = logger.warn.mock.calls[0] as [string, Record<string, unknown>];
            expect(meta.userAgent).toBeUndefined();
        });

        it('email is redacted (hash@domain) in log meta — never raw at any path', async () => {
            // Pin the redaction contract directly: raw emails MUST NOT appear in logs.
            // Domain stays plaintext for forensics; local-part is replaced with a stable hash.
            mockGetTurnstileSiteKey.mockReturnValue(null);
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequestWithHeaders({ origin: 'https://attacker.example.com' }),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
                email: USER_EMAIL,
            });

            const [, meta] = logger.warn.mock.calls[0] as [string, Record<string, unknown>];
            expect(meta.email).toBe(REDACTED_USER_EMAIL);
            expect(meta.email).not.toBe(USER_EMAIL);
            expect(meta.email).toMatch(/^[0-9a-f]{8}@example\.com$/);
        });

        it('omits email from log meta entirely when caller passes none', async () => {
            mockGetTurnstileSiteKey.mockReturnValue(null);
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequestWithHeaders({ origin: 'https://attacker.example.com' }),
                config: TURNSTILE_ENABLED_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
                // no email
            });

            const [, meta] = logger.warn.mock.calls[0] as [string, Record<string, unknown>];
            expect(meta.email).toBeUndefined();
        });
    });

    describe('config edge cases', () => {
        it('verification.enabled missing (undefined) treats verification as disabled', async () => {
            const config = {
                security: { turnstile: { enabled: true, verification: {} } },
            } as unknown as AppConfig;
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config,
                turnstileToken: undefined,
                logger,
                actionName: 'test',
            });

            // verificationEnabled defaults to false → returns true (allow)
            expect(result).toBe(true);
            expect(mockVerifyTurnstileToken).not.toHaveBeenCalled();
        });

        it('turnstile.enabled missing treats turnstile as disabled (returns true without verify)', async () => {
            const config = {
                security: { turnstile: { verification: { enabled: true } } },
            } as unknown as AppConfig;
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config,
                turnstileToken: undefined,
                logger,
                actionName: 'test',
            });

            expect(result).toBe(true);
            expect(mockVerifyTurnstileToken).not.toHaveBeenCalled();
        });

        it('completely empty turnstile object returns true', async () => {
            const config = { security: { turnstile: {} } } as unknown as AppConfig;
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(result).toBe(true);
        });

        it('does not call site-key/secret/verify lookup paths when verification is disabled', async () => {
            const config = {
                security: { turnstile: { enabled: true, verification: { enabled: false } } },
            } as unknown as AppConfig;
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequest(),
                config,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(mockGetTurnstileSiteKey).not.toHaveBeenCalled();
            expect(mockGetTurnstileSecretKey).not.toHaveBeenCalled();
            expect(mockVerifyTurnstileToken).not.toHaveBeenCalled();
            expect(mockIsTurnstileDegraded).not.toHaveBeenCalled();
        });
    });

    describe('resolveVerificationMode', () => {
        it('returns enforce when mode is enforce', () => {
            const config = {
                security: { turnstile: { verification: { enabled: false, mode: 'enforce' } } },
            } as unknown as AppConfig;
            expect(resolveVerificationMode(config)).toBe('enforce');
        });

        it('returns log-only when mode is log-only', () => {
            const config = {
                security: { turnstile: { verification: { enabled: true, mode: 'log-only' } } },
            } as unknown as AppConfig;
            expect(resolveVerificationMode(config)).toBe('log-only');
        });

        it('returns disabled when mode is disabled', () => {
            const config = {
                security: { turnstile: { verification: { enabled: true, mode: 'disabled' } } },
            } as unknown as AppConfig;
            expect(resolveVerificationMode(config)).toBe('disabled');
        });

        it('mode takes precedence over conflicting enabled flag', () => {
            const config = {
                security: { turnstile: { verification: { enabled: true, mode: 'disabled' } } },
            } as unknown as AppConfig;
            expect(resolveVerificationMode(config)).toBe('disabled');
        });

        it('falls back to enforce when enabled=true and no mode set', () => {
            const config = {
                security: { turnstile: { verification: { enabled: true } } },
            } as unknown as AppConfig;
            expect(resolveVerificationMode(config)).toBe('enforce');
        });

        it('falls back to disabled when enabled=false and no mode set', () => {
            const config = {
                security: { turnstile: { verification: { enabled: false } } },
            } as unknown as AppConfig;
            expect(resolveVerificationMode(config)).toBe('disabled');
        });

        it('returns disabled when verification config is absent', () => {
            const config = { security: { turnstile: {} } } as unknown as AppConfig;
            expect(resolveVerificationMode(config)).toBe('disabled');
        });
    });

    describe('log-only mode', () => {
        const LOG_ONLY_CONFIG = {
            security: {
                turnstile: {
                    enabled: true,
                    verification: { enabled: false, mode: 'log-only' },
                    sites: {},
                },
            },
        } as unknown as AppConfig;

        beforeEach(() => {
            mockGetTurnstileSiteKey.mockReturnValue('test-sitekey');
            mockGetTurnstileSecretKey.mockReturnValue('test-secret');
        });

        it('always returns true when token passes', async () => {
            mockVerifyTurnstileToken.mockResolvedValue({ success: true, errorCodes: [], challengeTs: '2026-01-01' });

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: LOG_ONLY_CONFIG,
                turnstileToken: 'valid-token',
                logger: mockLogger(),
                actionName: 'test',
            });

            expect(result).toBe(true);
        });

        it('always returns true even when bot is detected (would_block=true)', async () => {
            mockVerifyTurnstileToken.mockResolvedValue({
                success: false,
                errorCodes: ['invalid-input-response'],
            });

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: LOG_ONLY_CONFIG,
                turnstileToken: 'bot-token',
                logger: mockLogger(),
                actionName: 'test',
            });

            expect(result).toBe(true);
        });

        it('always returns true even when token is missing and platform is healthy', async () => {
            mockIsTurnstileDegraded.mockResolvedValue(false);

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: LOG_ONLY_CONFIG,
                turnstileToken: undefined,
                logger: mockLogger(),
                actionName: 'test',
            });

            expect(result).toBe(true);
        });

        it('always returns true even when infrastructure error occurs', async () => {
            mockVerifyTurnstileToken.mockResolvedValue({
                success: false,
                errorCodes: ['internal-error'],
            });

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: LOG_ONLY_CONFIG,
                turnstileToken: 'some-token',
                logger: mockLogger(),
                actionName: 'test',
            });

            expect(result).toBe(true);
        });

        it('runs full pipeline — calls verifyTurnstileToken', async () => {
            mockVerifyTurnstileToken.mockResolvedValue({ success: true, errorCodes: [] });

            await enforceTurnstile({
                request: makeRequest(),
                config: LOG_ONLY_CONFIG,
                turnstileToken: 'token',
                logger: mockLogger(),
                actionName: 'test',
            });

            expect(mockVerifyTurnstileToken).toHaveBeenCalledOnce();
        });

        it('runs full pipeline — calls isTurnstileDegraded when token is missing', async () => {
            mockIsTurnstileDegraded.mockResolvedValue(false);

            await enforceTurnstile({
                request: makeRequest(),
                config: LOG_ONLY_CONFIG,
                turnstileToken: undefined,
                logger: mockLogger(),
                actionName: 'test',
            });

            expect(mockIsTurnstileDegraded).toHaveBeenCalledOnce();
        });

        it('logs at info level with would_block=true when bot would be blocked', async () => {
            mockVerifyTurnstileToken.mockResolvedValue({
                success: false,
                errorCodes: ['invalid-input-response'],
            });
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequest(),
                config: LOG_ONLY_CONFIG,
                turnstileToken: 'bot-token',
                logger,
                actionName: 'checkout',
            });

            expect(logger.info).toHaveBeenCalledOnce();
            expect(logger.warn).not.toHaveBeenCalled();
            const [, meta] = logger.info.mock.calls[0];
            expect(meta).toMatchObject({ mode: 'log-only', would_block: true, action: 'checkout' });
        });

        it('logs at info level with would_block=false when token would pass', async () => {
            mockVerifyTurnstileToken.mockResolvedValue({ success: true, errorCodes: [], challengeTs: '2026-01-01' });
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequest(),
                config: LOG_ONLY_CONFIG,
                turnstileToken: 'valid-token',
                logger,
                actionName: 'checkout',
            });

            expect(logger.info).toHaveBeenCalledOnce();
            const [, meta] = logger.info.mock.calls[0];
            expect(meta).toMatchObject({ mode: 'log-only', would_block: false });
        });

        it('emits exactly one log call per request', async () => {
            mockVerifyTurnstileToken.mockResolvedValue({ success: true, errorCodes: [] });
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequest(),
                config: LOG_ONLY_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(logger.info).toHaveBeenCalledOnce();
            expect(logger.warn).not.toHaveBeenCalled();
        });

        it('cc-tv cookie path skips pipeline and does not emit log-only log', async () => {
            const request = new Request('https://storefront.example.com/action/test', {
                method: 'POST',
                headers: {
                    origin: 'https://storefront.example.com',
                    cookie: 'cc-tv=1',
                },
            });
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request,
                config: LOG_ONLY_CONFIG,
                turnstileToken: undefined,
                logger,
                actionName: 'test',
            });

            expect(result).toBe(true);
            expect(logger.info).not.toHaveBeenCalled();
            expect(mockVerifyTurnstileToken).not.toHaveBeenCalled();
        });

        it('includes errorCodes in log meta when bot detected', async () => {
            mockVerifyTurnstileToken.mockResolvedValue({
                success: false,
                errorCodes: ['timeout-or-duplicate'],
            });
            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequest(),
                config: LOG_ONLY_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            const [, meta] = logger.info.mock.calls[0];
            expect(meta).toHaveProperty('errorCodes', ['timeout-or-duplicate']);
        });

        it('includes metrics in log meta when platform is degraded', async () => {
            const metricsSnapshot = {
                sampleCount: 5,
                failureCount: 3,
                failureRate: 0.6,
                p95LatencyMs: 1000,
                currentVerdict: true,
            };
            mockGetSiteverifyMetricsSnapshot.mockReturnValue(metricsSnapshot);
            mockIsTurnstileDegraded.mockResolvedValue(true);

            const logger = mockLogger();

            await enforceTurnstile({
                request: makeRequest(),
                config: LOG_ONLY_CONFIG,
                turnstileToken: undefined,
                logger,
                actionName: 'test',
            });

            const [, meta] = logger.info.mock.calls[0];
            expect(meta).toHaveProperty('metrics', metricsSnapshot);
        });

        it('returns true when no origin/referer header in log-only mode', async () => {
            const request = new Request('https://storefront.example.com/action/test', {
                method: 'POST',
            });
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request,
                config: LOG_ONLY_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(result).toBe(true);
        });

        it('returns true when no site key match in log-only mode', async () => {
            mockGetTurnstileSiteKey.mockReturnValue(null);
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: LOG_ONLY_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(result).toBe(true);
        });

        it('returns true when no secret key configured in log-only mode', async () => {
            mockGetTurnstileSecretKey.mockReturnValue(null);
            const logger = mockLogger();

            const result = await enforceTurnstile({
                request: makeRequest(),
                config: LOG_ONLY_CONFIG,
                turnstileToken: 'token',
                logger,
                actionName: 'test',
            });

            expect(result).toBe(true);
        });
    });
});
