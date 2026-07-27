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
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@/components/link';
import { cn } from '@/lib/utils';

export default function PolicyLinks({ className }: { className?: string }): ReactElement {
    const { t } = useTranslation('footer');
    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-normal leading-5 text-muted-foreground',
                className
            )}>
            <Link to="/about-us" className="hover:text-foreground transition-colors">
                {t('links.aboutUs')}
            </Link>
            <Link to="/accessibility" className="hover:text-foreground transition-colors">
                {t('links.accessibility')}
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
                {t('links.privacyPolicy')}
            </Link>
            <Link to="/privacy-choices" className="hover:text-foreground transition-colors">
                {t('links.privacyChoices')}
            </Link>
        </div>
    );
}
