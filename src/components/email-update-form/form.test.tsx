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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EmailUpdateForm } from './form';
import { ConfigWrapper } from '@/test-utils/config';

const mockSubmit = vi.fn().mockResolvedValue(undefined);

function createMockFetcher(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        state: 'idle',
        data: undefined,
        errors: undefined,
        success: false,
        submit: mockSubmit,
        load: vi.fn(),
        Form: vi.fn() as any,
        formAction: undefined,
        formData: undefined,
        formEncType: undefined,
        formMethod: undefined,
        formTarget: undefined,
        type: 'init' as const,
        json: undefined,
        text: undefined,
        reset: vi.fn(),
        ...overrides,
    } as any;
}

function renderForm(props: Partial<Parameters<typeof EmailUpdateForm>[0]> = {}) {
    const fetcher = createMockFetcher();
    return {
        fetcher,
        ...render(
            <ConfigWrapper>
                <EmailUpdateForm updateFetcher={fetcher} {...props} />
            </ConfigWrapper>
        ),
    };
}

describe('EmailUpdateForm submission', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('submits email and login when valid email and password are provided', async () => {
        const user = userEvent.setup();
        renderForm({
            initialData: { email: 'user@example.com', currentPassword: 'myPassword' },
        });

        await user.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
            expect(mockSubmit).toHaveBeenCalledTimes(1);
        });
        const payload = mockSubmit.mock.calls[0][0];
        expect(payload.email).toBe('user@example.com');
        expect(payload.login).toBe('user@example.com');
        expect(payload.currentPassword).toBe('myPassword');
    });

    it.each([
        {
            label: 'invalid email',
            initialData: { email: 'not-an-email', currentPassword: 'myPassword' },
        },
        {
            label: 'empty email',
            initialData: { email: '', currentPassword: 'myPassword' },
        },
        {
            label: 'empty currentPassword (requirePassword=true)',
            initialData: { email: 'user@example.com', currentPassword: '' },
            requirePassword: true as const,
        },
    ])('does not submit when $label', async ({ initialData, requirePassword }) => {
        const user = userEvent.setup();
        renderForm({ initialData, requirePassword });

        await user.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
            expect(screen.getByTestId('email-update-form')).toBeInTheDocument();
        });
        expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('submits without currentPassword when requirePassword=false', async () => {
        const user = userEvent.setup();
        renderForm({
            initialData: { email: 'user@example.com' },
            requirePassword: false,
        });

        await user.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
            expect(mockSubmit).toHaveBeenCalledTimes(1);
        });
        const payload = mockSubmit.mock.calls[0][0];
        expect(payload.email).toBe('user@example.com');
        expect(payload.login).toBe('user@example.com');
        expect(payload).not.toHaveProperty('currentPassword');
    });

    it('calls onSuccess with form data when fetcher transitions to idle with success', async () => {
        const onSuccess = vi.fn();
        const submittingFetcher = createMockFetcher({ state: 'submitting' });

        const { rerender } = render(
            <ConfigWrapper>
                <EmailUpdateForm
                    updateFetcher={submittingFetcher}
                    initialData={{ email: 'user@example.com', currentPassword: 'myPassword' }}
                    onSuccess={onSuccess}
                />
            </ConfigWrapper>
        );

        expect(onSuccess).not.toHaveBeenCalled();

        const successFetcher = createMockFetcher({ state: 'idle', success: true, data: { success: true } });

        rerender(
            <ConfigWrapper>
                <EmailUpdateForm
                    updateFetcher={successFetcher}
                    initialData={{ email: 'user@example.com', currentPassword: 'myPassword' }}
                    onSuccess={onSuccess}
                />
            </ConfigWrapper>
        );

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledTimes(1);
        });
        expect(onSuccess).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'user@example.com',
                currentPassword: 'myPassword',
            })
        );
    });

    it('calls onError with error message when fetcher transitions to idle with errors', async () => {
        const onError = vi.fn();
        const submittingFetcher = createMockFetcher({ state: 'submitting' });

        const { rerender } = render(
            <ConfigWrapper>
                <EmailUpdateForm
                    updateFetcher={submittingFetcher}
                    initialData={{ email: 'user@example.com', currentPassword: 'myPassword' }}
                    onError={onError}
                />
            </ConfigWrapper>
        );

        expect(onError).not.toHaveBeenCalled();

        const errorFetcher = createMockFetcher({
            state: 'idle',
            success: false,
            errors: ['Email already in use', 'Server error'],
        });

        rerender(
            <ConfigWrapper>
                <EmailUpdateForm
                    updateFetcher={errorFetcher}
                    initialData={{ email: 'user@example.com', currentPassword: 'myPassword' }}
                    onError={onError}
                />
            </ConfigWrapper>
        );

        await waitFor(() => {
            expect(onError).toHaveBeenCalledTimes(1);
        });
        expect(onError).toHaveBeenCalledWith('Failed to update email address. Try again.');
    });

    it('calls onCancel and resets form when cancel is clicked', async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();
        renderForm({
            initialData: { email: 'user@example.com', currentPassword: 'myPassword' },
            onCancel,
        });

        await user.click(screen.getByRole('button', { name: /cancel/i }));

        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});
