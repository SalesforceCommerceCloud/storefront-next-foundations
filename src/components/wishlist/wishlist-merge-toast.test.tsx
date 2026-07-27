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
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { WishlistMergeToast } from './wishlist-merge-toast';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import { mockBuildConfig, mockSiteObject } from '@/test-utils/config';
import { WISHLIST_MERGE_COOKIE_NAME } from '@/lib/wishlist/constants';

const mockAddToast = vi.fn();
const mockNavigate = vi.fn();
const mockTranslate = vi.fn((key: string) => key);

vi.mock('@/components/toast', () => ({
    useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/hooks/use-analytics', () => ({
    useAnalytics: () => ({ trackWishlistItemMerged: vi.fn(), trackWishlistMerged: vi.fn() }),
}));

vi.mock('@/hooks/use-navigate', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: mockTranslate }),
}));

function renderAt(path: string) {
    return render(
        <AllProvidersWrapper>
            <MemoryRouter initialEntries={[path]}>
                <WishlistMergeToast />
                <CurrentUrl />
            </MemoryRouter>
        </AllProvidersWrapper>
    );
}

function CurrentUrl() {
    const location = useLocation();
    return <div data-testid="current-url">{`${location.pathname}${location.search}`}</div>;
}

describe('WishlistMergeToast', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('does nothing when the URL has no wishlistMerge param', () => {
        renderAt('/account/wishlist');

        expect(mockAddToast).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('does nothing when wishlistMerge is an unexpected value', () => {
        renderAt('/account/wishlist?wishlistMerge=garbled');

        expect(mockAddToast).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('fires the success toast and strips the param', () => {
        renderAt('/account/wishlist?wishlistMerge=success');

        expect(mockAddToast).toHaveBeenCalledWith('wishlist.mergeSuccess', 'success');
        expect(mockNavigate).toHaveBeenCalledWith('/account/wishlist', { replace: true });
    });

    test('fires the partial toast and strips the param', () => {
        renderAt('/account/wishlist?wishlistMerge=partial');

        expect(mockAddToast).toHaveBeenCalledWith('wishlist.mergePartial', 'success');
        expect(mockNavigate).toHaveBeenCalledWith('/account/wishlist', { replace: true });
    });

    test('preserves other query params when stripping wishlistMerge', () => {
        renderAt('/account/wishlist?from=login&wishlistMerge=success');

        expect(mockNavigate).toHaveBeenCalledWith('/account/wishlist?from=login', { replace: true });
    });

    test('deletes the merge cookie with the global app.cookies.domain so a host-only delete cannot strand it', () => {
        // Regression guard: setWishlistMergeCookie stamps Domain from app.cookies.domain, so the
        // client delete must use the same domain or (per RFC 6265) it won't clear the cookie.
        const cookieName = `${WISHLIST_MERGE_COOKIE_NAME}_${mockSiteObject.id}`;
        const seeded = `${cookieName}=${encodeURIComponent(
            JSON.stringify({ merged: 1, skipped: 0, failed: 0, mergedProductIds: ['p1'] })
        )}`;

        const writes: string[] = [];
        const original = Object.getOwnPropertyDescriptor(document, 'cookie');
        Object.defineProperty(document, 'cookie', {
            configurable: true,
            get: () => seeded,
            set: (v: string) => {
                writes.push(v);
            },
        });

        try {
            render(
                <AllProvidersWrapper config={{ ...mockBuildConfig.app, cookies: { domain: '.global.com' } }}>
                    <MemoryRouter initialEntries={['/account/wishlist?wishlistMerge=success']}>
                        <WishlistMergeToast />
                    </MemoryRouter>
                </AllProvidersWrapper>
            );
        } finally {
            if (original) {
                Object.defineProperty(document, 'cookie', original);
            } else {
                delete (document as { cookie?: string }).cookie;
            }
        }

        const deleteWrite = writes.find((w) => w.startsWith(`${cookieName}=`) && w.includes('Max-Age=0'));
        expect(deleteWrite).toBeDefined();
        expect(deleteWrite).toContain('Domain=.global.com');
    });
});
