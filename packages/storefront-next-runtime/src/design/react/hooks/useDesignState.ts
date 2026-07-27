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
import React from 'react';
import { DesignStateContext, type DesignState } from '../context/DesignStateContext';

/**
 * Custom hook that manages design-time component state by composing
 * individual interaction hooks for better maintainability and testability.
 *
 * @returns Combined design state from all interactions
 */
export const useDesignState = (): DesignState => {
    const context = React.useContext(DesignStateContext);

    if (!context) {
        throw new Error('useDesignState must be used within a DesignStateProvider');
    }

    return context;
};
