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
import { mainPaddingDataAttributes } from './page-ui-config';

describe('mainPaddingDataAttributes', () => {
    it('emits data-has-top-padding="true" when main.hasTopPadding is set', () => {
        expect(mainPaddingDataAttributes({ main: { hasTopPadding: true } })).toEqual({
            'data-has-top-padding': 'true',
            'data-hero-bleed': 'false',
        });
    });

    it('emits data-hero-bleed="true" when header.transparentOnLoad is set', () => {
        expect(mainPaddingDataAttributes({ header: { transparentOnLoad: true } })).toEqual({
            'data-has-top-padding': 'false',
            'data-hero-bleed': 'true',
        });
    });

    it('emits both attributes (always present, deterministic SSR output) when unset', () => {
        // Both keys are always emitted so the served HTML is stable and SPA
        // navigations flip the value on an existing attribute (no add/remove
        // churn that could reflow). Default is the safe "false"/"false".
        expect(mainPaddingDataAttributes({})).toEqual({
            'data-has-top-padding': 'false',
            'data-hero-bleed': 'false',
        });
    });

    it('reflects both flags together when both are set', () => {
        expect(
            mainPaddingDataAttributes({
                header: { transparentOnLoad: true },
                main: { hasTopPadding: true },
            })
        ).toEqual({
            'data-has-top-padding': 'true',
            'data-hero-bleed': 'true',
        });
    });
});
