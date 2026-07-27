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
interface GenericCardIconProps {
    className?: string;
    width?: number | string;
    height?: number | string;
}

// Generic credit card icon component for fallback cases (Diners Club, JCB, Unknown)
export default function GenericCardIcon(props: GenericCardIconProps) {
    return (
        <svg viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <rect width="40" height="24" rx="4" fill="#6B7280" stroke="#9CA3AF" />
            <rect x="2" y="6" width="36" height="3" fill="#374151" />
            <rect x="4" y="14" width="12" height="2" rx="1" fill="#D1D5DB" />
            <rect x="20" y="14" width="8" height="2" rx="1" fill="#D1D5DB" />
            <rect x="32" y="14" width="4" height="2" rx="1" fill="#D1D5DB" />
        </svg>
    );
}
