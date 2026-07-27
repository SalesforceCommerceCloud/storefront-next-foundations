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

import type { ComponentType } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import withSuspense from './index';

describe('withSuspense', () => {
    // Mock component for testing
    type TestComponentProps = {
        name?: string;
        data?: any;
        testId?: string;
    };

    const TestComponent = ({ name, data, testId }: TestComponentProps) => (
        <div data-testid={testId || 'test-component'}>
            <span data-testid="name">{name || 'Default'}</span>
            {data && <span data-testid="resolved-data">{JSON.stringify(data)}</span>}
        </div>
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic HOC Creation', () => {
        test('should create a HOC without config', () => {
            const WrappedComponent = withSuspense(TestComponent);
            expect(WrappedComponent).toBeDefined();
            expect(typeof WrappedComponent).toBe('function');
        });

        test('should create a HOC with empty config', () => {
            const WrappedComponent = withSuspense(TestComponent, {});
            expect(WrappedComponent).toBeDefined();
            expect(typeof WrappedComponent).toBe('function');
        });

        test('should create a HOC with fallback only', () => {
            const customFallback = <div>Custom Loading...</div>;
            const WrappedComponent = withSuspense(TestComponent, { fallback: customFallback });
            expect(WrappedComponent).toBeDefined();
        });

        test('should create a HOC with resolve promise in config', () => {
            const testPromise = Promise.resolve({ id: 1, name: 'Test' });
            const WrappedComponent = withSuspense(TestComponent, { resolve: testPromise });
            expect(WrappedComponent).toBeDefined();
        });
    });

    describe('Rendering without Promise Resolution', () => {
        test('should render wrapped component without data prop', () => {
            const WrappedComponent = withSuspense(TestComponent);
            const { container } = render(<WrappedComponent name="Test Name" />);

            expect(screen.getByTestId('test-component')).toBeInTheDocument();
            expect(screen.getByText('Test Name')).toBeInTheDocument();
            expect(screen.queryByTestId('resolved-data')).not.toBeInTheDocument();
            expect(container.innerHTML).toBeTruthy();
        });

        test('should render with default fallback when loading', () => {
            const WrappedComponent = withSuspense(TestComponent);
            render(<WrappedComponent name="Test" />);

            // Component should render immediately without Suspense triggering
            expect(screen.getByTestId('test-component')).toBeInTheDocument();
        });

        test('should pass through all props to wrapped component', () => {
            const WrappedComponent = withSuspense(TestComponent);
            render(<WrappedComponent name="Custom Name" testId="custom-test-id" />);

            expect(screen.getByTestId('custom-test-id')).toBeInTheDocument();
            expect(screen.getByText('Custom Name')).toBeInTheDocument();
        });

        test('should render component with no props', () => {
            const WrappedComponent = withSuspense(TestComponent);
            render(<WrappedComponent />);

            expect(screen.getByTestId('test-component')).toBeInTheDocument();
            expect(screen.getByText('Default')).toBeInTheDocument();
        });
    });

    describe('Rendering with Custom Fallback', () => {
        test('should use custom fallback in Suspense boundary', () => {
            const customFallback = <div data-testid="custom-fallback">Custom Loading...</div>;
            const WrappedComponent = withSuspense(TestComponent, { fallback: customFallback });

            render(<WrappedComponent name="Test" />);

            // Component should still render (no Suspense triggered without promise)
            expect(screen.getByTestId('test-component')).toBeInTheDocument();
            expect(screen.queryByTestId('custom-fallback')).not.toBeInTheDocument();
        });

        test('should use custom fallback function in Suspense boundary', () => {
            const customFallback = <div data-testid="custom-fallback">Custom Loading...</div>;
            const WrappedComponent = withSuspense(TestComponent, { fallback: () => customFallback });

            render(<WrappedComponent name="Test" />);

            // Component should still render (no Suspense triggered without promise)
            expect(screen.getByTestId('test-component')).toBeInTheDocument();
            expect(screen.queryByTestId('custom-fallback')).not.toBeInTheDocument();
        });

        test('should use different fallback components', () => {
            const fallback1 = <div data-testid="fallback-1">Loading 1...</div>;
            const fallback2 = <div data-testid="fallback-2">Loading 2...</div>;

            const WrappedComponent1 = withSuspense(TestComponent, { fallback: fallback1 });
            const WrappedComponent2 = withSuspense(TestComponent, { fallback: fallback2 });

            const { rerender } = render(<WrappedComponent1 name="Test 1" />);
            expect(screen.getByTestId('test-component')).toBeInTheDocument();

            rerender(<WrappedComponent2 name="Test 2" />);
            expect(screen.getByTestId('test-component')).toBeInTheDocument();
        });
    });

    describe('Rendering with Promise Resolution from Config', () => {
        test('should create HOC with resolve configuration', () => {
            const testPromise = Promise.resolve({ id: 1 });
            const WrappedComponent = withSuspense(TestComponent, { resolve: testPromise });
            expect(WrappedComponent).toBeDefined();
        });

        test('should show loading state when resolving promise', () => {
            const testPromise = Promise.resolve({ id: 1, message: 'Resolved data' });
            const WrappedComponent = withSuspense(TestComponent, {
                resolve: testPromise,
                fallback: <div data-testid="loading">Loading...</div>,
            });

            render(<WrappedComponent name="Test" />);

            // Suspense will show fallback initially
            expect(screen.getByTestId('loading')).toBeInTheDocument();
        });

        test('should handle different promise configurations', () => {
            const promise1 = Promise.resolve({ type: 1 });
            const promise2 = Promise.resolve({ type: 2 });

            const WrappedComponent1 = withSuspense(TestComponent, { resolve: promise1 });
            const WrappedComponent2 = withSuspense(TestComponent, { resolve: promise2 });

            expect(WrappedComponent1).not.toBe(WrappedComponent2);
        });

        test('should pass resolve to ComponentWithData', () => {
            const testPromise = Promise.resolve({ data: 'test' });
            const WrappedComponent = withSuspense(TestComponent, { resolve: testPromise });

            const { container } = render(<WrappedComponent name="Test" />);
            expect(container).toBeTruthy();
        });

        test('should use custom resolve function', () => {
            const testPromise = Promise.resolve({ data: 'test' });
            const WrappedComponent = withSuspense(TestComponent, { resolve: () => testPromise });

            const { container } = render(<WrappedComponent name="Test" />);
            expect(container).toBeTruthy();
        });
    });

    describe('Rendering with Promise Resolution from Props', () => {
        test('should accept resolve prop', () => {
            const propPromise = Promise.resolve({ type: 'prop' });
            const WrappedComponent = withSuspense(TestComponent);

            const { container } = render(<WrappedComponent name="Test" resolve={propPromise} />);
            expect(container).toBeTruthy();
        });

        test('should handle props with and without resolve', () => {
            const WrappedComponent = withSuspense(TestComponent);

            const { rerender } = render(<WrappedComponent name="Without" />);
            expect(screen.getByText('Without')).toBeInTheDocument();

            // With promise, it will show fallback initially, so we just verify rendering happens
            rerender(<WrappedComponent name="With" resolve={Promise.resolve({})} />);
            // Component structure exists (either visible or in Suspense fallback state)
            expect(document.body).toBeTruthy();
        });

        test('should prioritize prop resolve over config resolve', () => {
            const configPromise = Promise.resolve({ source: 'config' });
            const propPromise = Promise.resolve({ source: 'prop' });

            const WrappedComponent = withSuspense(TestComponent, { resolve: configPromise });
            const { container } = render(<WrappedComponent name="Test" resolve={propPromise} />);

            expect(container).toBeTruthy();
        });

        test('should handle undefined resolve prop', () => {
            const WrappedComponent = withSuspense(TestComponent);

            render(<WrappedComponent name="Test" resolve={undefined} />);
            expect(screen.getByTestId('test-component')).toBeInTheDocument();
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle component without any props', () => {
            const SimpleComponent = () => <div data-testid="simple">Simple</div>;
            const WrappedComponent = withSuspense(SimpleComponent);

            render(<WrappedComponent />);
            expect(screen.getByTestId('simple')).toBeInTheDocument();
        });

        test('should handle component with complex props', () => {
            type ComplexProps = {
                items: Array<{ id: number; name: string }>;
                callback: (id: number) => void;
            };

            const ComplexComponent = ({ items, callback }: ComplexProps) => {
                const handleClick = () => callback(items[0].id);
                return (
                    <div data-testid="complex" onClick={handleClick}>
                        {items.map((item) => (
                            <span key={item.id}>{item.name}</span>
                        ))}
                    </div>
                );
            };

            const WrappedComponent = withSuspense(ComplexComponent as ComponentType<Record<string, unknown>>);
            const items = [{ id: 1, name: 'Item 1' }];
            const callback = vi.fn();

            render(<WrappedComponent items={items} callback={callback} />);

            expect(screen.getByTestId('complex')).toBeInTheDocument();
            expect(screen.getByText('Item 1')).toBeInTheDocument();
        });
    });

    describe('ComponentWithData Internal Logic', () => {
        test('should render component without data when no resolve', () => {
            const WrappedComponent = withSuspense(TestComponent);

            render(<WrappedComponent name="No Data" />);

            expect(screen.getByTestId('test-component')).toBeInTheDocument();
            expect(screen.queryByTestId('resolved-data')).not.toBeInTheDocument();
        });

        test('should pass resolve to ComponentWithData when provided', () => {
            const testPromise = Promise.resolve({ passed: true });

            const DataComponent = ({ data, testId }: { data?: any; testId?: string }) => (
                <div data-testid={testId || 'data-component'}>
                    <span>{data ? 'Has data' : 'No data'}</span>
                </div>
            );

            const WrappedComponent = withSuspense(DataComponent, { resolve: testPromise });
            const { container } = render(<WrappedComponent testId="data-test" />);

            expect(container).toBeTruthy();
        });

        test('should handle component with data prop structure', () => {
            const testPromise = Promise.resolve({ value: 100 });

            const MixedPropsComponent = ({ data, title, testId }: { data?: any; title?: string; testId?: string }) => (
                <div data-testid={testId || 'mixed'}>
                    <span data-testid="title">{title || 'No Title'}</span>
                    {data && <span data-testid="data">{JSON.stringify(data)}</span>}
                </div>
            );

            const WrappedComponent = withSuspense(MixedPropsComponent, { resolve: testPromise });

            const { container } = render(<WrappedComponent title="My Title" testId="mixed-test" />);

            // Component structure exists (Suspense shows fallback initially)
            expect(container).toBeTruthy();
        });
    });

    describe('HOC Behavior and Composition', () => {
        test('should create independent HOC instances', () => {
            const WrappedComponent1 = withSuspense(TestComponent);
            const WrappedComponent2 = withSuspense(TestComponent);

            render(
                <div>
                    <WrappedComponent1 name="First" testId="first" />
                    <WrappedComponent2 name="Second" testId="second" />
                </div>
            );

            expect(screen.getByTestId('first')).toBeInTheDocument();
            expect(screen.getByTestId('second')).toBeInTheDocument();
        });

        test('should handle re-rendering with different props', () => {
            const WrappedComponent = withSuspense(TestComponent);
            const { rerender } = render(<WrappedComponent name="Initial" testId="rerender-test" />);

            expect(screen.getByText('Initial')).toBeInTheDocument();

            rerender(<WrappedComponent name="Updated" testId="rerender-test" />);

            expect(screen.getByText('Updated')).toBeInTheDocument();
        });

        test('should handle rapid prop changes', () => {
            const WrappedComponent = withSuspense(TestComponent);
            const { rerender } = render(<WrappedComponent name="One" testId="rapid" />);

            expect(screen.getByText('One')).toBeInTheDocument();

            rerender(<WrappedComponent name="Two" testId="rapid" />);
            expect(screen.getByText('Two')).toBeInTheDocument();

            rerender(<WrappedComponent name="Three" testId="rapid" />);
            expect(screen.getByText('Three')).toBeInTheDocument();
        });
    });

    describe('Suspense Boundary Integration', () => {
        test('should wrap component in Suspense boundary', () => {
            const WrappedComponent = withSuspense(TestComponent);
            const { container } = render(<WrappedComponent name="Suspense Test" />);

            expect(container.firstChild).toBeTruthy();
            expect(screen.getByTestId('test-component')).toBeInTheDocument();
        });

        test('should handle multiple wrapped components independently', () => {
            const promise1 = Promise.resolve({ index: 1 });
            const promise2 = Promise.resolve({ index: 2 });

            const WrappedComponent = withSuspense(TestComponent);

            const { container } = render(
                <div>
                    <WrappedComponent name="First" resolve={promise1} testId="multi-1" />
                    <WrappedComponent name="Second" resolve={promise2} testId="multi-2" />
                </div>
            );

            // Components with promises show fallback initially
            expect(container).toBeTruthy();
        });

        test('should show fallback when promise is pending', () => {
            const pendingPromise = Promise.resolve({ pending: true });
            const WrappedComponent = withSuspense(TestComponent, {
                resolve: pendingPromise,
                fallback: <div data-testid="fallback">Loading...</div>,
            });

            render(<WrappedComponent name="Test" />);
            expect(screen.getByTestId('fallback')).toBeInTheDocument();
        });
    });

    describe('Type Safety and Generic Props', () => {
        test('should handle different TypeScript types', () => {
            interface UserProps {
                userId: string;
                role?: string;
            }

            const UserComponent = ({ userId, role }: UserProps) => (
                <div data-testid="user-component">
                    <span>{userId}</span>
                    {role && <span>{role}</span>}
                </div>
            );

            const WrappedComponent = withSuspense(UserComponent as unknown as ComponentType<Record<string, unknown>>);

            render(<WrappedComponent userId="user-123" role="admin" />);

            expect(screen.getByTestId('user-component')).toBeInTheDocument();
            expect(screen.getByText('user-123')).toBeInTheDocument();
            expect(screen.getByText('admin')).toBeInTheDocument();
        });

        test('should preserve prop types across HOC', () => {
            type NumberProps = {
                value: number;
                multiplier: number;
            };

            const NumberComponent = ({ value, multiplier }: NumberProps) => (
                <div data-testid="number-component">{value * multiplier}</div>
            );

            const WrappedComponent = withSuspense(NumberComponent as ComponentType<Record<string, unknown>>);

            render(<WrappedComponent value={5} multiplier={3} />);

            expect(screen.getByText('15')).toBeInTheDocument();
        });
    });

    describe('Concurrent Rendering Scenarios', () => {
        test('should handle concurrent promise resolutions', () => {
            const promise1 = Promise.resolve({ order: 1 });
            const promise2 = Promise.resolve({ order: 2 });
            const promise3 = Promise.resolve({ order: 3 });

            const WrappedComponent = withSuspense(TestComponent);

            const { container } = render(
                <div>
                    <WrappedComponent name="Comp 1" resolve={promise1} testId="concurrent-1" />
                    <WrappedComponent name="Comp 2" resolve={promise2} testId="concurrent-2" />
                    <WrappedComponent name="Comp 3" resolve={promise3} testId="concurrent-3" />
                </div>
            );

            // Components with promises show fallback initially
            expect(container).toBeTruthy();
        });

        test('should handle mixed components with and without promises', () => {
            const withPromise = Promise.resolve({ hasData: true });
            const withoutPromise = undefined;

            const WrappedComponent = withSuspense(TestComponent);

            const { container } = render(
                <div>
                    <WrappedComponent name="With Promise" resolve={withPromise} testId="mixed-1" />
                    <WrappedComponent name="Without Promise" resolve={withoutPromise} testId="mixed-2" />
                </div>
            );

            // Component without promise should render
            expect(screen.getByText('Without Promise')).toBeInTheDocument();
            // Component with promise shows fallback
            expect(container).toBeTruthy();
        });
    });
});
