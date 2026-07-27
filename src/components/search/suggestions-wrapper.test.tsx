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
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router';
import Suggestions from './suggestions';

// Mock the child components
vi.mock('./suggestions-section', () => ({
    default: () => <div data-testid="suggestions-section">API Suggestions</div>,
}));

vi.mock('./recent-searches', () => ({
    default: () => <div data-testid="recent-searches">Recent Searches</div>,
}));

const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Suggestions Wrapper Component', () => {
    const mockCloseAndNavigate = vi.fn();
    const mockClearRecentSearches = vi.fn();

    it('should render SuggestionsSection when API suggestions are available', () => {
        const searchSuggestions = {
            categorySuggestions: [{ name: 'Electronics', link: '/category/electronics', type: 'category' }],
            productSuggestions: [],
            popularSearchSuggestions: [],
        };

        renderWithRouter(
            <Suggestions
                searchSuggestions={searchSuggestions}
                recentSearches={['shoes']}
                closeAndNavigate={mockCloseAndNavigate}
                clearRecentSearches={mockClearRecentSearches}
            />
        );

        expect(screen.getByTestId('suggestions-section')).toBeInTheDocument();
        expect(screen.queryByTestId('recent-searches')).not.toBeInTheDocument();
    });

    it('should render SuggestionsSection when products are available', () => {
        const searchSuggestions = {
            categorySuggestions: [],
            productSuggestions: [{ name: 'iPhone', link: '/product/iphone', type: 'product', price: 999 }],
            popularSearchSuggestions: [],
        };

        renderWithRouter(
            <Suggestions
                searchSuggestions={searchSuggestions}
                recentSearches={[]}
                closeAndNavigate={mockCloseAndNavigate}
                clearRecentSearches={mockClearRecentSearches}
            />
        );

        expect(screen.getByTestId('suggestions-section')).toBeInTheDocument();
        expect(screen.queryByTestId('recent-searches')).not.toBeInTheDocument();
    });

    it('should render SuggestionsSection when popular searches are available', () => {
        const searchSuggestions = {
            categorySuggestions: [],
            productSuggestions: [],
            popularSearchSuggestions: [{ name: 'Popular 1', link: '/search?q=popular%201', type: 'popular' }],
        };

        renderWithRouter(
            <Suggestions
                searchSuggestions={searchSuggestions}
                recentSearches={[]}
                closeAndNavigate={mockCloseAndNavigate}
                clearRecentSearches={mockClearRecentSearches}
            />
        );

        expect(screen.getByTestId('suggestions-section')).toBeInTheDocument();
        expect(screen.queryByTestId('recent-searches')).not.toBeInTheDocument();
    });

    it('should render RecentSearches when no API suggestions are available', () => {
        const searchSuggestions = {
            categorySuggestions: [],
            productSuggestions: [],
            popularSearchSuggestions: [],
        };

        renderWithRouter(
            <Suggestions
                searchSuggestions={searchSuggestions}
                recentSearches={['shoes', 'boots']}
                closeAndNavigate={mockCloseAndNavigate}
                clearRecentSearches={mockClearRecentSearches}
            />
        );

        expect(screen.getByTestId('recent-searches')).toBeInTheDocument();
        expect(screen.queryByTestId('suggestions-section')).not.toBeInTheDocument();
    });

    it('should render RecentSearches when searchSuggestions is null', () => {
        renderWithRouter(
            <Suggestions
                searchSuggestions={null}
                recentSearches={['shoes']}
                closeAndNavigate={mockCloseAndNavigate}
                clearRecentSearches={mockClearRecentSearches}
            />
        );

        expect(screen.getByTestId('recent-searches')).toBeInTheDocument();
        expect(screen.queryByTestId('suggestions-section')).not.toBeInTheDocument();
    });

    it('should handle empty arrays in searchSuggestions', () => {
        const searchSuggestions = {
            categorySuggestions: [],
            productSuggestions: [],
            popularSearchSuggestions: [],
        };

        renderWithRouter(
            <Suggestions
                searchSuggestions={searchSuggestions}
                recentSearches={[]}
                closeAndNavigate={mockCloseAndNavigate}
                clearRecentSearches={mockClearRecentSearches}
            />
        );

        expect(screen.getByTestId('recent-searches')).toBeInTheDocument();
    });

    it('should prioritize API suggestions over recent searches', () => {
        const searchSuggestions = {
            categorySuggestions: [{ name: 'Electronics', link: '/category/electronics', type: 'category' }],
            productSuggestions: [],
            popularSearchSuggestions: [],
        };

        renderWithRouter(
            <Suggestions
                searchSuggestions={searchSuggestions}
                recentSearches={['shoes', 'boots', 'sneakers']}
                closeAndNavigate={mockCloseAndNavigate}
                clearRecentSearches={mockClearRecentSearches}
            />
        );

        // Should show API suggestions, not recent searches
        expect(screen.getByTestId('suggestions-section')).toBeInTheDocument();
        expect(screen.queryByTestId('recent-searches')).not.toBeInTheDocument();
    });

    it('should handle undefined recentSearches', () => {
        const searchSuggestions = {
            categorySuggestions: [],
            productSuggestions: [],
            popularSearchSuggestions: [],
        };

        renderWithRouter(
            <Suggestions
                searchSuggestions={searchSuggestions}
                recentSearches={[]}
                closeAndNavigate={mockCloseAndNavigate}
                clearRecentSearches={mockClearRecentSearches}
            />
        );

        expect(screen.getByTestId('recent-searches')).toBeInTheDocument();
    });
});
