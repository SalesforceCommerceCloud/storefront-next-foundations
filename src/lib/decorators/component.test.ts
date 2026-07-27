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
import { describe, test, expect } from 'vitest';
import 'reflect-metadata';
import {
    Component,
    RegisterComponent,
    withComponentMetadata,
    Required,
    Optional,
    TYPE_ID_KEY,
    META_KEY,
    LOADER_KEY,
    DEFAULT_COMPONENT_GROUP,
    type ComponentTypeMetadata,
} from './component';

describe('Component Decorators', () => {
    describe('Component Decorator', () => {
        test('decorates class with component metadata', () => {
            @Component('hero', {
                name: 'Hero Banner',
                description: 'Prominent banner section',
            })
            class HeroComponent {
                render() {
                    return null;
                }
            }

            const typeId = Reflect.getMetadata(TYPE_ID_KEY, HeroComponent);
            const metadata = Reflect.getMetadata(META_KEY, HeroComponent);

            expect(typeId).toBe(`${DEFAULT_COMPONENT_GROUP}.hero`);
            expect(metadata).toEqual({
                name: 'Hero Banner',
                description: 'Prominent banner section',
                group: DEFAULT_COMPONENT_GROUP,
            });
        });

        test('uses custom group when provided', () => {
            @Component('custom-hero', {
                name: 'Custom Hero',
                group: 'custom_group',
            })
            class CustomHeroComponent {
                render() {
                    return null;
                }
            }

            const typeId = Reflect.getMetadata(TYPE_ID_KEY, CustomHeroComponent);
            const metadata = Reflect.getMetadata(META_KEY, CustomHeroComponent);

            expect(typeId).toBe('custom_group.custom-hero');
            expect(metadata.group).toBe('custom_group');
        });

        test('preserves all metadata properties', () => {
            const componentMetadata: ComponentTypeMetadata = {
                name: 'Complex Component',
                description: 'A complex component',
                group: 'test_group',
            };

            @Component('complex', componentMetadata)
            class ComplexComponent {
                render() {
                    return null;
                }
            }

            const metadata = Reflect.getMetadata(META_KEY, ComplexComponent);
            expect(metadata).toEqual({
                ...componentMetadata,
            });
        });

        test('works with minimal metadata', () => {
            @Component('minimal', { name: 'Minimal' })
            class MinimalComponent {}

            const typeId = Reflect.getMetadata(TYPE_ID_KEY, MinimalComponent);
            const metadata = Reflect.getMetadata(META_KEY, MinimalComponent);

            expect(typeId).toBe(`${DEFAULT_COMPONENT_GROUP}.minimal`);
            expect(metadata.name).toBe('Minimal');
            expect(metadata.group).toBe(DEFAULT_COMPONENT_GROUP);
        });
    });

    describe('RegisterComponent Decorator', () => {
        test('decorates function component with metadata', () => {
            function BannerComponent() {
                return null;
            }

            const DecoratedBanner = RegisterComponent('banner', {
                name: 'Banner',
                description: 'Banner component',
            })(BannerComponent);

            const typeId = Reflect.getMetadata(TYPE_ID_KEY, DecoratedBanner);
            const metadata = Reflect.getMetadata(META_KEY, DecoratedBanner);

            expect(typeId).toBe(`${DEFAULT_COMPONENT_GROUP}.banner`);
            expect(metadata).toEqual({
                name: 'Banner',
                description: 'Banner component',
                group: DEFAULT_COMPONENT_GROUP,
            });
        });

        test('decorates arrow function component', () => {
            const CardComponent = RegisterComponent('card', {
                name: 'Card',
            })(() => null);

            const typeId = Reflect.getMetadata(TYPE_ID_KEY, CardComponent);
            expect(typeId).toBe(`${DEFAULT_COMPONENT_GROUP}.card`);
        });

        test('uses custom group when provided', () => {
            function CustomBanner() {
                return null;
            }

            const DecoratedCustomBanner = RegisterComponent('custom-banner', {
                name: 'Custom Banner',
                group: 'custom_components',
            })(CustomBanner);

            const typeId = Reflect.getMetadata(TYPE_ID_KEY, DecoratedCustomBanner);
            expect(typeId).toBe('custom_components.custom-banner');
        });
    });

    describe('withComponentMetadata HOC', () => {
        test('wraps component with metadata', () => {
            class OriginalComponent {
                render() {
                    return null;
                }
            }

            const WrappedComponent = withComponentMetadata('wrapped', {
                name: 'Wrapped Component',
            })(OriginalComponent);

            const typeId = Reflect.getMetadata(TYPE_ID_KEY, WrappedComponent);
            const metadata = Reflect.getMetadata(META_KEY, WrappedComponent);

            expect(typeId).toBe(`${DEFAULT_COMPONENT_GROUP}.wrapped`);
            expect(metadata.name).toBe('Wrapped Component');
        });

        test('preserves original component functionality', () => {
            class CounterComponent {
                count = 0;
                increment() {
                    this.count++;
                }
            }

            const WrappedCounter = withComponentMetadata('counter', {
                name: 'Counter',
            })(CounterComponent);

            const instance = new WrappedCounter();
            instance.increment();
            expect(instance.count).toBe(1);
        });

        test('uses custom group', () => {
            class TestComponent {}

            const Wrapped = withComponentMetadata('test', {
                name: 'Test',
                group: 'test_group',
            })(TestComponent);

            const typeId = Reflect.getMetadata(TYPE_ID_KEY, Wrapped);
            expect(typeId).toBe('test_group.test');
        });
    });

    describe('Required Decorator', () => {
        test('marks property as required', () => {
            class TestComponent {
                @Required
                title!: string;
            }

            const required = Reflect.getMetadata('component:required', TestComponent.prototype);
            expect(required).toEqual(['title']);
        });

        test('marks multiple properties as required', () => {
            class TestComponent {
                @Required
                title!: string;

                @Required
                subtitle!: string;

                @Required
                imageUrl!: string;
            }

            const required = Reflect.getMetadata('component:required', TestComponent.prototype);
            expect(required).toEqual(['title', 'subtitle', 'imageUrl']);
        });

        test('handles no required properties', () => {
            class TestComponent {
                title?: string;
            }

            const required = Reflect.getMetadata('component:required', TestComponent.prototype);
            expect(required).toBeUndefined();
        });
    });

    describe('Optional Decorator', () => {
        test('marks property as optional', () => {
            class TestComponent {
                @Optional
                subtitle?: string;
            }

            const optional = Reflect.getMetadata('component:optional', TestComponent.prototype);
            expect(optional).toEqual(['subtitle']);
        });

        test('marks multiple properties as optional', () => {
            class TestComponent {
                @Optional
                subtitle?: string;

                @Optional
                description?: string;

                @Optional
                imageAlt?: string;
            }

            const optional = Reflect.getMetadata('component:optional', TestComponent.prototype);
            expect(optional).toEqual(['subtitle', 'description', 'imageAlt']);
        });
    });

    describe('Combined Decorators', () => {
        test('combines Component, Required, and Optional decorators', () => {
            @Component('full-component', {
                name: 'Full Component',
                description: 'Component with all decorators',
            })
            class FullComponent {
                @Required
                title!: string;

                @Required
                imageUrl!: string;

                @Optional
                subtitle?: string;

                @Optional
                description?: string;
            }

            const typeId = Reflect.getMetadata(TYPE_ID_KEY, FullComponent);
            const metadata = Reflect.getMetadata(META_KEY, FullComponent);
            const required = Reflect.getMetadata('component:required', FullComponent.prototype);
            const optional = Reflect.getMetadata('component:optional', FullComponent.prototype);

            expect(typeId).toBe(`${DEFAULT_COMPONENT_GROUP}.full-component`);
            expect(metadata.name).toBe('Full Component');
            expect(required).toEqual(['title', 'imageUrl']);
            expect(optional).toEqual(['subtitle', 'description']);
        });

        test('combines all decorators', () => {
            @Component('complete-component', { name: 'Complete' })
            class CompleteComponent {
                @Required
                id!: string;

                @Optional
                data?: unknown;
            }

            const typeId = Reflect.getMetadata(TYPE_ID_KEY, CompleteComponent);
            const required = Reflect.getMetadata('component:required', CompleteComponent.prototype);

            expect(typeId).toBe(`${DEFAULT_COMPONENT_GROUP}.complete-component`);
            expect(required).toEqual(['id']);
        });
    });

    describe('Constants', () => {
        test('exports correct metadata keys', () => {
            expect(TYPE_ID_KEY).toBe('component:typeId');
            expect(META_KEY).toBe('component:metadata');
            expect(LOADER_KEY).toBe('component:loader');
        });

        test('exports correct default component group', () => {
            expect(DEFAULT_COMPONENT_GROUP).toBe('storefrontnext_base');
        });
    });
});
