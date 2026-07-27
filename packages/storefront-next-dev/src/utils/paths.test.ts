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
import { afterEach, describe, expect, it } from 'vitest';
import { getBasePath, getBundlePath, getCommerceCloudApiUrl } from './paths';

describe('getCommerceCloudApiUrl', () => {
    it('should construct correct API URL', () => {
        const url = getCommerceCloudApiUrl('test-code');

        expect(url).toBe('https://test-code.api.commercecloud.salesforce.com');
    });

    it('should handle different short codes', () => {
        const url = getCommerceCloudApiUrl('production-123');

        expect(url).toBe('https://production-123.api.commercecloud.salesforce.com');
    });

    it('should return proxyHost when provided', () => {
        const url = getCommerceCloudApiUrl('test-code', 'https://scw:25010');

        expect(url).toBe('https://scw:25010');
    });

    it('should fall back to constructed URL when proxyHost is undefined', () => {
        const url = getCommerceCloudApiUrl('test-code', undefined);

        expect(url).toBe('https://test-code.api.commercecloud.salesforce.com');
    });
});

describe('getBasePath', () => {
    afterEach(() => {
        delete process.env.MRT_ENV_BASE_PATH;
    });

    it('should return empty string when MRT_ENV_BASE_PATH is not set', () => {
        expect(getBasePath()).toBe('');
    });

    it('should return empty string when MRT_ENV_BASE_PATH is empty', () => {
        process.env.MRT_ENV_BASE_PATH = '';
        expect(getBasePath()).toBe('');
    });

    it('should return empty string when MRT_ENV_BASE_PATH is whitespace', () => {
        process.env.MRT_ENV_BASE_PATH = '   ';
        expect(getBasePath()).toBe('');
    });

    it('should return valid base path', () => {
        process.env.MRT_ENV_BASE_PATH = '/shop';
        expect(getBasePath()).toBe('/shop');
    });

    it('should throw when leading slash is missing', () => {
        process.env.MRT_ENV_BASE_PATH = 'shop';
        expect(() => getBasePath()).toThrow('Invalid base path');
    });

    it('should throw on trailing slashes', () => {
        process.env.MRT_ENV_BASE_PATH = '/shop/';
        expect(() => getBasePath()).toThrow('Invalid base path');
    });

    it('should trim whitespace', () => {
        process.env.MRT_ENV_BASE_PATH = '  /shop  ';
        expect(getBasePath()).toBe('/shop');
    });

    it('should allow URL-safe characters', () => {
        process.env.MRT_ENV_BASE_PATH = '/site-a_1.0';
        expect(getBasePath()).toBe('/site-a_1.0');
    });

    it('should allow special URL-safe symbols', () => {
        process.env.MRT_ENV_BASE_PATH = '/site+$~"\'@:';
        expect(getBasePath()).toBe('/site+$~"\'@:');
    });

    it('should throw on multiple path segments', () => {
        process.env.MRT_ENV_BASE_PATH = '/shop/storefront';
        expect(() => getBasePath()).toThrow('Invalid base path');
    });

    it('should throw when segment exceeds 63 characters', () => {
        process.env.MRT_ENV_BASE_PATH = `/${'a'.repeat(64)}`;
        expect(() => getBasePath()).toThrow('Invalid base path');
    });

    it('should allow segment of exactly 63 characters', () => {
        const segment = 'a'.repeat(63);
        process.env.MRT_ENV_BASE_PATH = `/${segment}`;
        expect(getBasePath()).toBe(`/${segment}`);
    });

    it('should throw on invalid characters', () => {
        process.env.MRT_ENV_BASE_PATH = '/shop#page';
        expect(() => getBasePath()).toThrow('Invalid base path');
    });

    it('should throw on path with spaces in segment', () => {
        process.env.MRT_ENV_BASE_PATH = '/my shop';
        expect(() => getBasePath()).toThrow('Invalid base path');
    });
});

describe('getBundlePath', () => {
    it('should construct correct bundle path', () => {
        const bundleId = 'test-bundle-123';
        const path = getBundlePath(bundleId);

        expect(path).toBe('/mobify/bundle/test-bundle-123/client/');
    });

    it('should handle different bundle IDs', () => {
        const bundleId = 'production-bundle-456';
        const path = getBundlePath(bundleId);

        expect(path).toBe('/mobify/bundle/production-bundle-456/client/');
    });

    it('should handle bundle IDs with special characters', () => {
        const bundleId = 'bundle-v1.2.3-beta';
        const path = getBundlePath(bundleId);

        expect(path).toBe('/mobify/bundle/bundle-v1.2.3-beta/client/');
    });
});
