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

/**
 * ES module imports for review card images (MRT-compatible, cacheable assets).
 * Map path keys match URLs returned by the product content adapter (e.g. mock).
 */
import blackCubePhoto from '/images/black-cube-photo.svg';
import homeOfficeSetup from '/images/home-office-setup.svg';
import livingRoom from '/images/living-room.svg';
import shelfDisplay from '/images/shelf-display.svg';

export const REVIEW_CARD_IMAGES: Record<string, string> = {
    '/images/black-cube-photo.svg': blackCubePhoto,
    '/images/home-office-setup.svg': homeOfficeSetup,
    '/images/living-room.svg': livingRoom,
    '/images/shelf-display.svg': shelfDisplay,
};
