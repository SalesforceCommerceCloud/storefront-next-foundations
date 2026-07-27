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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

const { t } = getTranslation();
import ActionCard from './index';

describe('ActionCard', () => {
    test('renders children within the card content', () => {
        const childText = 'Child content here';
        render(<ActionCard>{childText}</ActionCard>);

        expect(screen.getByText(childText)).toBeInTheDocument();
    });

    test('does not render footer when no actions are provided', () => {
        const { container } = render(<ActionCard>no actions</ActionCard>);

        expect(container.querySelector('[data-slot="card-footer"]')).toBeNull();
    });

    test('renders Edit button and calls onEdit when clicked', async () => {
        const onEdit = vi.fn();
        render(<ActionCard onEdit={onEdit}>content</ActionCard>);

        const editButton = screen.getByRole('button', { name: t('actionCard:edit') });
        await userEvent.click(editButton);

        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(editButton.closest('[data-slot="card-footer"]')).toBeTruthy();
    });

    test('renders Remove button and shows overlay while onRemove is pending', async () => {
        let resolveRemove!: () => void;
        const removePromise = new Promise<void>((resolve) => {
            resolveRemove = resolve;
        });

        const onRemove = vi.fn().mockReturnValue(removePromise);
        render(<ActionCard onRemove={onRemove}>content</ActionCard>);

        const removeButton = screen.getByRole('button', { name: t('actionCard:remove') });
        await userEvent.click(removeButton);

        expect(onRemove).toHaveBeenCalledTimes(1);

        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

        resolveRemove();
        await waitFor(() => {
            expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
        });
    });

    test('uses provided aria labels when editBtnLabel/removeBtnLabel are set', () => {
        render(
            <ActionCard onEdit={() => {}} onRemove={() => {}} editBtnLabel="Modify item" removeBtnLabel="Delete item">
                content
            </ActionCard>
        );

        expect(screen.getByRole('button', { name: 'Modify item' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete item' })).toBeInTheDocument();
    });

    test('assigns refs to action buttons when provided', () => {
        const editRef = createRef<HTMLButtonElement>();
        const removeRef = createRef<HTMLButtonElement>();

        render(
            <ActionCard onEdit={() => {}} onRemove={() => {}} editBtnRef={editRef} removeBtnRef={removeRef}>
                content
            </ActionCard>
        );

        expect(editRef.current).toBeInstanceOf(HTMLButtonElement);
        expect(removeRef.current).toBeInstanceOf(HTMLButtonElement);
    });
});
