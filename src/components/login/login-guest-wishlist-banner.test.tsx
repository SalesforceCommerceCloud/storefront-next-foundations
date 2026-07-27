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
import { render, screen } from '@testing-library/react';
import { LoginGuestWishlistBanner } from './login-guest-wishlist-banner';

describe('LoginGuestWishlistBanner', () => {
    it('renders nothing when count is 0', () => {
        const { container } = render(<LoginGuestWishlistBanner count={0} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when count is negative', () => {
        const { container } = render(<LoginGuestWishlistBanner count={-1} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders the alert with the shared sign-in prompt copy when count > 0', () => {
        render(<LoginGuestWishlistBanner count={3} />);
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert.textContent).toContain('Sign in to see saved items from your account.');
    });

    it('renders the same copy regardless of count (count is gating, not interpolation)', () => {
        const { unmount } = render(<LoginGuestWishlistBanner count={1} />);
        expect(screen.getByRole('alert').textContent).toContain('Sign in to see saved items from your account.');
        unmount();
        render(<LoginGuestWishlistBanner count={42} />);
        expect(screen.getByRole('alert').textContent).toContain('Sign in to see saved items from your account.');
    });
});
