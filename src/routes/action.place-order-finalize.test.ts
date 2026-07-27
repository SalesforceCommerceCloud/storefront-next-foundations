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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '@/scapi';
import { action as actionImpl } from './action.place-order-finalize';

const createApiError = (status: number) =>
    new ApiError({
        status,
        statusText: 'Test Error',
        headers: new Headers(),
        body: { type: '', title: '', detail: '' },
        rawBody: '{}',
        url: 'https://api.example.com/test',
        method: 'GET',
    });

const action = actionImpl as unknown as (args: {
    request: Request;
    context: never;
    params: object;
}) => Promise<Response>;

const finalizeOrderSuccessMock = vi.fn();
const saveCheckoutDataToProfileMock = vi.fn();
const getOrderMock = vi.fn();
const getAuthMock = vi.fn();
const getCustomerProfileForCheckoutMock = vi.fn();

vi.mock('@/lib/checkout/place-order-orchestration.server', () => ({
    finalizeOrderSuccess: (...args: unknown[]) => finalizeOrderSuccessMock(...args),
    saveCheckoutDataToProfile: (...args: unknown[]) => saveCheckoutDataToProfileMock(...args),
}));

vi.mock('@/lib/api-clients.server', () => ({
    createApiClients: () => ({
        shopperOrders: {
            getOrder: (...args: unknown[]) => getOrderMock(...args),
        },
    }),
}));

vi.mock('@/middlewares/auth.server', () => ({
    getAuth: (...args: unknown[]) => getAuthMock(...args),
}));

vi.mock('@/lib/api/customer.server', () => ({
    getCustomerProfileForCheckout: (...args: unknown[]) => getCustomerProfileForCheckoutMock(...args),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: () => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }),
}));

const buildRequest = (body: Record<string, string>, method = 'POST'): Request => {
    if (method === 'POST') {
        const formData = new FormData();
        for (const [k, v] of Object.entries(body)) formData.set(k, v);
        return new Request('https://test/action/place-order-finalize', { method, body: formData });
    }
    return new Request('https://test/action/place-order-finalize', { method });
};

const ctx = {} as never;

describe('action.place-order-finalize', () => {
    beforeEach(() => {
        finalizeOrderSuccessMock.mockReset();
        saveCheckoutDataToProfileMock.mockReset();
        getOrderMock.mockReset();
        getAuthMock.mockReset();
        getCustomerProfileForCheckoutMock.mockReset();

        finalizeOrderSuccessMock.mockReturnValue('/site/order-confirmation/00001234');
        getOrderMock.mockResolvedValue({
            data: { orderNo: '00001234', customerInfo: { email: '[email protected]' } },
        });
        getAuthMock.mockReturnValue({ userType: 'guest', customerId: undefined });
        getCustomerProfileForCheckoutMock.mockResolvedValue(null);
        saveCheckoutDataToProfileMock.mockResolvedValue(undefined);
    });

    it('returns 405 for non-POST methods', async () => {
        const response = await action({ request: buildRequest({}, 'GET'), context: ctx, params: {} });
        expect(response.status).toBe(405);
        expect(getOrderMock).not.toHaveBeenCalled();
    });

    it('returns 200 + redirectUrl and tears down basket via finalizeOrderSuccess for a valid orderNo', async () => {
        const response = await action({ request: buildRequest({ orderNo: '00001234' }), context: ctx, params: {} });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({ success: true, redirectUrl: '/site/order-confirmation/00001234' });
        expect(getOrderMock).toHaveBeenCalledOnce();
        expect(finalizeOrderSuccessMock).toHaveBeenCalledWith(ctx, expect.objectContaining({ orderNo: '00001234' }));
    });

    it('returns 404 NOT_FOUND when SCAPI getOrder returns 404 (order absent or not owned by shopper) without retrying', async () => {
        getOrderMock.mockRejectedValue(createApiError(404));
        const response = await action({ request: buildRequest({ orderNo: '99999999' }), context: ctx, params: {} });
        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error).toEqual(expect.objectContaining({ code: 'NOT_FOUND' }));
        expect(getOrderMock).toHaveBeenCalledTimes(1);
        expect(saveCheckoutDataToProfileMock).not.toHaveBeenCalled();
        expect(finalizeOrderSuccessMock).not.toHaveBeenCalled();
    });

    it('retries once and succeeds when the first getOrder call hits a transient 5xx', async () => {
        getOrderMock
            .mockRejectedValueOnce(createApiError(503))
            .mockResolvedValueOnce({ data: { orderNo: '00001234', customerInfo: { email: '[email protected]' } } });
        const response = await action({ request: buildRequest({ orderNo: '00001234' }), context: ctx, params: {} });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({ success: true, redirectUrl: '/site/order-confirmation/00001234' });
        expect(getOrderMock).toHaveBeenCalledTimes(2);
        expect(finalizeOrderSuccessMock).toHaveBeenCalledOnce();
    });

    it('retries once and succeeds when the first getOrder call hits a 429 (rate-limited)', async () => {
        getOrderMock
            .mockRejectedValueOnce(createApiError(429))
            .mockResolvedValueOnce({ data: { orderNo: '00001234', customerInfo: { email: '[email protected]' } } });
        const response = await action({ request: buildRequest({ orderNo: '00001234' }), context: ctx, params: {} });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({ success: true, redirectUrl: '/site/order-confirmation/00001234' });
        expect(getOrderMock).toHaveBeenCalledTimes(2);
        expect(finalizeOrderSuccessMock).toHaveBeenCalledOnce();
    });

    it('tears down basket and returns redirectUrl when getOrder returns 5xx on both attempts (order already created)', async () => {
        getOrderMock.mockRejectedValue(createApiError(500));
        const response = await action({ request: buildRequest({ orderNo: '00001234' }), context: ctx, params: {} });
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error).toEqual(expect.objectContaining({ code: 'OPERATION_FAILED' }));
        expect(body.redirectUrl).toBe('/site/order-confirmation/00001234');
        expect(getOrderMock).toHaveBeenCalledTimes(2);
        expect(finalizeOrderSuccessMock).toHaveBeenCalledWith(ctx, { orderNo: '00001234' });
        expect(saveCheckoutDataToProfileMock).not.toHaveBeenCalled();
    });

    it('tears down basket and returns redirectUrl when getOrder throws non-ApiError (network/timeout) twice', async () => {
        getOrderMock.mockRejectedValue(new Error('boom'));
        const response = await action({ request: buildRequest({ orderNo: '00001234' }), context: ctx, params: {} });
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error).toEqual(expect.objectContaining({ code: 'OPERATION_FAILED' }));
        expect(body.redirectUrl).toBe('/site/order-confirmation/00001234');
        expect(getOrderMock).toHaveBeenCalledTimes(2);
        expect(finalizeOrderSuccessMock).toHaveBeenCalledWith(ctx, { orderNo: '00001234' });
        expect(saveCheckoutDataToProfileMock).not.toHaveBeenCalled();
    });

    it('rejects a missing orderNo with 400 and does not call SCAPI', async () => {
        const response = await action({ request: buildRequest({}), context: ctx, params: {} });
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error).toEqual(expect.objectContaining({ code: 'REQUIRED_FIELD' }));
        expect(getOrderMock).not.toHaveBeenCalled();
    });

    it('saves profile data for an authenticated shopper before finalizing', async () => {
        getAuthMock.mockReturnValue({ userType: 'registered', customerId: 'cust-1' });
        getCustomerProfileForCheckoutMock.mockResolvedValue({
            customer: { customerId: 'cust-1' },
            addresses: [],
            paymentInstruments: [],
        });
        const response = await action({
            request: buildRequest({
                orderNo: '00001234',
                shouldCreateAccount: 'true',
                checkoutRegistrationIntent: 'true',
            }),
            context: ctx,
            params: {},
        });
        expect(response.status).toBe(200);
        expect(saveCheckoutDataToProfileMock).toHaveBeenCalledOnce();
        const arg = saveCheckoutDataToProfileMock.mock.calls[0][1];
        expect(arg.customerId).toBe('cust-1');
        expect(arg.registeredViaCheckout).toBe(true);
    });

    it('skips profile save for a guest shopper', async () => {
        const response = await action({ request: buildRequest({ orderNo: '00001234' }), context: ctx, params: {} });
        expect(response.status).toBe(200);
        expect(saveCheckoutDataToProfileMock).not.toHaveBeenCalled();
        expect(finalizeOrderSuccessMock).toHaveBeenCalledOnce();
    });

    it('continues to teardown when profile save throws', async () => {
        getAuthMock.mockReturnValue({ userType: 'registered', customerId: 'cust-1' });
        getCustomerProfileForCheckoutMock.mockResolvedValue({ customer: { customerId: 'cust-1' }, addresses: [] });
        saveCheckoutDataToProfileMock.mockRejectedValue(new Error('SCAPI flake'));

        const response = await action({ request: buildRequest({ orderNo: '00001234' }), context: ctx, params: {} });
        expect(response.status).toBe(200);
        expect(finalizeOrderSuccessMock).toHaveBeenCalledOnce();
    });

    it('flags isNewlyRegisteredWithEmptyProfile when registered shopper has empty profile and did not register this checkout', async () => {
        getAuthMock.mockReturnValue({ userType: 'registered', customerId: 'cust-1' });
        getCustomerProfileForCheckoutMock.mockResolvedValue({
            customer: { customerId: 'cust-1' /* no phoneHome */ },
            addresses: [],
            paymentInstruments: [],
        });

        // shouldCreateAccount + checkoutRegistrationIntent omitted -> registeredViaCheckout=false.
        const response = await action({ request: buildRequest({ orderNo: '00001234' }), context: ctx, params: {} });
        expect(response.status).toBe(200);
        const arg = saveCheckoutDataToProfileMock.mock.calls[0]?.[1];
        expect(arg?.registeredViaCheckout).toBe(false);
        expect(arg?.isNewlyRegisteredWithEmptyProfile).toBe(true);
    });

    it('continues to teardown when getCustomerProfileForCheckout throws', async () => {
        getAuthMock.mockReturnValue({ userType: 'registered', customerId: 'cust-1' });
        getCustomerProfileForCheckoutMock.mockRejectedValue(new Error('SCAPI flake'));

        const response = await action({ request: buildRequest({ orderNo: '00001234' }), context: ctx, params: {} });
        expect(response.status).toBe(200);
        expect(finalizeOrderSuccessMock).toHaveBeenCalledOnce();
        // Profile save still runs but with profileSnapshot: null (no dedupe baseline).
        const arg = saveCheckoutDataToProfileMock.mock.calls[0]?.[1];
        expect(arg?.profileSnapshot).toBeNull();
    });

    it('passes registration metadata to finalizeOrderSuccess when registered via checkout', async () => {
        getAuthMock.mockReturnValue({ userType: 'registered', customerId: 'cust-1' });
        getCustomerProfileForCheckoutMock.mockResolvedValue({ customer: { customerId: 'cust-1' }, addresses: [] });
        getOrderMock.mockResolvedValue({
            data: { orderNo: '00001234', customerInfo: { email: '[email protected]' } },
        });

        await action({
            request: buildRequest({
                orderNo: '00001234',
                shouldCreateAccount: 'true',
                checkoutRegistrationIntent: 'true',
            }),
            context: ctx,
            params: {},
        });
        expect(finalizeOrderSuccessMock).toHaveBeenCalledWith(
            ctx,
            expect.objectContaining({
                orderNo: '00001234',
                registration: { email: '[email protected]' },
            })
        );
    });
});
