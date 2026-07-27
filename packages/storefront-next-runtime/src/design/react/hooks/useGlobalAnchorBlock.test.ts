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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGlobalAnchorBlock } from './useGlobalAnchorBlock';

describe('useGlobalAnchorBlock', () => {
    let mockAnchorElement: HTMLAnchorElement;
    let mockParentElement: HTMLDivElement;
    let preventDefaultSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // Create mock DOM elements
        mockAnchorElement = document.createElement('a');
        mockAnchorElement.href = 'https://example.com';
        mockParentElement = document.createElement('div');
        mockParentElement.appendChild(mockAnchorElement);
        document.body.appendChild(mockParentElement);

        // Spy on preventDefault
        preventDefaultSpy = vi.spyOn(Event.prototype, 'preventDefault');
    });

    afterEach(() => {
        vi.clearAllMocks();
        // Clean up DOM
        document.body.removeChild(mockParentElement);
    });

    it('should prevent default click behavior on anchor elements by default', () => {
        const { unmount } = renderHook(() => useGlobalAnchorBlock());

        // Create a click event on the anchor element
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
        });

        // Dispatch the click event
        mockAnchorElement.dispatchEvent(clickEvent);

        expect(preventDefaultSpy).toHaveBeenCalled();

        unmount();
    });

    it('should not prevent default click behavior when anchor has data-pd-allow-link attribute', () => {
        mockAnchorElement.setAttribute('data-pd-allow-link', '');

        const { unmount } = renderHook(() => useGlobalAnchorBlock());

        // Create a click event on the anchor element
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
        });

        // Dispatch the click event
        mockAnchorElement.dispatchEvent(clickEvent);

        expect(preventDefaultSpy).not.toHaveBeenCalled();

        unmount();
    });

    it('should handle clicks on child elements of anchor tags', () => {
        const childSpan = document.createElement('span');
        childSpan.textContent = 'Click me';
        mockAnchorElement.appendChild(childSpan);

        const { unmount } = renderHook(() => useGlobalAnchorBlock());

        // Create a click event on the child element
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
        });
        Object.defineProperty(clickEvent, 'target', {
            value: childSpan,
            enumerable: true,
        });

        // Dispatch the click event on the child element
        childSpan.dispatchEvent(clickEvent);

        expect(preventDefaultSpy).toHaveBeenCalled();

        unmount();
    });

    it('should not prevent default for child elements of anchor with data-pd-allow-link', () => {
        const childSpan = document.createElement('span');
        childSpan.textContent = 'Click me';
        mockAnchorElement.appendChild(childSpan);
        mockAnchorElement.setAttribute('data-pd-allow-link', '');

        const { unmount } = renderHook(() => useGlobalAnchorBlock());

        // Create a click event on the child element
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
        });
        Object.defineProperty(clickEvent, 'target', {
            value: childSpan,
            enumerable: true,
        });

        // Dispatch the click event on the child element
        childSpan.dispatchEvent(clickEvent);

        expect(preventDefaultSpy).not.toHaveBeenCalled();

        unmount();
    });

    it('should not prevent default for non-anchor elements', () => {
        const nonAnchorElement = document.createElement('button');
        document.body.appendChild(nonAnchorElement);

        const { unmount } = renderHook(() => useGlobalAnchorBlock());

        // Create a click event on the non-anchor element
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
        });

        // Dispatch the click event
        nonAnchorElement.dispatchEvent(clickEvent);

        expect(preventDefaultSpy).not.toHaveBeenCalled();

        document.body.removeChild(nonAnchorElement);
        unmount();
    });

    it('should remove event listener on unmount', () => {
        const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
        const { unmount } = renderHook(() => useGlobalAnchorBlock());

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });
});
