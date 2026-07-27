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
import storefrontNextTargets, { type StorefrontNextTargetsConfig } from './index';

describe('index', () => {
    it('should export the storefrontNextTargets function', () => {
        expect(storefrontNextTargets).toBeDefined();
        expect(typeof storefrontNextTargets).toBe('function');
    });

    it('should return an array of targets', () => {
        const targets = storefrontNextTargets();
        expect(Array.isArray(targets)).toBe(true);
    });

    it('should return targets with default config', () => {
        const targets = storefrontNextTargets();
        expect(targets.length).toBeGreaterThan(0);
        targets.forEach((target) => {
            expect(target).toHaveProperty('name');
        });
    });

    it('should accept StorefrontNextTargetsConfig type', () => {
        const config: StorefrontNextTargetsConfig = {
            readableChunkNames: true,
        };
        const targets = storefrontNextTargets(config);
        expect(targets.length).toBeGreaterThan(0);
    });
});
