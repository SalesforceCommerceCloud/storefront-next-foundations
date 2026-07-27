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
import { VisitorContextError } from './visitor-context-error';

describe('VisitorContextError', () => {
    test('is an instance of Error', () => {
        const error = new VisitorContextError('test');
        expect(error).toBeInstanceOf(Error);
    });

    test('has name "VisitorContextError"', () => {
        const error = new VisitorContextError('test');
        expect(error.name).toBe('VisitorContextError');
    });

    test('carries the provided message', () => {
        const error = new VisitorContextError('invalid child type');
        expect(error.message).toBe('invalid child type');
    });

    describe('assert', () => {
        test('allows page → region', () => {
            expect(() => VisitorContextError.assert('page', 'region')).not.toThrow();
        });

        test('allows component → region', () => {
            expect(() => VisitorContextError.assert('component', 'region')).not.toThrow();
        });

        test('allows region → component', () => {
            expect(() => VisitorContextError.assert('region', 'component')).not.toThrow();
        });

        test('throws for page → component', () => {
            expect(() => VisitorContextError.assert('page', 'component')).toThrow(VisitorContextError);
            expect(() => VisitorContextError.assert('page', 'component')).toThrow(
                'Invalid child context type component for parent context type page'
            );
        });

        test('throws for page → page', () => {
            expect(() => VisitorContextError.assert('page', 'page')).toThrow(VisitorContextError);
        });

        test('throws for component → component', () => {
            expect(() => VisitorContextError.assert('component', 'component')).toThrow(VisitorContextError);
        });

        test('throws for component → page', () => {
            expect(() => VisitorContextError.assert('component', 'page')).toThrow(VisitorContextError);
        });

        test('throws for region → region', () => {
            expect(() => VisitorContextError.assert('region', 'region')).toThrow(VisitorContextError);
        });

        test('throws for region → page', () => {
            expect(() => VisitorContextError.assert('region', 'page')).toThrow(VisitorContextError);
        });

        test('allows root → region', () => {
            expect(() => VisitorContextError.assert('root', 'region')).not.toThrow();
        });

        test('allows root → component', () => {
            expect(() => VisitorContextError.assert('root', 'component')).not.toThrow();
        });

        test('allows root → page', () => {
            expect(() => VisitorContextError.assert('root', 'page')).not.toThrow();
        });
    });
});
