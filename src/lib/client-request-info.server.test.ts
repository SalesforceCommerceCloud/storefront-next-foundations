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
import { getClientRequestInfo } from './client-request-info.server';

describe('getClientRequestInfo', () => {
    it('takes the first hop of x-forwarded-for', () => {
        const req = new Request('http://localhost/', {
            headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1', 'user-agent': 'UA' },
        });
        expect(getClientRequestInfo(req)).toEqual({ clientIp: '203.0.113.5', clientUserAgent: 'UA' });
    });

    it('falls back to cf-connecting-ip when x-forwarded-for is absent', () => {
        const req = new Request('http://localhost/', {
            headers: { 'cf-connecting-ip': '203.0.113.7', 'user-agent': 'UA' },
        });
        expect(getClientRequestInfo(req)).toEqual({ clientIp: '203.0.113.7', clientUserAgent: 'UA' });
    });

    it('returns undefined fields when both ip headers are absent', () => {
        const req = new Request('http://localhost/', { headers: { 'user-agent': 'UA' } });
        expect(getClientRequestInfo(req)).toEqual({ clientIp: undefined, clientUserAgent: 'UA' });
    });

    it('returns undefined user-agent when absent', () => {
        const req = new Request('http://localhost/');
        expect(getClientRequestInfo(req)).toEqual({ clientIp: undefined, clientUserAgent: undefined });
    });
});
