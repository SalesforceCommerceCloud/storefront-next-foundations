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

import { describe, it, expect } from 'vitest';
import { COOKIE_TURNSTILE_VERIFIED, TURNSTILE_VERIFIED_MAX_AGE } from './constants';

describe('turnstile constants', () => {
    it('cookie name is the short name expected by reverse proxies and MRT', () => {
        expect(COOKIE_TURNSTILE_VERIFIED).toBe('cc-tv');
    });

    it('TTL is 30 minutes (in seconds, suitable for Set-Cookie Max-Age)', () => {
        expect(TURNSTILE_VERIFIED_MAX_AGE).toBe(30 * 60);
        expect(TURNSTILE_VERIFIED_MAX_AGE).toBe(1800);
    });
});
