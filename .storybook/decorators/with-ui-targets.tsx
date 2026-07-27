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
import { UITargetProviders } from '@/targets/ui-target-providers';
import { StorybookWrapper } from './with-providers';

/**
 * `<StoryShell>` — the full provider + UI-targets stack stories sit inside.
 * Composed of `StorybookWrapper` (providers) and `UITargetProviders`. The
 * router decorator (`withRouter`) takes this component as its wrapper so the
 * stack ordering stays providers → UITargets → Story.
 *
 * Uses an explicit `return` statement so `transformTargetPlaceholderPlugin`
 * (in `storefront-next-dev`) can detect and rewrite the `<UITargetProviders>`
 * JSX. The plugin only inspects `VariableDeclaration` (where the initializer
 * is a JSXElement) and `ReturnStatement` AST nodes; an arrow function with an
 * implicit-return JSX body is invisible to it, which would leave the
 * `UITargetProviders` identifier unbound at runtime in production builds.
 */
export function StoryShell({ children }: { children: ReactNode }) {
    return (
        <StorybookWrapper>
            <UITargetProviders>{children}</UITargetProviders>
        </StorybookWrapper>
    );
}
