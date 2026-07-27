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
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ShopperStores } from '@/scapi';
import StoreAddress from './address';

const baseStore: ShopperStores.schemas['Store'] = {
    id: '1',
    name: 'Test Store',
    address1: '1 Market St',
    city: 'San Francisco',
    stateCode: 'CA',
    postalCode: '94105',
};

describe('StoreAddress', () => {
    test('renders multiline address by default', () => {
        render(<StoreAddress store={baseStore} />);
        expect(screen.getByText('1 Market St')).toBeInTheDocument();
        expect(screen.getByText('San Francisco, CA 94105')).toBeInTheDocument();
    });

    test('renders single line when multiline=false', () => {
        render(<StoreAddress store={baseStore} multiline={false} />);
        expect(screen.getByText('1 Market St, San Francisco, CA 94105')).toBeInTheDocument();
    });

    test('includes store name when includeStoreName=true', () => {
        render(<StoreAddress store={baseStore} includeStoreName />);
        expect(screen.getByText('Test Store -')).toBeInTheDocument();
        expect(screen.getByText('1 Market St')).toBeInTheDocument();
    });
});
