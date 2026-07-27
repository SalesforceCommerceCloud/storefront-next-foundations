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

/**
 * Server-side Turnstile token verification via Cloudflare's siteverify API.
 *
 * Every call records its outcome via `recordSiteverifyOutcome` so the health module can
 * compute a real-traffic failure rate (the primary fail-open signal).
 */

import { recordSiteverifyOutcome } from './health.server';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 5000;

export interface TurnstileVerifyResult {
    success: boolean;
    challengeTs?: string;
    hostname?: string;
    errorCodes: string[];
    action?: string;
}

export interface VerifyTurnstileOptions {
    token: string;
    secretKey: string;
    remoteIp?: string;
}

export async function verifyTurnstileToken(options: VerifyTurnstileOptions): Promise<TurnstileVerifyResult> {
    const { token, secretKey, remoteIp } = options;

    if (!token || !secretKey) {
        return {
            success: false,
            errorCodes: [!token ? 'missing-input-response' : 'missing-input-secret'],
        };
    }

    const body = new URLSearchParams({
        secret: secretKey,
        response: token,
    });

    if (remoteIp) {
        body.set('remoteip', remoteIp);
    }

    const startedAt = Date.now();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

        const response = await fetch(SITEVERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            // HTTP 5xx is a CF-side failure; 4xx is our problem (bad secret, etc.).
            recordSiteverifyOutcome(response.status >= 500, Date.now() - startedAt);
            return {
                success: false,
                errorCodes: [`http-error-${response.status}`],
            };
        }

        const data = await response.json();
        const errorCodes: string[] = data['error-codes'] || [];

        // Only `internal-error` indicates a CF-side failure; other error codes
        // (invalid-input-response, timeout-or-duplicate, etc.) reflect a working service
        // that correctly rejected a bad request.
        recordSiteverifyOutcome(errorCodes.includes('internal-error'), Date.now() - startedAt);

        return {
            success: data.success === true,
            challengeTs: data.challenge_ts,
            hostname: data.hostname,
            errorCodes,
            action: data.action,
        };
    } catch (error: unknown) {
        // Network failures and timeouts are CF-side from our perspective.
        recordSiteverifyOutcome(true, Date.now() - startedAt);

        if (error instanceof Error && error.name === 'AbortError') {
            return {
                success: false,
                errorCodes: ['internal-error'],
            };
        }

        return {
            success: false,
            errorCodes: ['internal-error'],
        };
    }
}
