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
import { generateNonce } from './nonce';

describe('generateNonce', () => {
    it('produces a 24-character base64 string for 16 bytes of entropy', () => {
        const nonce = generateNonce();
        expect(nonce).toHaveLength(24);
        expect(nonce).toMatch(/^[A-Za-z0-9+/=]{24}$/);
    });

    it('produces unique nonces across many invocations', () => {
        const set = new Set<string>();
        for (let i = 0; i < 1000; i++) set.add(generateNonce());
        expect(set.size).toBe(1000);
    });

    it('produces unique nonces under concurrent invocation', async () => {
        const nonces = await Promise.all(Array.from({ length: 100 }, () => Promise.resolve(generateNonce())));
        expect(new Set(nonces).size).toBe(100);
    });
});
