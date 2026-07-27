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
import type React from 'react';
import type { RegionDesignMetadata } from '../core/component.types';

export interface PageDesignMetadata {
    id: string;
    name: string;
    description?: string;
    archType?: 'controller' | 'headless';
    route?: string;
    supportedAspectTypes?: string[];
    regionDefinitions?: RegionDesignMetadata[];
    attributeDefinitionGroups?: {
        id: string;
        name?: string;
        description?: string;
        attributeDefinitions?: Record<string, unknown>[];
    }[];
}

export type PageDecoratorProps<TProps> = React.PropsWithChildren<
    {
        designMetadata?: PageDesignMetadata;
    } & TProps
>;
