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
import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from 'vitest';
import { createComponentTestBed, TEST_PAGE } from '../../test/component-test-bed';
import { waitFor } from '@testing-library/react';

const TestComponent = ({ children }: React.PropsWithChildren) => <>{children}</>;

describe('PageDesignerPage', () => {
    const testBed = createComponentTestBed(() => ({}));

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('when in design mode', () => {
        let spy: Mock;

        beforeEach(() => {
            spy = vi.fn();
            testBed.state.mode = 'EDIT';
            testBed.afterHostCreated((host) => {
                host.on('ClientPageChanged', spy);
            });
        });

        it('should notify the host of the page change', async () => {
            await testBed.render(TestComponent);

            await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ page: TEST_PAGE })), {
                timeout: 1_000,
            });
        });
    });

    describe('when not in design mode', () => {
        let spy: Mock;

        beforeEach(() => {
            spy = vi.fn();
            testBed.state.mode = null;
            testBed.afterHostCreated((host) => {
                host.on('ClientPageChanged', spy);
            });
        });

        it('should not notify the host of the page change', async () => {
            await testBed.render(TestComponent);

            await expect(
                waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining(TEST_PAGE)), {
                    timeout: 100,
                })
            ).rejects.toThrow();
        });
    });
});
