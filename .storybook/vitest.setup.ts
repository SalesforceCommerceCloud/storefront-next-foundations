import { beforeAll, vi } from 'vitest';
import { mockConfig } from '../src/test-utils/config';

// CRITICAL: Set window.__APP_CONFIG__ BEFORE importing any modules
// This ensures getConfig() works during module initialization in tests where it is used
// before the config provider is rendered (e.g., AuthContext initialization)
(window as unknown as Window & { __APP_CONFIG__: typeof mockConfig }).__APP_CONFIG__ = mockConfig;

// Now we can safely import other modules that depend on config
// eslint-disable-next-line import/no-namespace
import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview';
import { setProjectAnnotations } from '@storybook/react-vite';
// eslint-disable-next-line import/no-namespace
import * as projectAnnotations from './preview';

// Mock react-router BEFORE any other imports to provide createCookie that middlewares/i18next needs
// But preserve the actual router functionality for tests
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        createCookie: (name: string) => ({
            name,
            parse: () => null,
            serialize: () => '',
        }),
    };
});

// Make `useConfig()` resolve to the shared mock config for snapshot tests
// that render components outside the Storybook decorator chain (which would
// otherwise wrap them in `<ConfigProvider>`). `getConfig()` is already
// covered above via `window.__APP_CONFIG__`; `useConfig()` reads from React
// context, so we replace it at the SDK boundary so any caller (production
// component or shared util) renders without per-file `<ConfigProvider>` wiring.
//
// Snapshots that need a richer config (e.g., specific `auth.otpLength`) can
// still override this via their own `vi.mock(...)` call — those take
// precedence over this setup-level default.
vi.mock('@salesforce/storefront-next-runtime/config', async () => {
    const actual = await vi.importActual<typeof import('@salesforce/storefront-next-runtime/config')>(
        '@salesforce/storefront-next-runtime/config'
    );
    return {
        ...actual,
        useConfig: () => mockConfig,
    };
});

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import resources from '../src/locales';

// Initialize i18next for tests that use components with useTranslation
// This runs before all tests but individual tests can reinitialize as needed
beforeAll(() => {
    if (!i18next.isInitialized) {
        void i18next.use(initReactI18next).init({
            lng: 'en-GB',
            fallbackLng: 'en-GB',
            resources,
            interpolation: {
                escapeValue: false,
                format: (value, format) => {
                    if (format === 'number' && typeof value === 'number') {
                        return value.toLocaleString('en-GB');
                    }
                    return value;
                },
            },
        });
    }
});

// Mock getInstance to return an i18next instance for server actions
// Individual tests can override this if needed
vi.mock('@/middlewares/i18next', () => {
    // Create a simple mock i18next that has the t function with proper namespaces
    const mockI18next = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        t: (key: string, options?: any) => {
            // Handle namespace:key format
            if (key.includes(':')) {
                const [ns, ...keyParts] = key.split(':');
                const keyPath = keyParts.join(':'); // rejoin in case there are multiple colons

                // Navigate nested object using dot notation
                const keys = keyPath.split('.');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let value: any = resources['en-GB'][ns as keyof (typeof resources)['en-GB']];
                for (const k of keys) {
                    if (value && typeof value === 'object') {
                        value = value[k];
                    } else {
                        break;
                    }
                }

                if (typeof value === 'string' && options) {
                    // Simple interpolation for {{variable}} and {{variable, number}} syntax
                    return value.replace(/\{\{(\w+)(?:,\s*number)?\}\}/g, (_, prop) => {
                        const val = options[prop];
                        if (val === undefined) return `{{${prop}}}`;
                        // Format numbers with locale-specific thousands separators
                        if (typeof val === 'number') {
                            return val.toLocaleString('en-GB');
                        }
                        return val;
                    });
                }
                return value || key;
            }
            return key;
        },
        language: 'en-GB',
    };

    return {
        getInstance: () => mockI18next,
        getLocale: () => 'en-GB',
        i18nextMiddleware: vi.fn(),
        localeCookie: { name: 'locale' },
    };
});

// This is an important step to apply the right configuration when testing your stories.
// More info at: https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
const project = setProjectAnnotations([a11yAddonAnnotations, projectAnnotations]);

beforeAll(project.beforeAll);
