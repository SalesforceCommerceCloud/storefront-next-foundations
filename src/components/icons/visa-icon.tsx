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
interface VisaIconProps {
    className?: string;
    width?: number | string;
    height?: number | string;
}

export default function VisaIcon(props: VisaIconProps) {
    return (
        <svg viewBox="0 0 24 8" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g clipPath="url(#clip0_visa_icon)">
                <path
                    d="M8.9194 0.135963L5.84377 7.57594H3.83716L2.32363 1.6385C2.23175 1.27279 2.15185 1.13881 1.87239 0.984736C1.41638 0.733776 0.662917 0.498447 0 0.352312L0.0450265 0.135963H3.27506C3.68679 0.135963 4.05691 0.413842 4.15039 0.894549L4.94973 5.1997L6.92526 0.135963H8.9194ZM16.7818 5.14685C16.7899 3.18321 14.1037 3.07504 14.1222 2.19786C14.1279 1.93089 14.3786 1.64706 14.9274 1.57461C15.1994 1.53851 15.9488 1.51097 16.7988 1.90757L17.1322 0.329858C16.6754 0.161766 16.0878 0 15.3566 0C13.4803 0 12.1598 1.01128 12.1487 2.45936C12.1366 3.53044 13.0912 4.12813 13.8104 4.48404C14.5503 4.84851 14.7985 5.08272 14.7957 5.40873C14.7905 5.9078 14.2056 6.12812 13.659 6.1368C12.7049 6.15169 12.1513 5.87505 11.7099 5.66701L11.3659 7.29695C11.8094 7.50325 12.6281 7.68325 13.4769 7.69231C15.4711 7.69231 16.7757 6.69355 16.7818 5.14685ZM21.7364 7.57607H23.4921L21.9596 0.135963H20.3391C19.9747 0.135963 19.6674 0.351071 19.5313 0.681798L16.6828 7.57594H18.6761L19.0719 6.46455H21.5074L21.7365 7.57594L21.7364 7.57607ZM19.6183 4.93981L20.6175 2.14637L21.1925 4.93981H19.6184H19.6183ZM11.6318 0.135963L10.0621 7.57594H8.16386L9.73416 0.135963H11.6318Z"
                    fill="#1434CB"
                />
            </g>
            <defs>
                <clipPath id="clip0_visa_icon">
                    <rect width="23.619" height="7.69231" fill="white" />
                </clipPath>
            </defs>
        </svg>
    );
}
