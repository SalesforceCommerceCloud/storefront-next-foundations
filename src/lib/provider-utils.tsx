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
import { type ComponentType, type ReactElement, type ReactNode } from 'react';

type ProviderProps = { children: ReactNode };
type ProviderComponent = ComponentType<ProviderProps>;

/**
 * Higher-order component that applies multiple providers to a component.
 *
 * Providers are applied in the order they are passed, with the first provider
 * being the outermost and the last being the innermost.
 *
 * @param providers - Array of provider components to apply
 * @returns A higher-order component that wraps a component with all providers
 *
 * @example
 * ```tsx
 * const withAppProviders = applyProviders(
 *   ThemeProvider,
 *   AuthProvider,
 *   I18nProvider
 * );
 *
 * const AppWithProviders = withAppProviders(App);
 * ```
 */
export function applyProviders(...providers: ProviderComponent[]) {
    return <P extends Record<string, unknown>>(Component: ComponentType<P>) => {
        return (props: P): ReactElement => {
            return providers.reduceRight((acc, Provider) => <Provider>{acc}</Provider>, <Component {...props} />);
        };
    };
}
