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
import type { ComponentType } from 'react';
import { VisaIcon, MastercardIcon, AmexIcon, DiscoverIcon, GenericCardIcon } from '@/components/icons';

interface CardIconProps {
    className?: string;
    width?: number | string;
    height?: number | string;
}

// Mapping function to get the right icon component
export const getCardIcon = (cardType: string): ComponentType<CardIconProps> => {
    switch (cardType) {
        case 'Visa':
            return VisaIcon;
        case 'Mastercard':
            return MastercardIcon;
        case 'American Express':
            return AmexIcon;
        case 'Discover':
            return DiscoverIcon;
        case 'Diners Club':
        case 'JCB':
        default:
            return GenericCardIcon;
    }
};
