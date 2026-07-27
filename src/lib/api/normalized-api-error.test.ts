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
import { describe, it, expect } from 'vitest';
import { ApiError } from '@/scapi';
import { NormalizedApiError } from './normalized-api-error';

describe('NormalizedApiError', () => {
    it('should normalize an ApiError', () => {
        const apiError = new ApiError({
            status: 404,
            statusText: 'Not Found',
            headers: new Headers(),
            body: {
                type: 'https://api.example.com/errors/not-found',
                title: 'Not Found',
                detail: 'Category not found',
            },
            rawBody: JSON.stringify({ detail: 'Category not found' }),
            url: 'https://api.example.com/categories/root',
            method: 'GET',
        });

        const error = new NormalizedApiError(apiError);

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(NormalizedApiError);
        expect(error.name).toBe('NormalizedApiError');
        expect(error.message).toBe('Category not found');
        expect(error.status).toBe(404);
        expect(error.cause).toBe(apiError);
    });

    it('should normalize an ApiError with rawBody message taking precedence', () => {
        const apiError = new ApiError({
            status: 401,
            statusText: 'Unauthorized',
            headers: new Headers(),
            body: {
                type: 'https://api.example.com/errors/auth',
                title: 'Unauthorized',
                detail: 'body detail',
            },
            rawBody: JSON.stringify({ message: 'rawBody message' }),
            url: 'https://api.example.com/auth',
            method: 'POST',
        });

        const error = new NormalizedApiError(apiError);

        expect(error.message).toBe('rawBody message');
        expect(error.status).toBe(401);
    });

    it('should normalize a standard Error', () => {
        const stdError = new TypeError('Network failure');

        const error = new NormalizedApiError(stdError);

        expect(error.name).toBe('NormalizedApiError');
        expect(error.message).toBe('Network failure');
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(stdError);
    });

    it('should normalize an unknown error value', () => {
        const error = new NormalizedApiError('something went wrong');

        expect(error.name).toBe('NormalizedApiError');
        expect(error.message).toBe('An error occurred');
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe('something went wrong');
    });

    it('should normalize an ApiError falling back to statusText', () => {
        const apiError = new ApiError({
            status: 500,
            statusText: 'Internal Server Error',
            headers: new Headers(),
            body: {
                type: '',
                title: '',
                detail: '',
            },
            rawBody: '',
            url: 'https://api.example.com/products',
            method: 'GET',
        });

        const error = new NormalizedApiError(apiError);

        expect(error.message).toBe('Internal Server Error');
        expect(error.status).toBe(500);
    });
});
