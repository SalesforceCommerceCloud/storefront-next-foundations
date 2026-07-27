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
import { vi, describe, it, expect } from 'vitest';
import { AppDownloadSection } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'overview.appDownload.title': 'Download Our App',
                'overview.appDownload.description': 'Shop on the go with our mobile app for iOS and Android',
                'overview.appDownload.appStore': 'App Store',
                'overview.appDownload.googlePlay': 'Google Play',
                'overview.appDownload.qrCode': 'Scan to Download',
            };
            return translations[key] || key;
        },
    }),
}));

describe('AppDownloadSection', () => {
    it('renders title and badge images', () => {
        render(<AppDownloadSection />);

        expect(screen.getByText('Download Our App')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'App Store' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Google Play' })).toBeInTheDocument();
    });
});
