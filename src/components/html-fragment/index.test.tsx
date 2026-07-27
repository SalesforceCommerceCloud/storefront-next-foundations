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

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { createRoutesStub } from 'react-router';
import HtmlFragment from '.';
import { HTML_CONTENT_STYLES } from './styles';
import { mockConfig } from '@/test-utils/config';

vi.mock('@salesforce/storefront-next-runtime/config', () => ({
    useConfig: () => mockConfig,
}));

const renderHtmlFragment = (props: React.ComponentProps<typeof HtmlFragment>) => {
    const Stub = createRoutesStub([
        {
            path: '/test',
            Component: () => <HtmlFragment {...props} />,
        },
    ]);
    return render(<Stub initialEntries={['/test']} />);
};

describe('HtmlFragment', () => {
    test('renders plain text content', () => {
        renderHtmlFragment({ content: 'A premium quality product.' });

        expect(screen.getByText('A premium quality product.')).toBeInTheDocument();
    });

    test('renders HTML content', () => {
        renderHtmlFragment({
            content: '<ul><li>Premium cotton blend</li><li>Machine washable</li></ul>',
            contentType: 'bulleted-list',
        });

        expect(screen.getByText('Premium cotton blend')).toBeInTheDocument();
        expect(screen.getByText('Machine washable')).toBeInTheDocument();
    });

    test('applies plain-text styles by default', () => {
        renderHtmlFragment({ content: 'Some text' });

        expect(screen.getByTestId('html-fragment').className).toBe(HTML_CONTENT_STYLES['plain-text']);
    });

    test('applies bulleted-list styles when contentType is bulleted-list', () => {
        renderHtmlFragment({
            content: '<ul><li>Item</li></ul>',
            contentType: 'bulleted-list',
        });

        expect(screen.getByTestId('html-fragment').className).toBe(HTML_CONTENT_STYLES['bulleted-list']);
    });

    test('applies table-2-column styles when contentType is table-2-column', () => {
        renderHtmlFragment({
            content: '<table><tr><td>Key:</td><td>Value</td></tr></table>',
            contentType: 'table-2-column',
        });

        expect(screen.getByTestId('html-fragment').className).toBe(HTML_CONTENT_STYLES['table-2-column']);
    });

    test('className override takes precedence over contentType', () => {
        const customClassName = 'custom-class text-sm';
        const { container } = renderHtmlFragment({
            content: '<ul><li>Item</li></ul>',
            contentType: 'bulleted-list',
            className: customClassName,
        });

        const contentDiv = container.querySelector('.custom-class');
        expect(contentDiv).toBeInTheDocument();
        expect(contentDiv).toHaveClass('text-sm');
    });

    test('renders empty content gracefully', () => {
        renderHtmlFragment({ content: '' });

        expect(screen.getByTestId('html-fragment').textContent).toBe('');
    });

    test('renders plain text when contentType is bulleted-list', () => {
        renderHtmlFragment({
            content: 'Just a plain string, no list markup',
            contentType: 'bulleted-list',
        });

        expect(screen.getByText('Just a plain string, no list markup')).toBeInTheDocument();
    });

    test('renders plain text when contentType is table-2-column', () => {
        renderHtmlFragment({
            content: 'Just a plain string, no table markup',
            contentType: 'table-2-column',
        });

        expect(screen.getByText('Just a plain string, no table markup')).toBeInTheDocument();
    });
});
