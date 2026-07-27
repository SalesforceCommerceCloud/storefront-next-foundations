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
import { createComponentTestBed } from '../../test/component-test-bed';
import { fireEvent, waitFor } from '@testing-library/react';

const TestComponent = ({ children }: React.PropsWithChildren) => <>{children}</>;

describe('scroll interaction', () => {
    const testBed = createComponentTestBed(() => ({}));

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('when the window scroll change comes from the host', () => {
        beforeEach(() => {
            vi.spyOn(window, 'scrollTo');
            testBed.afterRender(({ host }) => {
                host.notifyWindowScrollChanged({ scrollY: 100 });
            });
        });

        it('should scroll the window to the new scroll position', async () => {
            await testBed.render(TestComponent);

            // Events are dispatched asynchronously, so we need to wait for the scroll to be applied.
            await waitFor(
                () =>
                    expect(window.scrollTo).toHaveBeenCalledWith({
                        behavior: 'instant',
                        top: 100,
                    }),
                { timeout: 1_000 }
            );
        });
    });

    describe('when the window scrolls in the client', () => {
        let spy: Mock;

        beforeEach(() => {
            spy = vi.fn();
            testBed.defineProperty(window, 'scrollX', { value: 100 });
            testBed.defineProperty(window, 'scrollY', { value: 200 });
            testBed.afterHostCreated((host) => {
                host.on('WindowScrollChanged', spy);
            });
            testBed.afterRender(() => {
                fireEvent.scroll(window);
            });
        });

        it('should scroll the window to the new scroll position', async () => {
            await testBed.render(TestComponent);

            // Events are dispatched asynchronously, so we need to wait for the scroll to be applied.
            await waitFor(
                () => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ scrollX: 100, scrollY: 200 })),
                { timeout: 1_000 }
            );
        });
    });
});
