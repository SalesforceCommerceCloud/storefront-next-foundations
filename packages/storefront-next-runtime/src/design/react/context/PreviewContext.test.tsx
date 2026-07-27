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
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useContext, type ReactNode } from 'react';
import { PreviewContext, PreviewProvider } from './PreviewContext';
import { createTestBed } from '../../test/test-bed';

// Test component that consumes the PreviewContext
const TestConsumer = () => {
    const { isPreviewMode } = useContext(PreviewContext);
    return <div data-testid="preview-mode">{isPreviewMode ? 'true' : 'false'}</div>;
};

describe('PreviewContext', () => {
    const testBed = createTestBed({
        renderer: (search: string, children?: ReactNode) => {
            testBed.defineProperty(window, 'location', {
                value: {
                    ...window.location,
                    search,
                },
            });

            return render(<PreviewProvider>{children ?? <TestConsumer />}</PreviewProvider>);
        },
    });

    afterEach(() => {
        vi.clearAllMocks();
        cleanup();
    });

    describe('PreviewProvider', () => {
        it('should provide isPreviewMode as false when preview mode is not active', async () => {
            const { getByTestId } = await testBed.render('');

            expect(getByTestId('preview-mode').textContent).toBe('false');
        });

        it('should provide isPreviewMode as false when mode is not PREVIEW', async () => {
            const { getByTestId } = await testBed.render('?mode=EDIT');

            expect(getByTestId('preview-mode').textContent).toBe('false');
        });

        it('should provide isPreviewMode as true when preview mode is active', async () => {
            const { getByTestId } = await testBed.render('?mode=PREVIEW');

            expect(getByTestId('preview-mode').textContent).toBe('true');
        });

        it('should provide isPreviewMode as true when mode=PREVIEW is in query string with other params', async () => {
            const { getByTestId } = await testBed.render('?foo=bar&mode=PREVIEW&baz=qux');

            expect(getByTestId('preview-mode').textContent).toBe('true');
        });

        it('should render children correctly', async () => {
            const { getByTestId } = await testBed.render('', <div data-testid="child">Child Content</div>);

            expect(getByTestId('child').textContent).toBe('Child Content');
        });
    });
});
