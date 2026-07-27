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
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { action } from 'storybook/actions';

interface CheckoutActionLoggerProps {
    /** Prefix for action names, e.g. "payment" produces "payment-click", "payment-submit", etc. */
    name: string;
    children: ReactNode;
}

/**
 * Shared Storybook decorator for checkout step components.
 *
 * Logs user interactions (clicks, submits, edits, hovers, input focus/change, radio selection)
 * to the Storybook Actions panel using native DOM events so synthetic test events are ignored.
 *
 * Usage in meta.decorators:
 *   decorators: [(Story) => <CheckoutActionLogger name="payment"><Story /></CheckoutActionLogger>]
 */
export function CheckoutActionLogger({ name, children }: CheckoutActionLoggerProps): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action(`${name}-click`);
        const logSubmit = action(`${name}-submit`);
        const logEdit = action(`${name}-edit`);
        const logHover = action(`${name}-hover`);
        const logInputFocus = action(`${name}-input-focus`);
        const logInput = action(`${name}-input`);
        const logInputValue = action(`${name}-input-value`);
        const logOptionSelect = action(`${name}-option-select`);

        const lastHoverElement: { current: HTMLElement | null } = { current: null };
        const lastValueMap = new WeakMap<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, string>();

        const sanitizeLabel = (value: string | null | undefined): string => {
            if (!value) return '';
            return value.replace(/\s+/g, ' ').trim();
        };

        const resolveAriaLabelledBy = (element: HTMLElement): string | null => {
            const labelledBy = element.getAttribute('aria-labelledby');
            if (!labelledBy) return null;
            const ids = labelledBy.split(/\s+/).filter(Boolean);
            for (const id of ids) {
                const text = element.ownerDocument?.getElementById(id)?.textContent;
                if (text) return text;
            }
            return null;
        };

        const deriveLabel = (element: HTMLElement): string => {
            const ariaLabel = element.getAttribute('aria-label');
            if (ariaLabel) return sanitizeLabel(ariaLabel);

            const labelledBy = resolveAriaLabelledBy(element);
            if (labelledBy) return sanitizeLabel(labelledBy);

            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                if (element.placeholder) return sanitizeLabel(element.placeholder);
                const associatedLabel = element.labels?.[0]?.textContent;
                if (associatedLabel) return sanitizeLabel(associatedLabel);
                const nameAttr = element.getAttribute('name');
                if (nameAttr) return sanitizeLabel(nameAttr);
            }

            if (element instanceof HTMLSelectElement) {
                const associatedLabel = element.labels?.[0]?.textContent;
                if (associatedLabel) return sanitizeLabel(associatedLabel);
            }

            const title = element.getAttribute('title');
            if (title) return sanitizeLabel(title);

            const text = element.textContent;
            if (text) return sanitizeLabel(text);

            const testId = element.getAttribute('data-testid');
            if (testId) return sanitizeLabel(testId);

            const idAttr = element.getAttribute('id');
            if (idAttr) return sanitizeLabel(idAttr);

            return sanitizeLabel(element.tagName.toLowerCase());
        };

        const selectors = [
            'button',
            'a',
            'input',
            'textarea',
            'select',
            '[role="button"]',
            '[role="link"]',
            '[role="textbox"]',
            '[data-testid]',
            '[tabindex]',
        ].join(', ');

        const findInteractiveElement = (start: Element | null): HTMLElement | null => {
            let node: Element | null = start;
            while (node) {
                if (node instanceof HTMLElement && node.matches(selectors)) return node;
                node = node.parentElement;
            }
            return null;
        };

        const isInsideHarness = (element: Element) => root.contains(element);

        const isSupportedInteractiveElement = (element: HTMLElement): boolean =>
            element instanceof HTMLButtonElement ||
            element instanceof HTMLAnchorElement ||
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement;

        const isSyntheticEvent = (event: Event): boolean => !event.isTrusted;

        const isEditButton = (element: HTMLElement, label: string): boolean =>
            element instanceof HTMLButtonElement && label.toLowerCase().includes('edit');

        const handleClick = (event: MouseEvent) => {
            if (isSyntheticEvent(event)) return;
            const target = event.target;
            if (!(target instanceof Element)) return;
            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive) || !isSupportedInteractiveElement(interactive)) return;
            if (interactive instanceof HTMLButtonElement && interactive.type === 'submit') return;
            if (interactive instanceof HTMLAnchorElement) event.preventDefault();
            const label = deriveLabel(interactive);
            if (!label) return;
            if (isEditButton(interactive, label)) {
                logEdit({ label });
                return;
            }
            logClick({ label });
        };

        const handleSubmit = (event: SubmitEvent) => {
            if (isSyntheticEvent(event)) return;
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || !isInsideHarness(form)) return;
            event.preventDefault();
            const submitter = (event.submitter as Element | null) ?? form.querySelector('[type="submit"]');
            const interactive = submitter ? findInteractiveElement(submitter) : null;
            const label = interactive instanceof HTMLElement ? deriveLabel(interactive) : 'Submit';
            logSubmit({ label });
        };

        const handleInput = (event: Event) => {
            if (isSyntheticEvent(event)) return;
            const target = event.target;
            if (!(target instanceof Element)) return;
            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive)) return;
            if (interactive instanceof HTMLInputElement || interactive instanceof HTMLTextAreaElement) {
                const label = deriveLabel(interactive);
                if (!label) return;
                logInput({ label });
                const value = interactive.value ?? '';
                const previous = lastValueMap.get(interactive);
                if (previous === value) return;
                lastValueMap.set(interactive, value);
                logInputValue({ label, value });
                return;
            }
            if (interactive instanceof HTMLSelectElement) {
                const label = deriveLabel(interactive);
                if (!label) return;
                const selectedText = interactive.selectedOptions[0]?.textContent?.trim() ?? interactive.value ?? '';
                const previous = lastValueMap.get(interactive);
                if (previous === selectedText) return;
                lastValueMap.set(interactive, selectedText);
                logInput({ label });
                logInputValue({ label, value: selectedText });
            }
        };

        const handleChange = (event: Event) => {
            if (isSyntheticEvent(event)) return;
            const target = event.target;
            if (!(target instanceof Element)) return;
            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive)) return;
            if (interactive instanceof HTMLInputElement && interactive.type === 'radio') {
                const label = deriveLabel(interactive);
                const value = interactive.value ?? '';
                const previous = lastValueMap.get(interactive);
                if (previous === value) return;
                lastValueMap.set(interactive, value);
                logOptionSelect({ label, value });
            }
        };

        const handleFocus = (event: FocusEvent) => {
            if (isSyntheticEvent(event)) return;
            const target = event.target;
            if (!(target instanceof Element)) return;
            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive)) return;
            if (
                interactive instanceof HTMLInputElement ||
                interactive instanceof HTMLTextAreaElement ||
                interactive instanceof HTMLSelectElement
            ) {
                const label = deriveLabel(interactive);
                if (label) logInputFocus({ label });
            }
        };

        const handlePointerOver = (event: PointerEvent) => {
            if (isSyntheticEvent(event)) return;
            const target = event.target;
            if (!(target instanceof Element)) return;
            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive) || !isSupportedInteractiveElement(interactive)) return;
            if (lastHoverElement.current === interactive) return;
            const label = deriveLabel(interactive);
            if (!label) return;
            lastHoverElement.current = interactive;
            logHover({ label });
        };

        const handlePointerOut = (event: PointerEvent) => {
            if (isSyntheticEvent(event)) return;
            if (!lastHoverElement.current) return;
            const target = event.target;
            if (!(target instanceof Element)) return;
            const interactive = findInteractiveElement(target);
            if (!interactive) return;
            const related = event.relatedTarget as Element | null;
            if (related && interactive.contains(related)) return;
            if (interactive === lastHoverElement.current) lastHoverElement.current = null;
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('submit', handleSubmit, true);
        root.addEventListener('input', handleInput, true);
        root.addEventListener('change', handleChange, true);
        root.addEventListener('focusin', handleFocus, true);
        root.addEventListener('pointerover', handlePointerOver, true);
        root.addEventListener('pointerout', handlePointerOut, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('submit', handleSubmit, true);
            root.removeEventListener('input', handleInput, true);
            root.removeEventListener('change', handleChange, true);
            root.removeEventListener('focusin', handleFocus, true);
            root.removeEventListener('pointerover', handlePointerOver, true);
            root.removeEventListener('pointerout', handlePointerOut, true);
        };
    }, [name]);

    return <div ref={containerRef}>{children}</div>;
}
