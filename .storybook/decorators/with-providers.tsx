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
import type { ReactNode } from 'react';
import { applyProviders } from '../../src/lib/provider-utils';
import { storybookProviders } from '../storybook-providers';

/**
 * HOC that wraps children in the project-wide Storybook provider stack
 * (config, site, i18n, auth, basket, store-locator, checkout one-click).
 *
 * The provider stack is intentionally an *escape hatch*, not the default —
 * stories should prefer passing data via component props when possible. See
 * `.storybook/README-STORYBOOK.md` (Story-writing principles) for the
 * props-first / mock-at-the-boundary pattern.
 */
const withStorybookProviders = applyProviders(...storybookProviders);

/**
 * `<StorybookWrapper>` — the canonical "providers + base layout" wrapper for
 * Storybook stories. Renders providers around its children with a min-h-screen
 * background so the story has consistent theming.
 *
 * Note: sonner's `toast()` API queues without a mounted `<Toaster />` — calls
 * don't error. Stories that need to assert on a rendered toast can mount
 * `<ToasterTheme />` in their own decorator. Mounting it globally would
 * introduce duplicate-landmark axe failures on stories that already render
 * their own `<section>` landmarks (e.g. checkout, contact).
 */
export const StorybookWrapper = withStorybookProviders(({ children }: { children: ReactNode }) => (
    <div className="min-h-screen bg-background text-foreground">{children}</div>
));
