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
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useComponentInfo } from './useComponentInfo';
import { useDesignContext } from '../context/DesignContext';
import { useDesignState } from './useDesignState';

vi.mock('../context/DesignContext');
vi.mock('./useDesignState');

describe('useComponentInfo', () => {
    it('should return null when component does not exist in base config', () => {
        vi.mocked(useDesignContext).mockReturnValue({
            pageDesignerConfig: {
                components: {},
                componentTypes: {},
                labels: {},
                regions: {},
            },
        } as Partial<ReturnType<typeof useDesignContext>> as ReturnType<typeof useDesignContext>);

        vi.mocked(useDesignState).mockReturnValue({
            componentUpdates: {},
        } as Partial<ReturnType<typeof useDesignState>> as ReturnType<typeof useDesignState>);

        const { result } = renderHook(() => useComponentInfo('non-existent-id'));

        expect(result.current).toBeNull();
    });

    it('should return base component info when no updates exist', () => {
        vi.mocked(useDesignContext).mockReturnValue({
            pageDesignerConfig: {
                components: {
                    'test-id': {
                        id: 'test-id',
                        type: 'test-type',
                    },
                },
                componentTypes: {},
                labels: {},
                regions: {},
            },
        } as Partial<ReturnType<typeof useDesignContext>> as ReturnType<typeof useDesignContext>);

        vi.mocked(useDesignState).mockReturnValue({
            componentUpdates: {},
        } as Partial<ReturnType<typeof useDesignState>> as ReturnType<typeof useDesignState>);

        const { result } = renderHook(() => useComponentInfo('test-id'));

        expect(result.current).toEqual({
            id: 'test-id',
            type: 'test-type',
        });
    });

    it('should merge component updates with base info', () => {
        vi.mocked(useDesignContext).mockReturnValue({
            pageDesignerConfig: {
                components: {
                    'test-id': {
                        id: 'test-id',
                        type: 'test-type',
                        name: 'Original Name',
                    },
                },
                componentTypes: {},
                labels: {},
                regions: {},
            },
        } as Partial<ReturnType<typeof useDesignContext>> as ReturnType<typeof useDesignContext>);

        vi.mocked(useDesignState).mockReturnValue({
            componentUpdates: {
                'test-id': {
                    name: 'Updated Name',
                },
            },
        } as Partial<ReturnType<typeof useDesignState>> as ReturnType<typeof useDesignState>);

        const { result } = renderHook(() => useComponentInfo('test-id'));

        expect(result.current).toEqual({
            id: 'test-id',
            type: 'test-type',
            name: 'Updated Name',
        });
    });

    it('should reflect updated visibility when user hides component during editing', () => {
        vi.mocked(useDesignContext).mockReturnValue({
            pageDesignerConfig: {
                components: {
                    'test-id': {
                        id: 'test-id',
                        type: 'test-type',
                    },
                },
                componentTypes: {},
                labels: {},
                regions: {},
            },
        } as Partial<ReturnType<typeof useDesignContext>> as ReturnType<typeof useDesignContext>);

        vi.mocked(useDesignState).mockReturnValue({
            componentUpdates: {
                'test-id': {
                    visibility: false,
                },
            },
        } as Partial<ReturnType<typeof useDesignState>> as ReturnType<typeof useDesignState>);

        const { result } = renderHook(() => useComponentInfo('test-id'));

        expect(result.current).toEqual({
            id: 'test-id',
            type: 'test-type',
            visibility: false,
        });
    });

    it('should return original component data when no edits have been made', () => {
        vi.mocked(useDesignContext).mockReturnValue({
            pageDesignerConfig: {
                components: {
                    'test-id': {
                        id: 'test-id',
                        type: 'test-type',
                        name: 'Test Component',
                    },
                },
                componentTypes: {},
                labels: {},
                regions: {},
            },
        } as Partial<ReturnType<typeof useDesignContext>> as ReturnType<typeof useDesignContext>);

        vi.mocked(useDesignState).mockReturnValue({
            componentUpdates: {
                'test-id': {},
            },
        } as Partial<ReturnType<typeof useDesignState>> as ReturnType<typeof useDesignState>);

        const { result } = renderHook(() => useComponentInfo('test-id'));

        expect(result.current).toEqual({
            id: 'test-id',
            type: 'test-type',
            name: 'Test Component',
        });
    });

    it('should return null when page designer is not connected', () => {
        vi.mocked(useDesignContext).mockReturnValue({
            pageDesignerConfig: null,
        } as Partial<ReturnType<typeof useDesignContext>> as ReturnType<typeof useDesignContext>);

        vi.mocked(useDesignState).mockReturnValue({
            componentUpdates: {},
        } as Partial<ReturnType<typeof useDesignState>> as ReturnType<typeof useDesignState>);

        const { result } = renderHook(() => useComponentInfo('test-id'));

        expect(result.current).toBeNull();
    });
});
