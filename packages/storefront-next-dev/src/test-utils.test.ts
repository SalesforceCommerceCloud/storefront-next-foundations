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
import { describe, expect, it } from 'vitest';
import { toPosixPath, pathEndsWith, pathsEqual, createPathRegex, normalizePath } from './test-utils';

describe('test-utils', () => {
    describe('toPosixPath', () => {
        it('should convert backslashes to forward slashes', () => {
            expect(toPosixPath('foo\\bar\\baz')).toBe('foo/bar/baz');
        });

        it('should handle mixed separators', () => {
            expect(toPosixPath('foo/bar\\baz')).toBe('foo/bar/baz');
        });

        it('should remove Windows drive letter prefix', () => {
            expect(toPosixPath('C:/foo/bar')).toBe('/foo/bar');
            expect(toPosixPath('D:\\foo\\bar')).toBe('/foo/bar');
        });

        it('should handle lowercase drive letters', () => {
            expect(toPosixPath('c:/foo/bar')).toBe('/foo/bar');
        });

        it('should not modify paths without drive letters', () => {
            expect(toPosixPath('/foo/bar')).toBe('/foo/bar');
        });

        it('should handle empty string', () => {
            expect(toPosixPath('')).toBe('');
        });
    });

    describe('pathEndsWith', () => {
        it('should return true when actual path ends with expected', () => {
            expect(pathEndsWith('/home/user/project/src/file.ts', 'src/file.ts')).toBe(true);
        });

        it('should return false when actual path does not end with expected', () => {
            expect(pathEndsWith('/home/user/project/src/file.ts', 'other/file.ts')).toBe(false);
        });

        it('should handle Windows paths with drive letters', () => {
            expect(pathEndsWith('C:\\Users\\project\\src\\file.ts', 'src/file.ts')).toBe(true);
        });
    });

    describe('pathsEqual', () => {
        it('should return true for equal paths', () => {
            expect(pathsEqual('/foo/bar', '/foo/bar')).toBe(true);
        });

        it('should return false for different paths', () => {
            expect(pathsEqual('/foo/bar', '/foo/baz')).toBe(false);
        });

        it('should handle Windows paths with drive letters', () => {
            expect(pathsEqual('C:/foo/bar', '/foo/bar')).toBe(true);
        });

        it('should handle backslashes', () => {
            expect(pathsEqual('C:\\foo\\bar', '/foo/bar')).toBe(true);
        });
    });

    describe('createPathRegex', () => {
        it('should create regex that matches forward slashes', () => {
            const regex = createPathRegex('/foo/bar');
            expect(regex.test('/foo/bar')).toBe(true);
        });

        it('should create regex that matches backslashes', () => {
            const regex = createPathRegex('/foo/bar');
            expect(regex.test('\\foo\\bar')).toBe(true);
        });

        it('should create regex that matches with drive letter', () => {
            const regex = createPathRegex('/foo/bar');
            expect(regex.test('C:/foo/bar')).toBe(true);
            expect(regex.test('D:\\foo\\bar')).toBe(true);
        });

        it('should escape special regex characters', () => {
            const regex = createPathRegex('/foo.bar');
            expect(regex.test('/foo.bar')).toBe(true);
            expect(regex.test('/fooXbar')).toBe(false);
        });
    });

    describe('normalizePath', () => {
        it('should be an alias for toPosixPath', () => {
            expect(normalizePath).toBe(toPosixPath);
        });

        it('should work the same as toPosixPath', () => {
            expect(normalizePath('C:\\foo\\bar')).toBe('/foo/bar');
        });
    });
});
