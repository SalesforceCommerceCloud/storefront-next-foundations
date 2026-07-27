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
import { preload } from 'react-dom';
import { resolveDynamicImageAttributes, type DynamicImageDimensions } from '@/lib/images/dynamic-image';
import type { AppConfig } from '@/types/config';

interface PreloadDynamicImageOptions {
    src: string;
    config: AppConfig;
    widths?: DynamicImageDimensions;
    heights?: DynamicImageDimensions;
    fetchPriority?: 'high' | 'low' | 'auto';
}

/**
 * Hint the browser to preload an image that `<DynamicImage>` would render for the same DIS-pipeline inputs (typed
 * `widths` / `heights`), without mounting the component. Useful for prefetching off-screen variants (e.g.
 * non-selected gallery slides) so a later swap is served from the HTTP cache.
 *
 * Note: this helper accepts only the typed `DynamicImageDimensions` shape. The Page Designer comma-separated string
 * form (e.g. `"400,800"`) that `<DynamicImage>` parses internally is not supported here — callers must pass an
 * already-parsed array/object.
 *
 * Funnels through `resolveDynamicImageAttributes`, the same helper `<DynamicImage>` uses, so the render path and the
 * `prefetch` path always agree on URL math, formats, and DIS state.
 *
 * `react-dom` dedupes preloads per resource, so calling this from an effect that re-runs on prop changes is safe and
 * doesn't require manual cleanup.
 *
 * **Caller is responsible for client-only invocation.** Call this from `useEffect`, event handlers, or other paths
 * that don't run during SSR. SSR preload hints for high-priority images are emitted by `<DynamicImage>` itself.
 */
export const preloadDynamicImage = ({
    config,
    src,
    widths,
    heights,
    fetchPriority = 'low',
}: PreloadDynamicImageOptions): void => {
    if (!src) {
        return;
    }

    const { links, src: fallbackSrc } = resolveDynamicImageAttributes({ src, config, widths, heights });

    if (links.length === 0) {
        preload(fallbackSrc, { as: 'image', fetchPriority });
        return;
    }

    links.forEach(({ type, media, sizes, srcSet, href }) => {
        preload(href, {
            as: 'image',
            type,
            fetchPriority,
            imageSrcSet: srcSet,
            imageSizes: sizes,
            ...(media && { media }),
        });
    });
};
