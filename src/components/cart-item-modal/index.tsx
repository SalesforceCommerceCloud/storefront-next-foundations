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
import { CartItemModalAddContainer } from './add-container';
import { CartItemModalEditContainer } from './edit-container';
import type { CartItemModalProps } from './types';

export type { CartItemModalProps } from './types';

/**
 * CartItemModal delegates orchestration to add/edit containers while preserving
 * the existing external API used by quick-add and cart edit entry points.
 */
export function CartItemModal(props: CartItemModalProps): ReactElement {
    if (props.itemId && props.product) {
        return <CartItemModalEditContainer {...props} itemId={props.itemId} product={props.product} />;
    }

    if (props.productId) {
        return <CartItemModalAddContainer {...props} productId={props.productId} />;
    }

    // Invalid caller usage: neither (itemId + product) nor productId provided.
    // Keep behavior deterministic and render nothing instead of throwing in UI.
    return <></>;
}
