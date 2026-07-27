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
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ShopperProducts } from '@/scapi';
import { CartItemModal } from './index';

const addContainerMock = vi.fn(() => <div data-testid="cart-item-modal-add-container">add-container</div>);
const editContainerMock = vi.fn(() => <div data-testid="cart-item-modal-edit-container">edit-container</div>);

vi.mock('./add-container', () => ({
    CartItemModalAddContainer: () => addContainerMock(),
}));

vi.mock('./edit-container', () => ({
    CartItemModalEditContainer: () => editContainerMock(),
}));

const product = { id: 'prod-1' } as ShopperProducts.schemas['Product'];

describe('CartItemModal mode router', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('routes to edit container when itemId and product are provided', () => {
        render(<CartItemModal open onOpenChange={vi.fn()} product={product} itemId="item-1" />);

        expect(screen.getByTestId('cart-item-modal-edit-container')).toBeInTheDocument();
        expect(editContainerMock).toHaveBeenCalledTimes(1);
        expect(addContainerMock).not.toHaveBeenCalled();
    });

    test('routes to add container when productId is provided', () => {
        render(<CartItemModal open onOpenChange={vi.fn()} productId="prod-2" />);

        expect(screen.getByTestId('cart-item-modal-add-container')).toBeInTheDocument();
        expect(addContainerMock).toHaveBeenCalledTimes(1);
        expect(editContainerMock).not.toHaveBeenCalled();
    });

    test('renders nothing when required mode props are missing', () => {
        const { container } = render(<CartItemModal open onOpenChange={vi.fn()} />);

        expect(container).toBeEmptyDOMElement();
        expect(addContainerMock).not.toHaveBeenCalled();
        expect(editContainerMock).not.toHaveBeenCalled();
    });
});
