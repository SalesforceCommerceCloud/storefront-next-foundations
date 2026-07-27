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
/** @sfdc-extension-file SFDC_EXT_RATINGS_REVIEWS */
import { z } from 'zod';

export const reviewPhotoSchema = z.object({
    url: z
        .string()
        .url()
        .refine((u) => u.startsWith('https://'), { message: 'Only https: URLs allowed' }),
    alt: z.string().max(250).optional(),
});

export const addReviewSchema = z.object({
    productId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    headline: z.string().min(1).max(250),
    body: z.string().min(50).max(2000),
    location: z.string().max(120).optional(),
    photos: z.array(reviewPhotoSchema).max(10).optional(),
    recommend: z.boolean().optional(),
});

export type AddReviewPayload = z.infer<typeof addReviewSchema>;
