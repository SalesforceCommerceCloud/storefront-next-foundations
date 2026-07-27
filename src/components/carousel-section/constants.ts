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

/**
 * Fixed pixel widths for carousel tile images at each design breakpoint.
 * Breakpoints: 375px → 348px, 768px → 256px, 1280px → 256px, 1536px → 288px.
 * Used by both product and category carousel tiles to keep image hints in sync
 * with the fixed-width CarouselItem layout.
 */
export const carouselItemImageWidths = ['348px', '256px', '256px', '288px'];

/** Aspect ratio (width / height) for product tiles inside the product carousel. */
export const productCarouselItemAspectRatio = 0.8;
