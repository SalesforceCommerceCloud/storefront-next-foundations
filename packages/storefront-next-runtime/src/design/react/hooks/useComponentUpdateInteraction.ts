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
import { useInteraction } from './useInteraction';

export interface ComponentUpdate {
    name?: string;
    [key: string]: unknown;
}

export interface ComponentUpdateInteraction {
    componentUpdates: Record<string, ComponentUpdate>;
}

/**
 * Custom hook that manages component update state and handles
 * client-host communication for component update events.
 *
 * Listens for ComponentUpdated events from the host and maintains
 * a map of component IDs to their updated data.
 *
 * @returns Component update state
 */
export function useComponentUpdateInteraction(): ComponentUpdateInteraction {
    const { state: componentUpdates } = useInteraction<Record<string, ComponentUpdate>, Record<string, never>>({
        initialState: {},
        eventHandlers: {
            // Handle initial component names from page-init
            ClientAcknowledged: {
                handler: (event, setState) => {
                    const initialUpdates: Record<string, ComponentUpdate> = {};
                    Object.entries(event.components).forEach(([id, componentInfo]) => {
                        if (componentInfo.name) {
                            initialUpdates[id] = { name: componentInfo.name };
                        }
                    });
                    // Merge to preserve ComponentUpdated changes
                    if (Object.keys(initialUpdates).length > 0) {
                        setState((prev) => ({ ...prev, ...initialUpdates }));
                    }
                },
            },
            // Handle runtime component updates
            ComponentUpdated: {
                handler: (event, setState) => {
                    setState((prev) => {
                        const componentId = event.componentId;
                        const existing = prev[componentId] || {};

                        // Update the specific field based on changeType
                        const updated = { ...existing };
                        if (event.changeType === 'name') {
                            updated.name = event.newValue as string;
                        } else if (event.changeType === 'visibility') {
                            updated.visibility = event.newValue;
                        }

                        return {
                            ...prev,
                            [componentId]: updated,
                        };
                    });
                },
            },
        },
    });

    return {
        componentUpdates,
    };
}
