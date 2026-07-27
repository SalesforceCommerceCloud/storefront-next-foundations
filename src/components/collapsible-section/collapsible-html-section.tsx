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

import type { ReactElement } from 'react';
import type { HtmlContentType } from '@/components/html-fragment/types';
import CollapsibleSection from '.';
import HtmlFragment from '@/components/html-fragment';

interface CollapsibleHtmlSectionProps {
    /** The label rendered inside the summary row */
    label: string;
    /** HTML or plain text content rendered by HtmlFragment */
    content: string;
    /** Declares the expected HTML structure, used to resolve default styling */
    contentType?: HtmlContentType;
    /** Whether the section starts open. Defaults to false. */
    defaultOpen?: boolean;
    /** Additional classes forwarded to the outer <details> element */
    className?: string;
}

/**
 * A collapsible section whose body is rendered via HtmlFragment.
 * Composes CollapsibleSection with HtmlFragment for HTML/rich-text content.
 */
export default function CollapsibleHtmlSection({
    label,
    content,
    contentType,
    defaultOpen,
    className,
}: CollapsibleHtmlSectionProps): ReactElement {
    return (
        <CollapsibleSection label={label} defaultOpen={defaultOpen} className={className}>
            <HtmlFragment content={content} contentType={contentType} />
        </CollapsibleSection>
    );
}
