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
import { createRef } from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioCard, RadioCardGroup } from './index';

describe('RadioCard', () => {
    test('renders children content', () => {
        const childText = 'Test content';
        render(
            <RadioCardGroup>
                <RadioCard value="test">{childText}</RadioCard>
            </RadioCardGroup>
        );

        expect(screen.getByText(childText)).toBeInTheDocument();
    });

    test('renders with correct accessibility attributes', () => {
        render(
            <RadioCardGroup>
                <RadioCard value="test">Test content</RadioCard>
            </RadioCardGroup>
        );

        const radioInput = screen.getByRole('radio');
        expect(radioInput).toHaveAttribute('value', 'test');
        expect(radioInput).toHaveAttribute('type', 'radio');
    });

    test('shows check indicator when selected', () => {
        render(
            <RadioCardGroup value="test">
                <RadioCard value="test">Test content</RadioCard>
            </RadioCardGroup>
        );

        const radioInput = screen.getByRole('radio');
        expect(radioInput).toBeChecked();
    });

    test('does not show check indicator when not selected', () => {
        render(
            <RadioCardGroup value="other">
                <RadioCard value="test">Test content</RadioCard>
            </RadioCardGroup>
        );

        const radioInput = screen.getByRole('radio');
        expect(radioInput).not.toBeChecked();
    });

    test('calls onValueChange when clicked', async () => {
        const onValueChange = vi.fn();
        render(
            <RadioCardGroup onValueChange={onValueChange}>
                <RadioCard value="test">Test content</RadioCard>
            </RadioCardGroup>
        );

        const radioInput = screen.getByRole('radio');
        await userEvent.click(radioInput);

        expect(onValueChange).toHaveBeenCalledWith('test');
    });

    test('handles keyboard navigation with Enter key', async () => {
        const onValueChange = vi.fn();
        render(
            <RadioCardGroup onValueChange={onValueChange}>
                <RadioCard value="test">Test content</RadioCard>
            </RadioCardGroup>
        );

        const radioInput = screen.getByRole('radio');
        radioInput.focus();
        await userEvent.keyboard('{Enter}');

        expect(onValueChange).toHaveBeenCalledWith('test');
    });

    test('handles keyboard navigation with Space key', async () => {
        const onValueChange = vi.fn();
        render(
            <RadioCardGroup onValueChange={onValueChange}>
                <RadioCard value="test">Test content</RadioCard>
            </RadioCardGroup>
        );

        const radioInput = screen.getByRole('radio');
        radioInput.focus();
        await userEvent.keyboard(' ');

        expect(onValueChange).toHaveBeenCalledWith('test');
    });

    test('applies disabled state correctly', () => {
        render(
            <RadioCardGroup disabled>
                <RadioCard value="test">Test content</RadioCard>
            </RadioCardGroup>
        );

        const radioInput = screen.getByRole('radio');
        expect(radioInput).toBeDisabled();
    });

    test('applies individual disabled state correctly', () => {
        render(
            <RadioCardGroup>
                <RadioCard value="test" disabled>
                    Test content
                </RadioCard>
            </RadioCardGroup>
        );

        const radioInput = screen.getByRole('radio');
        expect(radioInput).toBeDisabled();
    });

    test('does not call onValueChange when disabled', async () => {
        const onValueChange = vi.fn();
        render(
            <RadioCardGroup onValueChange={onValueChange} disabled>
                <RadioCard value="test">Test content</RadioCard>
            </RadioCardGroup>
        );

        const radioInput = screen.getByRole('radio');
        await userEvent.click(radioInput);

        expect(onValueChange).not.toHaveBeenCalled();
    });

    test('applies custom className', () => {
        const { container } = render(
            <RadioCardGroup>
                <RadioCard value="test" className="custom-class">
                    Test content
                </RadioCard>
            </RadioCardGroup>
        );

        const label = container.querySelector('label');
        expect(label).toHaveClass('custom-class');
    });

    test('forwards ref correctly', () => {
        const ref = createRef<HTMLLabelElement>();
        render(
            <RadioCardGroup>
                <RadioCard ref={ref} value="test">
                    Test content
                </RadioCard>
            </RadioCardGroup>
        );

        expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    });

    test('creates unique id for each radio input', () => {
        render(
            <RadioCardGroup>
                <RadioCard value="test1">Test 1</RadioCard>
                <RadioCard value="test2">Test 2</RadioCard>
            </RadioCardGroup>
        );

        const radio1 = screen.getByRole('radio', { name: /test 1/i });
        const radio2 = screen.getByRole('radio', { name: /test 2/i });

        expect(radio1).toHaveAttribute('id', 'radio-test1');
        expect(radio2).toHaveAttribute('id', 'radio-test2');
    });
});

describe('RadioCardGroup', () => {
    test('renders children in a radiogroup', () => {
        render(
            <RadioCardGroup>
                <RadioCard value="test1">Test 1</RadioCard>
                <RadioCard value="test2">Test 2</RadioCard>
            </RadioCardGroup>
        );

        const radiogroup = screen.getByRole('radiogroup');
        expect(radiogroup).toBeInTheDocument();
        expect(screen.getByText('Test 1')).toBeInTheDocument();
        expect(screen.getByText('Test 2')).toBeInTheDocument();
    });

    test('supports controlled mode with value prop', () => {
        render(
            <RadioCardGroup value="test2">
                <RadioCard value="test1">Test 1</RadioCard>
                <RadioCard value="test2">Test 2</RadioCard>
            </RadioCardGroup>
        );

        const radio1 = screen.getByRole('radio', { name: /test 1/i });
        const radio2 = screen.getByRole('radio', { name: /test 2/i });

        expect(radio1).not.toBeChecked();
        expect(radio2).toBeChecked();
    });

    test('supports uncontrolled mode with defaultValue', () => {
        render(
            <RadioCardGroup defaultValue="test1">
                <RadioCard value="test1">Test 1</RadioCard>
                <RadioCard value="test2">Test 2</RadioCard>
            </RadioCardGroup>
        );

        const radio1 = screen.getByRole('radio', { name: /test 1/i });
        const radio2 = screen.getByRole('radio', { name: /test 2/i });

        expect(radio1).toBeChecked();
        expect(radio2).not.toBeChecked();
    });

    test('calls onValueChange when selection changes', async () => {
        const onValueChange = vi.fn();
        render(
            <RadioCardGroup onValueChange={onValueChange}>
                <RadioCard value="test1">Test 1</RadioCard>
                <RadioCard value="test2">Test 2</RadioCard>
            </RadioCardGroup>
        );

        const radio2 = screen.getByRole('radio', { name: /test 2/i });
        await userEvent.click(radio2);

        expect(onValueChange).toHaveBeenCalledWith('test2');
    });

    test('applies horizontal orientation correctly', () => {
        const { container } = render(
            <RadioCardGroup orientation="horizontal">
                <RadioCard value="test1">Test 1</RadioCard>
                <RadioCard value="test2">Test 2</RadioCard>
            </RadioCardGroup>
        );

        const radiogroup = container.querySelector('[role="radiogroup"]');
        expect(radiogroup).toHaveClass('flex');
    });

    test('applies vertical orientation correctly', () => {
        const { container } = render(
            <RadioCardGroup orientation="vertical">
                <RadioCard value="test1">Test 1</RadioCard>
                <RadioCard value="test2">Test 2</RadioCard>
            </RadioCardGroup>
        );

        const radiogroup = container.querySelector('[role="radiogroup"]');
        expect(radiogroup).toHaveClass('grid');
    });

    test('applies custom className to radiogroup', () => {
        const { container } = render(
            <RadioCardGroup className="custom-group-class">
                <RadioCard value="test1">Test 1</RadioCard>
            </RadioCardGroup>
        );

        const radiogroup = container.querySelector('[role="radiogroup"]');
        expect(radiogroup).toHaveClass('custom-group-class');
    });

    test('forwards ref correctly', () => {
        const ref = createRef<HTMLDivElement>();
        render(
            <RadioCardGroup ref={ref}>
                <RadioCard value="test1">Test 1</RadioCard>
            </RadioCardGroup>
        );

        expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    test('applies disabled state to all children', () => {
        render(
            <RadioCardGroup disabled>
                <RadioCard value="test1">Test 1</RadioCard>
                <RadioCard value="test2">Test 2</RadioCard>
            </RadioCardGroup>
        );

        const radio1 = screen.getByRole('radio', { name: /test 1/i });
        const radio2 = screen.getByRole('radio', { name: /test 2/i });

        expect(radio1).toBeDisabled();
        expect(radio2).toBeDisabled();
    });

    test('sets name attribute on radio inputs', () => {
        render(
            <RadioCardGroup name="test-group">
                <RadioCard value="test1">Test 1</RadioCard>
                <RadioCard value="test2">Test 2</RadioCard>
            </RadioCardGroup>
        );

        const radio1 = screen.getByRole('radio', { name: /test 1/i });
        const radio2 = screen.getByRole('radio', { name: /test 2/i });

        expect(radio1).toHaveAttribute('name', 'test-group');
        expect(radio2).toHaveAttribute('name', 'test-group');
    });

    test('handles multiple selection changes correctly', async () => {
        const onValueChange = vi.fn();
        render(
            <RadioCardGroup onValueChange={onValueChange}>
                <RadioCard value="test1">Test 1</RadioCard>
                <RadioCard value="test2">Test 2</RadioCard>
                <RadioCard value="test3">Test 3</RadioCard>
            </RadioCardGroup>
        );

        const radio1 = screen.getByRole('radio', { name: /test 1/i });
        const radio2 = screen.getByRole('radio', { name: /test 2/i });
        const radio3 = screen.getByRole('radio', { name: /test 3/i });

        // Click first option
        await userEvent.click(radio1);
        expect(onValueChange).toHaveBeenCalledWith('test1');
        expect(radio1).toBeChecked();
        expect(radio2).not.toBeChecked();
        expect(radio3).not.toBeChecked();

        // Click second option
        await userEvent.click(radio2);
        expect(onValueChange).toHaveBeenCalledWith('test2');
        expect(radio1).not.toBeChecked();
        expect(radio2).toBeChecked();
        expect(radio3).not.toBeChecked();

        // Click third option
        await userEvent.click(radio3);
        expect(onValueChange).toHaveBeenCalledWith('test3');
        expect(radio1).not.toBeChecked();
        expect(radio2).not.toBeChecked();
        expect(radio3).toBeChecked();
    });

    test('maintains selection state in controlled mode', async () => {
        const onValueChange = vi.fn();
        const { rerender } = render(
            <RadioCardGroup value="test1" onValueChange={onValueChange}>
                <RadioCard value="test1">Test 1</RadioCard>
                <RadioCard value="test2">Test 2</RadioCard>
            </RadioCardGroup>
        );

        const radio1 = screen.getByRole('radio', { name: /test 1/i });
        const radio2 = screen.getByRole('radio', { name: /test 2/i });

        expect(radio1).toBeChecked();
        expect(radio2).not.toBeChecked();

        // Click second option - should call onValueChange but not change state until parent updates
        await userEvent.click(radio2);
        expect(onValueChange).toHaveBeenCalledWith('test2');
        expect(radio1).toBeChecked(); // Still checked because parent hasn't updated
        expect(radio2).not.toBeChecked();

        // Simulate parent updating the value
        rerender(
            <RadioCardGroup value="test2" onValueChange={onValueChange}>
                <RadioCard value="test1">Test 1</RadioCard>
                <RadioCard value="test2">Test 2</RadioCard>
            </RadioCardGroup>
        );

        expect(radio1).not.toBeChecked();
        expect(radio2).toBeChecked();
    });
});
