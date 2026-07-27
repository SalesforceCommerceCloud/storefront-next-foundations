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

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import CollapsibleHtmlSection from './collapsible-html-section';
import { HTML_CONTENT_STYLES } from '@/components/html-fragment/styles';
import { mockConfig } from '@/test-utils/config';

vi.mock('@salesforce/storefront-next-runtime/config', () => ({
    useConfig: () => mockConfig,
}));

/** Click the summary and wait for all React effects to flush. */
const openSection = (container: HTMLElement): Promise<void> =>
    act(async () => {
        fireEvent.click(container.querySelector('summary') as HTMLElement);
        await Promise.resolve();
    });

describe('CollapsibleHtmlSection', () => {
    describe('label', () => {
        test('renders the label text in the summary', () => {
            render(<CollapsibleHtmlSection label="Description:" content="Some content" />);

            expect(screen.getByText('Description:')).toBeInTheDocument();
        });
    });

    describe('content', () => {
        test('renders plain text content via HtmlFragment after opening', async () => {
            const { container } = render(<CollapsibleHtmlSection label="Section" content="A premium product." />);

            await openSection(container);

            expect(screen.getByText('A premium product.')).toBeInTheDocument();
        });

        test('renders HTML content via HtmlFragment after opening', async () => {
            const { container } = render(
                <CollapsibleHtmlSection
                    label="Section"
                    content="<ul><li>Feature one</li><li>Feature two</li></ul>"
                    contentType="bulleted-list"
                />
            );

            await openSection(container);

            expect(screen.getByText('Feature one')).toBeInTheDocument();
            expect(screen.getByText('Feature two')).toBeInTheDocument();
        });
    });

    describe('contentType', () => {
        test('applies plain-text styles when contentType is not provided', async () => {
            const { container } = render(<CollapsibleHtmlSection label="Section" content="Some text" />);

            await openSection(container);

            expect(screen.getByTestId('html-fragment').className).toBe(HTML_CONTENT_STYLES['plain-text']);
        });

        test('applies bulleted-list styles when contentType is bulleted-list', async () => {
            const { container } = render(
                <CollapsibleHtmlSection label="Section" content="<ul><li>Item</li></ul>" contentType="bulleted-list" />
            );

            await openSection(container);

            expect(screen.getByTestId('html-fragment').className).toBe(HTML_CONTENT_STYLES['bulleted-list']);
        });

        test('applies table-2-column styles when contentType is table-2-column', async () => {
            const { container } = render(
                <CollapsibleHtmlSection
                    label="Section"
                    content="<table><tr><td>Key:</td><td>Value</td></tr></table>"
                    contentType="table-2-column"
                />
            );

            await openSection(container);

            expect(screen.getByTestId('html-fragment').className).toBe(HTML_CONTENT_STYLES['table-2-column']);
        });
    });

    describe('defaultOpen', () => {
        test('is closed by default when defaultOpen is not provided', () => {
            const { container } = render(<CollapsibleHtmlSection label="Section" content="content" />);

            expect(container.querySelector('details')).not.toHaveAttribute('open');
        });

        test('is open when defaultOpen is true', () => {
            const { container } = render(<CollapsibleHtmlSection label="Section" content="content" defaultOpen />);

            expect(container.querySelector('details')).toHaveAttribute('open');
        });
    });

    describe('className', () => {
        test('forwards className to the underlying CollapsibleSection', () => {
            const { container } = render(
                <CollapsibleHtmlSection label="Section" content="content" className="mt-6 custom-class" />
            );

            const details = container.querySelector('details');
            expect(details).toHaveClass('mt-6');
            expect(details).toHaveClass('custom-class');
        });
    });
});
