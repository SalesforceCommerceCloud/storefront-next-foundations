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

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getSiteId } from './site-id';

describe('getSiteId', () => {
    let saved: string | undefined;

    beforeEach(() => {
        saved = process.env.SITE_ID;
    });

    afterEach(() => {
        if (saved === undefined) delete process.env.SITE_ID;
        else process.env.SITE_ID = saved;
    });

    it('returns the override when one is provided', () => {
        process.env.SITE_ID = 'EnvSite';
        expect(getSiteId('OverrideSite')).toBe('OverrideSite');
    });

    it('returns process.env.SITE_ID when no override is provided', () => {
        process.env.SITE_ID = 'EnvSite';
        expect(getSiteId()).toBe('EnvSite');
    });

    it('falls back to RefArchGlobal when neither override nor SITE_ID is set', () => {
        delete process.env.SITE_ID;
        expect(getSiteId()).toBe('RefArchGlobal');
    });

    it('falls back to RefArchGlobal when override is empty string', () => {
        delete process.env.SITE_ID;
        expect(getSiteId('')).toBe('RefArchGlobal');
    });

    it('falls back to RefArchGlobal when override is undefined and SITE_ID is empty', () => {
        process.env.SITE_ID = '';
        expect(getSiteId(undefined)).toBe('RefArchGlobal');
    });
});
