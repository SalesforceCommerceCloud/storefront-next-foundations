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
 * Turnstile error code families (per Cloudflare documentation).
 * Used to distinguish infrastructure failures from genuine bot-detection or auth issues.
 *
 * Lives in its own module so the widget file can stay component-only (Vite fast-refresh
 * lints non-component exports in component files).
 */
export const TURNSTILE_ERROR_FAMILY = {
    /** 200xxx and 500xxx - CDN unreachable, iframe load failure, infrastructure issue. */
    INFRASTRUCTURE: 'infrastructure',
    /** 300xxx and 600xxx - bot detection / challenge solve failure. */
    BOT_DETECTION: 'bot-detection',
    /** 110xxx - interactive challenge timed out. */
    TIMEOUT: 'timeout',
    /** Anything else (auth, configuration, etc.). */
    OTHER: 'other',
} as const;

export type TurnstileErrorFamily = (typeof TURNSTILE_ERROR_FAMILY)[keyof typeof TURNSTILE_ERROR_FAMILY];

export function classifyTurnstileErrorCode(errorCode: string): TurnstileErrorFamily {
    if (errorCode.startsWith('200') || errorCode.startsWith('500')) {
        return TURNSTILE_ERROR_FAMILY.INFRASTRUCTURE;
    }
    if (errorCode.startsWith('300') || errorCode.startsWith('600')) {
        return TURNSTILE_ERROR_FAMILY.BOT_DETECTION;
    }
    if (errorCode.startsWith('110')) {
        return TURNSTILE_ERROR_FAMILY.TIMEOUT;
    }
    return TURNSTILE_ERROR_FAMILY.OTHER;
}
