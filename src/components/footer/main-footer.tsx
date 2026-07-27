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
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Link } from '@/components/link';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import { stripPathPrefix } from '@salesforce/storefront-next-runtime/site-context';
import logo from '/images/logo.svg';
import LegalLinks from '@/components/footer/legal-links';
import NewsletterSection from './newsletter-section';
import PolicyLinks from './policy-links';
import SocialIcons from './social-icons';
import Switchers from './switchers';

export default function MainFooter(): ReactElement {
    const { t } = useTranslation('footer');
    const location = useLocation();
    const config = useConfig();
    const pathWithoutPrefix = stripPathPrefix({ pathname: location.pathname, prefix: config.url?.prefix || '' });
    const isHomepage = pathWithoutPrefix === '' || pathWithoutPrefix === '/';

    return (
        <footer className="mt-auto">
            {isHomepage && <NewsletterSection />}

            <div className="bg-footer-background py-12 section-container">
                <div className="text-footer-foreground">
                    <div className="flex flex-col gap-6">
                        {/* Top Row: Logo + Policy Links on Left, Social Media on Right */}
                        <div className="flex w-full flex-col items-start lg:flex-row gap-6">
                            <div className="flex w-full items-center gap-6">
                                <Link to="/">
                                    <img src={logo} alt={t('logoAlt')} className="h-4 w-auto" />
                                </Link>
                                <PolicyLinks className="hidden lg:flex" />
                                <SocialIcons className="ml-auto" />
                            </div>
                            <PolicyLinks className="flex lg:hidden" />
                        </div>

                        {/* Bottom Row: Copyright on Left, Switchers + Legal Links on Right */}
                        <div className="flex flex-col items-start xl:flex-row xl:items-center justify-between gap-4 text-sm font-normal leading-5 text-muted-foreground">
                            <div>
                                © {new Date().getFullYear()} {t('copyright')}
                            </div>
                            <div className="flex flex-col items-start sm:flex-row sm:items-center gap-4">
                                <Switchers />
                                <LegalLinks />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
