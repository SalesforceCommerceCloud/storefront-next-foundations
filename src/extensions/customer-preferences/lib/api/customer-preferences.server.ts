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
/** @sfdc-extension-file SFDC_EXT_CUSTOMER_PREFERENCES */

/**
 * @feature-stub Customer interests & preferences (server module)
 * @status stub — no backend integration
 *
 * Server-only API for the Customer Preferences extension.
 *
 * This module ships with mock fixtures so the extension is fully functional
 * out of the box. A merchant integrating a real backend should replace the
 * body of each function — the call sites in the loader and action route do
 * not need to change.
 *
 * Persistence note: the in-memory stores below live for the lifetime of the
 * server process. In a multi-process or serverless deployment, mock writes
 * will not survive restarts or be visible across processes. Replace with a
 * real store before relying on persistence in production.
 *
 * See docs/README-FEATURE-STUBS.md for the full list and guidance on
 * productionizing or removing stubs.
 */

export interface InterestOption {
    id: string;
    name: string;
    description?: string;
    category: string;
}

export interface InterestCategory {
    id: string;
    name: string;
    description?: string;
    options: InterestOption[];
}

export interface CustomerInterests {
    selectedInterestIds: string[];
}

export interface CategorizedInterests {
    categories: InterestCategory[];
}

export interface PreferenceOption {
    id: string;
    name: string;
    description?: string;
    type: 'toggle' | 'select' | 'multi-select' | 'button-group' | 'text-group';
    options?: { value: string; label: string }[];
    fields?: { id: string; label: string; placeholder?: string; width?: 'half' | 'full' }[];
}

export type PreferenceValue = boolean | string | string[] | Record<string, string>;

export interface CustomerPreferences {
    preferences: Record<string, PreferenceValue>;
}

/**
 * Aggregated payload returned to the loader. Bundling reads into a single
 * call keeps the route loader free of extension-specific orchestration.
 */
export interface CustomerPreferencesData {
    availableInterests: InterestOption[];
    interestCategories: InterestCategory[];
    customerInterests: CustomerInterests;
    availablePreferences: PreferenceOption[];
    customerPreferences: CustomerPreferences;
}

const INTEREST_CATEGORIES: InterestCategory[] = [
    {
        id: 'design_styles',
        name: 'Design Styles',
        description: 'Your preferred design styles',
        options: [
            { id: 'minimalist', name: 'Minimalist', category: 'design_styles' },
            { id: 'geometric', name: 'Geometric', category: 'design_styles' },
            { id: 'organic', name: 'Organic', category: 'design_styles' },
            { id: 'abstract', name: 'Abstract', category: 'design_styles' },
            { id: 'traditional', name: 'Traditional', category: 'design_styles' },
            { id: 'contemporary', name: 'Contemporary', category: 'design_styles' },
            { id: 'bohemian', name: 'Bohemian', category: 'design_styles' },
            { id: 'industrial', name: 'Industrial', category: 'design_styles' },
        ],
    },
    {
        id: 'room_types',
        name: 'Room Types',
        description: 'Rooms you are interested in decorating',
        options: [
            { id: 'living_room', name: 'Living Room', category: 'room_types' },
            { id: 'office', name: 'Office', category: 'room_types' },
            { id: 'bedroom', name: 'Bedroom', category: 'room_types' },
            { id: 'kitchen', name: 'Kitchen', category: 'room_types' },
            { id: 'bathroom', name: 'Bathroom', category: 'room_types' },
            { id: 'dining_room', name: 'Dining Room', category: 'room_types' },
            { id: 'outdoor', name: 'Outdoor', category: 'room_types' },
            { id: 'entryway', name: 'Entryway', category: 'room_types' },
        ],
    },
    {
        id: 'materials',
        name: 'Materials',
        description: 'Your preferred materials',
        options: [
            { id: 'ceramic', name: 'Ceramic', category: 'materials' },
            { id: 'wood', name: 'Wood', category: 'materials' },
            { id: 'metal', name: 'Metal', category: 'materials' },
            { id: 'glass', name: 'Glass', category: 'materials' },
            { id: 'fabric', name: 'Fabric', category: 'materials' },
            { id: 'leather', name: 'Leather', category: 'materials' },
            { id: 'stone', name: 'Stone', category: 'materials' },
            { id: 'rattan', name: 'Rattan', category: 'materials' },
        ],
    },
    {
        id: 'aesthetics',
        name: 'Aesthetics',
        description: 'Your preferred aesthetics',
        options: [
            { id: 'modern', name: 'Modern', category: 'aesthetics' },
            { id: 'vintage', name: 'Vintage', category: 'aesthetics' },
            { id: 'rustic', name: 'Rustic', category: 'aesthetics' },
            { id: 'scandinavian', name: 'Scandinavian', category: 'aesthetics' },
            { id: 'mid_century', name: 'Mid-Century', category: 'aesthetics' },
            { id: 'coastal', name: 'Coastal', category: 'aesthetics' },
            { id: 'farmhouse', name: 'Farmhouse', category: 'aesthetics' },
            { id: 'art_deco', name: 'Art Deco', category: 'aesthetics' },
        ],
    },
];

const AVAILABLE_INTERESTS: InterestOption[] = INTEREST_CATEGORIES.flatMap((c) => c.options);

const AVAILABLE_PREFERENCES: PreferenceOption[] = [
    {
        id: 'product_categories',
        name: 'Product Categories',
        description: 'Select product categories you are interested in',
        type: 'multi-select',
        options: [
            { value: 'geometric', label: 'Geometric' },
            { value: 'sets', label: 'Sets' },
            { value: 'abstract', label: 'Abstract' },
            { value: 'floral', label: 'Floral' },
            { value: 'minimalist', label: 'Minimalist' },
            { value: 'vintage', label: 'Vintage' },
            { value: 'modern', label: 'Modern' },
            { value: 'rustic', label: 'Rustic' },
        ],
    },
    {
        id: 'shopping_preferences',
        name: 'Shopping Preferences',
        description: 'Select your shopping preference',
        type: 'button-group',
        options: [
            { value: 'womens', label: "Women's" },
            { value: 'mens', label: "Men's" },
            { value: 'unisex', label: 'Unisex' },
        ],
    },
    {
        id: 'measures',
        name: 'Measures',
        description: 'Enter your room dimensions for better product recommendations',
        type: 'text-group',
        fields: [
            { id: 'room_width', label: 'Room Width (inches)', placeholder: 'e.g., 120', width: 'half' },
            { id: 'room_length', label: 'Room Length (inches)', placeholder: 'e.g., 180', width: 'half' },
            { id: 'ceiling_height', label: 'Ceiling Height (inches)', placeholder: 'e.g., 96', width: 'full' },
        ],
    },
    {
        id: 'size_preference',
        name: 'Preferred Product Size',
        description: 'Help us recommend products that fit your space',
        type: 'select',
        options: [
            { value: 'no_preference', label: 'No preference' },
            { value: 'small', label: 'Small (S)' },
            { value: 'medium', label: 'Medium (M)' },
            { value: 'large', label: 'Large (L)' },
            { value: 'extra_large', label: 'Extra Large (XL)' },
        ],
    },
];

const DEFAULT_PREFERENCES: Record<string, PreferenceValue> = {
    product_categories: [],
    shopping_preferences: '',
    measures: { room_width: '', room_length: '', ceiling_height: '' },
    size_preference: 'no_preference',
};

const interestsStore = new Map<string, string[]>();
const preferencesStore = new Map<string, Record<string, PreferenceValue>>();

const VALID_INTEREST_IDS = new Set(AVAILABLE_INTERESTS.map((i) => i.id));
const VALID_PREFERENCE_IDS = new Set(AVAILABLE_PREFERENCES.map((p) => p.id));

export function getCustomerPreferencesData(customerId: string): Promise<CustomerPreferencesData> {
    return Promise.resolve({
        availableInterests: [...AVAILABLE_INTERESTS],
        interestCategories: INTEREST_CATEGORIES.map((c) => ({ ...c, options: [...c.options] })),
        customerInterests: { selectedInterestIds: [...(interestsStore.get(customerId) ?? [])] },
        availablePreferences: [...AVAILABLE_PREFERENCES],
        customerPreferences: {
            preferences: { ...(preferencesStore.get(customerId) ?? DEFAULT_PREFERENCES) },
        },
    });
}

export function updateCustomerInterests(customerId: string, interestIds: string[]): Promise<CustomerInterests> {
    const validated = interestIds.filter((id) => VALID_INTEREST_IDS.has(id));
    interestsStore.set(customerId, validated);
    return Promise.resolve({ selectedInterestIds: [...validated] });
}

export function updateCustomerPreferences(
    customerId: string,
    preferences: Record<string, PreferenceValue>
): Promise<CustomerPreferences> {
    const current = preferencesStore.get(customerId) ?? { ...DEFAULT_PREFERENCES };
    const merged = { ...current };
    for (const [key, value] of Object.entries(preferences)) {
        if (VALID_PREFERENCE_IDS.has(key)) {
            merged[key] = value;
        }
    }
    preferencesStore.set(customerId, merged);
    return Promise.resolve({ preferences: { ...merged } });
}
