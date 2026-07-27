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
import { createContext } from 'react-router';

export type Maintenance = {
    set: <T>(req: Request, promise: Promise<T>) => Promise<T>;
    gate: (req: Request) => boolean;
    readonly size: number;
    readonly promise: Promise<boolean>;
};

/**
 * Creates a new maintenance context object.
 */
export function createMaintenance(): Maintenance {
    const requests = new Map<Request, Promise<unknown>>();

    let isLocked = false;

    const obj = {
        set: <T = unknown>(req: Request, promise: Promise<T>): Promise<T> => {
            !isLocked && requests.set(req, promise);
            return promise;
        },
        gate: (req: Request): boolean => {
            if (!requests.has(req)) {
                return false;
            }
            if (!isLocked) {
                isLocked = true;
                requests.clear();
                return true;
            }
            return false;
        },
    };

    Object.defineProperty(obj, 'size', { get: () => requests.size });
    Object.defineProperty(obj, 'promise', {
        get: () => {
            if (isLocked || requests.size === 0) {
                return Promise.resolve(false);
            }
            return Promise.race(requests.values()).then(
                (): boolean => {
                    isLocked = true;
                    requests.clear();
                    return true;
                },
                (reason?: unknown) => {
                    isLocked = true;
                    requests.clear();
                    throw reason;
                }
            );
        },
    });

    return obj as Maintenance;
}

/**
 * Context key for the maintenance data.
 */
export const maintenanceContext = createContext<Maintenance>();
