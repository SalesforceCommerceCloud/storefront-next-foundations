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

import { describe, expect, it } from 'vitest';
import { __TEST_ONLY__ } from './login-prefs-stub';

const { encodeAuthorizePasswordlessEmailResponse } = __TEST_ONLY__;

describe('encodeAuthorizePasswordlessEmailResponse', () => {
    it('encodes the OTP branch as data({success: true, email})', () => {
        const out = encodeAuthorizePasswordlessEmailResponse('otp', 'shopper@example.com');
        expect(out).toBe('[{"_1":2},"data",{"_3":4,"_5":6},"success",true,"email","shopper@example.com"]\n');
    });

    it('encodes the loginModal branch as data({success: false, requiresLogin: true, email})', () => {
        const out = encodeAuthorizePasswordlessEmailResponse('loginModal', 'shopper@example.com');
        expect(out).toBe(
            '[{"_1":2},"data",{"_3":4,"_5":6,"_7":8},"success",false,"requiresLogin",true,"email","shopper@example.com"]\n'
        );
    });

    it('encodes the guest branch as data({success: false, email})', () => {
        const out = encodeAuthorizePasswordlessEmailResponse('guest', 'shopper@example.com');
        expect(out).toBe('[{"_1":2},"data",{"_3":4,"_5":6},"success",false,"email","shopper@example.com"]\n');
    });

    it('escapes special characters in email', () => {
        const out = encodeAuthorizePasswordlessEmailResponse('otp', 'a"b@example.com');
        expect(out).toContain('"a\\"b@example.com"');
    });
});
