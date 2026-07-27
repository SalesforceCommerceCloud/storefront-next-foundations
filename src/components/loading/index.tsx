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
import { useEffect, useRef, useState } from 'react';
import { useNavigation } from 'react-router';

/**
 * Loading indicator optimized for streaming SSR. The indicator shows a loading
 * state whenever the navigation state diverges from "idle" for more than 150ms. It's implemented
 * to do this only for client-side (follow-up) navigation requests, but not for the initial SSR
 * page load.
 */
export default function Loading() {
    const navigation = useNavigation();
    const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showLoader, setShowLoader] = useState(false);

    useEffect(() => {
        timeout.current && clearTimeout(timeout.current);
        if (navigation?.state === 'idle') {
            setShowLoader(false);
        } else {
            timeout.current = setTimeout(() => setShowLoader(true), 150);
        }

        return () => {
            timeout.current && clearTimeout(timeout.current);
            setShowLoader(false);
        };
    }, [navigation?.state]);

    if (showLoader) {
        return (
            <div className="w-full h-full fixed top-0 left-0 bg-background opacity-75 z-50">
                <div className="flex justify-center items-center mt-[50vh]">
                    <div className="border-border h-20 w-20 animate-spin rounded-full border-8 border-t-blue-600" />
                </div>
            </div>
        );
    }
    return null;
}
