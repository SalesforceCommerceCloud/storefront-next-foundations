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

export const OVERLAY_POSITION_VALUES = [
    'Top Left',
    'Top Center',
    'Top Right',
    'Middle Left',
    'Middle Center',
    'Middle Right',
    'Bottom Left',
    'Bottom Center',
    'Bottom Right',
] as const;

export type OverlayPosition = (typeof OVERLAY_POSITION_VALUES)[number];

export const OVERLAY_ALIGNMENT_VALUES = ['left', 'center', 'right'] as const;
export type OverlayAlignment = (typeof OVERLAY_ALIGNMENT_VALUES)[number];

export type OverlayLayout = {
    vertical: 'start' | 'center' | 'end';
    horizontal: 'left' | 'center' | 'right';
};

export function normalizeOverlayPosition(value: string | undefined): OverlayPosition {
    if (value && (OVERLAY_POSITION_VALUES as readonly string[]).includes(value)) {
        return value as OverlayPosition;
    }
    // Legacy horizontal-only values from earlier hero metadata
    if (value === 'left') return 'Middle Left';
    if (value === 'right') return 'Middle Right';
    if (value === 'center') return 'Middle Center';
    return 'Middle Center';
}

export function normalizeOverlayAlignment(value: string | undefined): OverlayAlignment {
    if (value && (OVERLAY_ALIGNMENT_VALUES as readonly string[]).includes(value)) {
        return value as OverlayAlignment;
    }
    return 'center';
}

export function overlayPositionLayout(position: OverlayPosition): OverlayLayout {
    const map: Record<OverlayPosition, OverlayLayout> = {
        'Top Left': { vertical: 'start', horizontal: 'left' },
        'Top Center': { vertical: 'start', horizontal: 'center' },
        'Top Right': { vertical: 'start', horizontal: 'right' },
        'Middle Left': { vertical: 'center', horizontal: 'left' },
        'Middle Center': { vertical: 'center', horizontal: 'center' },
        'Middle Right': { vertical: 'center', horizontal: 'right' },
        'Bottom Left': { vertical: 'end', horizontal: 'left' },
        'Bottom Center': { vertical: 'end', horizontal: 'center' },
        'Bottom Right': { vertical: 'end', horizontal: 'right' },
    };
    return map[position];
}
