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
import { SiFacebook, SiInstagram, SiX, SiYoutube } from '@icons-pack/react-simple-icons';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export default function SocialIcons({ className }: { className?: string }): ReactElement {
    const { t } = useTranslation('footer');
    return (
        <div className={cn('flex items-end gap-4', className)}>
            <a
                href="https://youtube.com/channel/UCSTGHqzR1Q9yAVbiS3dAFHg"
                aria-label={t('socialMedia.youtubeLabel')}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <SiYoutube className="w-5 h-5" />
            </a>
            <a
                href="https://instagram.com/commercecloud"
                aria-label={t('socialMedia.instagramLabel')}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <SiInstagram className="w-5 h-5" />
            </a>
            <a
                href="https://x.com/CommerceCloud"
                aria-label={t('socialMedia.xLabel')}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <SiX className="w-5 h-5" />
            </a>
            <a
                href="https://facebook.com/CommerceCloud/"
                aria-label={t('socialMedia.facebookLabel')}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <SiFacebook className="w-5 h-5" />
            </a>
        </div>
    );
}
