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

import { useEffect, useMemo } from 'react';
import { createLogger } from '@/lib/logger';
import {
    createHostApi,
    type ClientAcknowledgedEvent,
    type EventPayload,
} from '@salesforce/storefront-next-runtime/design/messaging';
import { useDesignContext } from '@salesforce/storefront-next-runtime/design/react';
import type { ShopperExperience } from '@/scapi';

const logger = createLogger();

/**
 * A component that creates a design layer host for testing purposes.
 * This allows design layer interaction without having a host application (Page Designer) connected.
 * You can add this component anywhere under the PageDesignerProvider component.
 * THIS IS ONLY FOR TESTING PURPOSES.
 * @example
 * ```typescript
 * <PageDesignerProvider>
 *   <PageDesignerHostProvider />
 * </PageDesignerProvider>
 * ```
 * @param props.page - The page data used for the page.
 */
export function PageDesignerHostProvider({
    expose = false,
    logEvents = true,
}: {
    expose?: boolean;
    logEvents?: boolean;
} = {}) {
    const { clientPage } = useDesignContext();
    const host = useMemo(
        () =>
            createHostApi({
                id: 'test-host',
                emitter: {
                    postMessage: (message: unknown) => window.postMessage(message, '*'),
                    addEventListener: (handler) => {
                        const listener = (event: MessageEvent) => handler(event.data);

                        window.parent.addEventListener('message', listener);

                        return () => window.parent.removeEventListener('message', listener);
                    },
                },
            }),
        []
    );

    useEffect(() => {
        host.connect({
            configFactory: () =>
                Promise.resolve({
                    components: {},
                    componentTypes: {},
                    labels: {},
                    regions: {},
                }),
            onClientConnected: (clientId) => {
                logger.debug(`PageDesignerHost connected to client ${clientId}`);
            },
        });

        if (logEvents) {
            host.on('Event', (event) => {
                logger.debug('PageDesignerHost event', { event: event as unknown as Record<string, unknown> });
            });
        }

        return () => {
            host.disconnect();
        };
    }, [host, logEvents]);

    useEffect(() => {
        host.setClientConfiguration(getHostConfigFromPage(clientPage));
    }, [clientPage, host]);

    // Window won't exist during SSR.
    if (expose && typeof window !== 'undefined') {
        // Expose the host object to the window to allow API methods to be called from the console.
        (window as unknown as { PageDesignerHost: typeof host }).PageDesignerHost = host;
    }

    return <></>;
}

function* forEachComponent(
    regions: ShopperExperience.schemas['Region'][]
): IterableIterator<ShopperExperience.schemas['Component']> {
    for (const region of regions) {
        for (const component of region.components ?? []) {
            yield component;

            if (component.regions) {
                yield* forEachComponent(component.regions);
            }
        }
    }
}

function getHostConfigFromPage(page: ShopperExperience.schemas['Page'] | null): EventPayload<ClientAcknowledgedEvent> {
    const config: EventPayload<ClientAcknowledgedEvent> = {
        components: {},
        componentTypes: {},
        labels: {},
        regions: {},
    };

    for (const component of forEachComponent(page?.regions ?? [])) {
        config.componentTypes[component.typeId] = {
            id: component.typeId,
            // We don't have this information just from the page.
            name: `${component.typeId}-${component.id}`,
            image: '',
            label: '',
        };

        config.components[component.id] = {
            id: component.id,
            type: component.typeId,
        };
    }

    return config;
}
