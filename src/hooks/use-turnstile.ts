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
 * useTurnstile Hook
 * Feature Spec: e2e/feature-specs/checkout/turnstile-protection.spec.md
 *
 * Manages Cloudflare Turnstile widget lifecycle and token state
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const TURNSTILE_SCRIPT_ID = 'turnstile-script';

export type TurnstileStatus = 'idle' | 'loading' | 'success' | 'error' | 'expired';

export interface TurnstileState {
    token: string | null;
    status: TurnstileStatus;
    error: string | null;
}

export interface TurnstileCallbacks {
    onSuccess?: (token: string) => void;
    onError?: (error: string) => void;
    onExpire?: () => void;
}

export interface UseTurnstileOptions extends TurnstileCallbacks {
    siteKey: string;
    enabled?: boolean;
}

export interface UseTurnstileReturn extends TurnstileState {
    reset: () => void;
    getToken: () => string | null;
}

/**
 * useTurnstile hook for managing Turnstile widget state
 *
 * @param options - Configuration options including siteKey and callbacks
 * @returns Turnstile state and control methods
 */
export function useTurnstile({
    siteKey,
    enabled = true,
    onSuccess,
    onError,
    onExpire,
}: UseTurnstileOptions): UseTurnstileReturn {
    const [state, setState] = useState<TurnstileState>({
        token: null,
        status: 'idle',
        error: null,
    });

    const widgetIdRef = useRef<string | null>(null);
    const scriptLoadedRef = useRef<boolean>(false);

    const reset = useCallback(() => {
        setState({
            token: null,
            status: 'idle',
            error: null,
        });

        if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
        }
    }, []);

    const getToken = useCallback(() => {
        return state.token;
    }, [state.token]);

    useEffect(() => {
        if (!enabled || !siteKey) {
            if (!siteKey && enabled) {
                setState({
                    token: null,
                    status: 'error',
                    error: 'Turnstile site key is missing',
                });
            }
            return;
        }

        // Check if script already loaded
        if (scriptLoadedRef.current || document.getElementById(TURNSTILE_SCRIPT_ID)) {
            return;
        }

        setState((prev) => ({ ...prev, status: 'loading' }));

        // Load Turnstile script
        const script = document.createElement('script');
        script.id = TURNSTILE_SCRIPT_ID;
        script.src = TURNSTILE_SCRIPT_URL;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            scriptLoadedRef.current = true;
        };

        script.onerror = () => {
            const errorMsg = 'Failed to load Turnstile script';
            setState({
                token: null,
                status: 'error',
                error: errorMsg,
            });
            if (onError) {
                onError(errorMsg);
            }
        };

        document.head.appendChild(script);

        // Cleanup
        return () => {
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
    }, [enabled, siteKey, onError, onSuccess, onExpire]);

    return {
        ...state,
        reset,
        getToken,
    };
}

// Extend Window interface for Turnstile
declare global {
    interface Window {
        turnstile?: {
            render: (
                container: string | HTMLElement,
                options: {
                    sitekey: string;
                    callback?: (token: string) => void;
                    /**
                     * Fires on widget errors. The errorCode argument distinguishes failure
                     * families: 200xxx/500xxx (CDN/iframe load), 300xxx/600xxx (bot detection),
                     * 110xxx (challenge timed out). Cloudflare confirms this argument is part of
                     * the public API.
                     */
                    'error-callback'?: (errorCode: string) => void;
                    'expired-callback'?: () => void;
                    /** Fires when an interactive challenge times out without a response. */
                    'timeout-callback'?: () => void;
                    /** Fires before an interactive challenge UI is shown. Documented since 2023-04-17. */
                    'before-interactive-callback'?: () => void;
                    /** Fires after an interactive challenge has been resolved. Documented since 2023-04-17. */
                    'after-interactive-callback'?: () => void;
                    /**
                     * Controls the widget's behavior when a challenge times out or expires.
                     * 'auto' lets Cloudflare reset the widget on the documented schedule, replacing
                     * any caller-side timers. 'manual' / 'never' leave reset entirely to the caller.
                     */
                    'refresh-timeout'?: 'auto' | 'manual' | 'never';
                    appearance?: 'always' | 'execute' | 'interaction-only';
                    execution?: 'render' | 'execute';
                    theme?: 'light' | 'dark' | 'auto';
                    size?: 'normal' | 'compact';
                }
            ) => string;
            execute: (widgetId: string) => void;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
            getResponse: (widgetId: string) => string;
        };
    }
}
