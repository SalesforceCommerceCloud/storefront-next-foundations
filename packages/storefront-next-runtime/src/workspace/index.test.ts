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
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isWorkspaceEnvironment, getWorkspaceSlasOrgId } from './index';

describe('isWorkspaceEnvironment', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('returns false when no SFW_* vars are set', () => {
        vi.stubGlobal('window', undefined);
        vi.stubEnv('SFW_FALCON_INSTANCE', '');
        vi.stubEnv('SFW_SERVICE_INSTANCE', '');
        vi.stubEnv('SFW_LOCATION', '');
        expect(isWorkspaceEnvironment()).toBe(false);
    });

    it('returns true when SFW_FALCON_INSTANCE is set', () => {
        vi.stubGlobal('window', undefined);
        vi.stubEnv('SFW_FALCON_INSTANCE', 'aws-dev2');
        expect(isWorkspaceEnvironment()).toBe(true);
    });

    it('returns true when SFW_SERVICE_INSTANCE is set', () => {
        vi.stubGlobal('window', undefined);
        vi.stubEnv('SFW_SERVICE_INSTANCE', 'svc1');
        expect(isWorkspaceEnvironment()).toBe(true);
    });

    it('returns true when SFW_LOCATION is set', () => {
        vi.stubGlobal('window', undefined);
        vi.stubEnv('SFW_LOCATION', 'uswest2');
        expect(isWorkspaceEnvironment()).toBe(true);
    });

    it('returns false on client when window is defined', () => {
        vi.stubGlobal('window', {});
        vi.stubEnv('SFW_FALCON_INSTANCE', 'aws-dev2');
        expect(isWorkspaceEnvironment()).toBe(false);
    });
});

describe('getWorkspaceSlasOrgId', () => {
    it('strips f_ecom_ prefix', () => {
        expect(getWorkspaceSlasOrgId('f_ecom_zzzz_s01')).toBe('zzzz_s01');
    });

    it('returns as-is without prefix', () => {
        expect(getWorkspaceSlasOrgId('zzzz_s01')).toBe('zzzz_s01');
    });

    it('handles empty string', () => {
        expect(getWorkspaceSlasOrgId('')).toBe('');
    });
});
