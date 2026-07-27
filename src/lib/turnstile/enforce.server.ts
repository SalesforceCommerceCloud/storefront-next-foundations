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

import type { AppConfig } from '@/types/config';
import { verifyTurnstileToken } from '@/lib/turnstile/verify.server';
import { getTurnstileSecretKey, getTurnstileSiteKey } from '@/lib/turnstile/utils';
import { getSiteverifyMetricsSnapshot, isTurnstileDegraded } from '@/lib/turnstile/health.server';
import { redactEmailForLog } from '@/lib/turnstile/log-redact.server';
import { COOKIE_TURNSTILE_VERIFIED } from '@/lib/turnstile/constants';

const INFRASTRUCTURE_ERROR_CODES = new Set(['internal-error']);
// Only HTTP 5xx from siteverify is a CF-side failure. 4xx codes (400/401/403/etc.) mean
// our request was malformed (bad secret, wrong content-type) — fail-closed so a
// misconfiguration cannot silently bypass verification.
const HTTP_INFRASTRUCTURE_ERROR_PATTERN = /^http-error-5\d{2}$/;

interface TurnstileEnforceLogger {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
}

interface EnforceTurnstileOptions {
    request: Request;
    config: AppConfig;
    turnstileToken: string | undefined;
    logger: TurnstileEnforceLogger;
    actionName: string;
    email?: string;
}

interface EnforcementOutcome {
    allowed: boolean;
    logLevel: 'debug' | 'warn';
    message: string;
    meta: Record<string, unknown>;
    /** Routing key for log-only mode — not included in enforce-mode log meta. */
    reason: string;
}

/**
 * Resolves the effective verification mode from config.
 *
 * `mode` takes precedence when set explicitly. Falls back to the legacy
 * `enabled` boolean so existing deployments continue to work unchanged:
 *   enabled=true  -> 'enforce'
 *   enabled=false -> 'disabled'
 */
export function resolveVerificationMode(config: AppConfig): 'enforce' | 'log-only' | 'disabled' {
    const explicit = config.security?.turnstile?.verification?.mode;
    if (explicit) return explicit;
    return config.security?.turnstile?.verification?.enabled ? 'enforce' : 'disabled';
}

/**
 * Runs the full verification pipeline and returns the outcome without logging
 * or returning early. Callers use the outcome to decide whether to enforce
 * or merely record the would-be decision (log-only mode).
 */
async function computeOutcome(
    options: EnforceTurnstileOptions & { siteKey: string; secretKey: string }
): Promise<EnforcementOutcome> {
    const { request, turnstileToken, actionName, email, secretKey } = options;

    // Email redaction: at scale (fail-open during a CF outage) raw emails accumulate as
    // PII in MRT logs. Redacted form keeps the domain visible (forensics signal — many
    // domains vs. single domain) and replaces the local-part with a stable hash so the
    // same shopper still correlates across log lines.
    const redactedEmail = redactEmailForLog(email);

    const remoteIp =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('cf-connecting-ip') ||
        undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    if (!turnstileToken) {
        const degraded = await isTurnstileDegraded();
        if (degraded) {
            return {
                allowed: true,
                logLevel: 'warn',
                reason: 'missing-token-degraded',
                message: '[Turnstile] Missing token — allowed (Turnstile platform degraded)',
                meta: {
                    email: redactedEmail,
                    remoteIp,
                    userAgent,
                    action: actionName,
                    metrics: getSiteverifyMetricsSnapshot(),
                },
            };
        }
        return {
            allowed: false,
            logLevel: 'warn',
            reason: 'missing-token',
            message: '[Turnstile] Missing token — blocked request without challenge completion',
            meta: {
                email: redactedEmail,
                remoteIp,
                userAgent,
                action: actionName,
            },
        };
    }

    const verification = await verifyTurnstileToken({
        token: turnstileToken,
        secretKey,
        remoteIp,
    });

    if (!verification.success) {
        const isInfrastructureError = verification.errorCodes.some(
            (code) => INFRASTRUCTURE_ERROR_CODES.has(code) || HTTP_INFRASTRUCTURE_ERROR_PATTERN.test(code)
        );

        if (isInfrastructureError) {
            return {
                allowed: true,
                logLevel: 'warn',
                reason: 'infrastructure-error',
                message: '[Turnstile] Verification failed due to infrastructure issue — allowed (fail-open)',
                meta: {
                    errorCodes: verification.errorCodes,
                    email: redactedEmail,
                    remoteIp,
                    userAgent,
                    action: actionName,
                    metrics: getSiteverifyMetricsSnapshot(),
                },
            };
        }

        return {
            allowed: false,
            logLevel: 'warn',
            reason: 'bot-detected',
            message: '[Turnstile] Verification failed — potential bot or replay attack',
            meta: {
                errorCodes: verification.errorCodes,
                email: redactedEmail,
                remoteIp,
                userAgent,
                action: actionName,
                hasToken: !!turnstileToken,
            },
        };
    }

    return {
        allowed: true,
        logLevel: 'debug',
        reason: 'passed',
        message: '[Turnstile] Verification passed',
        meta: {
            challengeTs: verification.challengeTs,
            action: actionName,
        },
    };
}

/**
 * Enforces Turnstile verification when enabled in config.
 *
 * Returns `true` if the request may proceed — either because verification is
 * disabled or because the token passed Cloudflare's siteverify check.
 *
 * Returns `false` if the request must be blocked (missing token, failed
 * verification, origin mismatch, etc.). The reason is logged at `warn` level
 * with the supplied `actionName` for traceability.
 *
 * In `log-only` mode the full verification pipeline still runs, but the
 * function always returns `true`. The would-be decision is logged at `info`
 * level with `would_block: true|false` so merchants can safely observe what
 * would happen in enforce mode before committing to it.
 */
export async function enforceTurnstile({
    request,
    config,
    turnstileToken,
    logger,
    actionName,
    email,
}: EnforceTurnstileOptions): Promise<boolean> {
    const mode = resolveVerificationMode(config);
    if (mode === 'disabled' || !config.security?.turnstile?.enabled) {
        return true;
    }

    // Skip when the cc-tv cookie has a non-empty value: this client cleared a Turnstile
    // challenge recently within the cookie's max-age. The cookie is httpOnly + Secure
    // and is set by /action/authorize-passwordless-email only after enforceTurnstile
    // previously returned true, so it is a soft "passed-recently" attestation (not a
    // signed token). This avoids re-challenging the shopper on subsequent
    // Turnstile-protected actions in the same checkout flow.
    const cookieHeader = request.headers.get('cookie') || '';
    const ccTvPresent = cookieHeader.split(';').some((c) => {
        const [name, ...rest] = c.trim().split('=');
        return name === COOKIE_TURNSTILE_VERIFIED && rest.join('=').length > 0;
    });
    if (ccTvPresent) {
        logger.debug('[Turnstile] Skipping verification - cc-tv cookie present', {
            action: actionName,
        });
        return true;
    }

    const requestUrl = request.headers.get('origin') || request.headers.get('referer') || '';

    if (!requestUrl) {
        logger.warn(
            '[Turnstile] No Origin or Referer header — cannot determine site key. Check reverse-proxy config.',
            {
                action: actionName,
                email: redactEmailForLog(email),
            }
        );
        return mode === 'log-only' ? true : false;
    }

    const siteKey = getTurnstileSiteKey(config, requestUrl);
    if (!siteKey) {
        logger.warn('[Turnstile] No site key match for request origin — blocked', {
            requestUrl,
            remoteIp:
                request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                request.headers.get('cf-connecting-ip') ||
                undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            email: redactEmailForLog(email),
            action: actionName,
        });
        return mode === 'log-only' ? true : false;
    }

    const secretKey = getTurnstileSecretKey(siteKey);
    if (!secretKey) {
        logger.warn('[Turnstile] No secret key configured for site — blocked', {
            siteKey,
            requestUrl,
            action: actionName,
        });
        return mode === 'log-only' ? true : false;
    }

    const outcome = await computeOutcome({
        request,
        config,
        turnstileToken,
        logger,
        actionName,
        email,
        siteKey,
        secretKey,
    });

    if (mode === 'log-only') {
        logger.info('[Turnstile] log-only — recording would-be decision', {
            mode: 'log-only',
            would_block: !outcome.allowed,
            reason: outcome.reason,
            action: actionName,
            siteKey,
            ...(outcome.meta.errorCodes !== undefined && { errorCodes: outcome.meta.errorCodes }),
            ...(outcome.meta.remoteIp !== undefined && { remoteIp: outcome.meta.remoteIp }),
            ...(outcome.meta.metrics !== undefined && { metrics: outcome.meta.metrics }),
        });
        return true;
    }

    // enforce mode: log at the outcome's level and return the actual decision
    logger[outcome.logLevel](outcome.message, outcome.meta);
    return outcome.allowed;
}
