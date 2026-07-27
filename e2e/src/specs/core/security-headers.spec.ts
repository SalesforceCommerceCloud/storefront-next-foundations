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

Feature('Security Response Headers').tag('@core').tag('@security');

const { securityHeadersPage } = inject();
import { expect } from 'chai';

Scenario('homepage response includes default security headers', async () => {
    const headers = await securityHeadersPage.grabHomepageHeaders();

    expect(headers['content-security-policy'], 'CSP header should be present').to.be.a('string');
    expect(headers['x-content-type-options'], 'X-Content-Type-Options').to.equal('nosniff');
    expect(headers['x-frame-options'], 'X-Frame-Options').to.equal('SAMEORIGIN');
    expect(headers['referrer-policy'], 'Referrer-Policy').to.equal('strict-origin-when-cross-origin');
    expect(headers['permissions-policy'], 'Permissions-Policy should be present').to.be.a('string');
    expect(headers['content-security-policy'], 'CSP must include a per-request nonce on script-src').to.match(
        /'nonce-[A-Za-z0-9+/=]{24}'/
    );
});

export {};
