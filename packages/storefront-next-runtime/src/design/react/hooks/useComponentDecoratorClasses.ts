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
import { useDesignState } from './useDesignState';

export function useComponentDecoratorClasses({
    contentLinkUuid,
    isFragment,
    isLocalized,
}: {
    contentLinkUuid: string;
    isFragment: boolean;
    isLocalized: boolean;
}): string {
    const { selectedContentLinkUuid, hoveredContentLinkUuid, dragState } = useDesignState();

    const isSelected = selectedContentLinkUuid === contentLinkUuid;
    const isHovered = !dragState.isDragging && hoveredContentLinkUuid === contentLinkUuid;
    const showFrame = (isSelected || isHovered) && !dragState.isDragging;
    const isMoving = dragState.isDragging && dragState.sourceContentLinkUuid === contentLinkUuid;
    const isDropTarget = dragState.currentDropTarget?.contentLinkUuid === contentLinkUuid;
    const dropTargetInsertType = dragState.currentDropTarget?.insertType;
    const dropTargetAxis = dropTargetInsertType?.axis;

    return [
        'pd-design__decorator',
        isFragment ? 'pd-design__fragment' : 'pd-design__component',
        showFrame && 'pd-design__frame--visible',
        isSelected && 'pd-design__decorator--selected',
        isHovered && 'pd-design__decorator--hovered',
        isMoving && 'pd-design__decorator--moving',
        !isLocalized && 'pd-design__component--unlocalized',
        isDropTarget &&
            dropTargetAxis &&
            dropTargetInsertType &&
            `pd-design__drop-target__${dropTargetAxis}-${dropTargetInsertType.type}`,
    ]
        .filter(Boolean)
        .join(' ');
}
