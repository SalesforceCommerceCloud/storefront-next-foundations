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
import { describe, it, expect, afterEach } from 'vitest';
import { isRemote } from './index';

describe('isRemote', () => {
    const origBundleId = process.env.BUNDLE_ID;

    afterEach(() => {
        if (origBundleId === undefined) {
            delete process.env.BUNDLE_ID;
        } else {
            process.env.BUNDLE_ID = origBundleId;
        }
    });

    it('returns false when BUNDLE_ID is unset (local dev)', () => {
        delete process.env.BUNDLE_ID;
        expect(isRemote()).toBe(false);
    });

    it('returns false when BUNDLE_ID is empty', () => {
        process.env.BUNDLE_ID = '';
        expect(isRemote()).toBe(false);
    });

    it("returns false when BUNDLE_ID is 'local' (pnpm preview)", () => {
        process.env.BUNDLE_ID = 'local';
        expect(isRemote()).toBe(false);
    });

    it('returns true when BUNDLE_ID is a real deployed bundle id', () => {
        process.env.BUNDLE_ID = '42';
        expect(isRemote()).toBe(true);
    });

    it('reads BUNDLE_ID at call time, not import time', () => {
        delete process.env.BUNDLE_ID;
        expect(isRemote()).toBe(false);
        process.env.BUNDLE_ID = 'abc123';
        expect(isRemote()).toBe(true);
    });
});
