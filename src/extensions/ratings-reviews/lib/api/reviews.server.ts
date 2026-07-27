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

/**
 * @feature-stub Customer ratings & reviews (server module)
 * @status stub — no backend integration
 *
 * Server-only API for the Ratings & Reviews extension.
 *
 * Ships with mock fixtures so the extension is fully functional out of the
 * box. A merchant integrating a real reviews backend (Bazaarvoice, PowerReviews,
 * Yotpo, Trustpilot, etc.) should replace the body of each function — call
 * sites in the loader and action route do not change.
 *
 * Persistence note: the in-memory store below lives for the lifetime of the
 * server process. In a multi-process or serverless deployment, mock writes
 * will not survive restarts or be visible across processes. Replace with a
 * real store before relying on persistence in production.
 *
 * See docs/README-FEATURE-STUBS.md for the full list and guidance on
 * productionizing or removing stubs.
 */

/** Base path for review card images (assets in public/images/) */
const REVIEW_PHOTOS_BASE = '/images';

/**
 * Photo associated with a customer review
 */
export interface ReviewPhoto {
    /** Stable id from API when available; use as list key to avoid remounts */
    id?: string;
    /** URL or path to the image */
    url: string;
    /** Optional alt text for accessibility */
    alt?: string;
}

/**
 * Single customer review in the reviews section
 */
export interface ReviewItem {
    id: string;
    authorName: string;
    verifiedPurchase: boolean;
    date: string;
    location?: string;
    rating: number;
    headline: string;
    body: string;
    photos?: ReviewPhoto[];
    helpfulCount: number;
    reportLabel?: string;
}

/**
 * Rating distribution (count of reviews per star 1–5)
 */
export interface RatingDistribution {
    oneStar: number;
    twoStars: number;
    threeStars: number;
    fourStars: number;
    fiveStars: number;
}

/**
 * Lightweight reviews summary for accordion header (count, rating, distribution, AI summary).
 */
export interface ReviewsSummaryData {
    totalCount: number;
    averageRating: number;
    distribution: RatingDistribution;
    basedOnLabel: string;
    aiSummary?: string;
}

/**
 * Customer reviews section data for PDP
 */
export interface ReviewsData {
    heading: string;
    subtitle: string;
    writeReviewButtonLabel: string;
    summary: {
        averageRating: number;
        totalCount: number;
        basedOnLabel: string;
        distribution: RatingDistribution;
    };
    aiSummary?: string;
    searchPlaceholder: string;
    sortOptions: string[];
    defaultSort?: string;
    reviews: ReviewItem[];
}

/**
 * Write a Review form configuration.
 */
export interface WriteReviewFormData {
    title: string;
    overallRating: {
        label: string;
        required: boolean;
        placeholder: string;
    };
    reviewTitle: {
        label: string;
        placeholder: string;
        maxCharacters?: number;
    };
    reviewBody: {
        label: string;
        placeholder: string;
        minCharacters: number;
        maxCharacters?: number;
    };
    recommend: {
        label: string;
        yesLabel: string;
        noLabel: string;
    };
    location?: {
        label: string;
        placeholder: string;
        hint: string;
    };
    addPhotos: {
        label: string;
        hint: string;
        accept: string;
        maxSize: string;
    };
    termsText: string;
    cancelLabel: string;
    submitLabel: string;
}

const MOCK_REVIEWS: ReviewItem[] = [
    {
        id: 'review-1',
        authorName: 'Alexandra P.',
        verifiedPurchase: true,
        date: '2025-02-01',
        location: 'Boston, MA',
        rating: 5,
        headline: 'A comprehensive review after 6 months of ownership',
        body: "I've been meaning to write this review for a while now, and after living with my Pure Cube White for six months, I feel I can give a truly comprehensive assessment. First, let me talk about the packaging - it arrived double-boxed with foam inserts that kept it perfectly protected during transit. The unboxing experience itself felt premium. Upon first holding the cube, I was immediately struck by its weight and density. This is not a hollow decorative piece; it has real substance and presence. The matte white finish is absolutely pristine, with no visible seams or imperfections whatsoever. I've placed mine on a walnut console table in my entryway, and it catches the natural light beautifully throughout the day. In the morning sun, it has an almost warm glow, while in the evening it takes on cooler tones. Maintenance has been minimal - I simply dust it weekly with a microfiber cloth. I was initially worried about the white showing fingerprints, but the matte finish does an excellent job of hiding them. My interior designer actually asked where I got it because she wants to recommend it to her other clients. Overall, this is the kind of piece that elevates an entire room. Worth every penny and then some.",
        photos: [{ url: `${REVIEW_PHOTOS_BASE}/black-cube-photo.svg`, alt: '6 Month Review' }],
        helpfulCount: 67,
        reportLabel: 'Report',
    },
    {
        id: 'review-2',
        authorName: 'David L.',
        verifiedPurchase: true,
        date: '2025-01-15',
        location: 'Los Angeles, CA',
        rating: 5,
        headline: 'Sleek and sophisticated',
        body: "The black version is absolutely stunning. It has a subtle depth to the finish that photographs don't quite capture. Worth every penny.",
        photos: [{ url: `${REVIEW_PHOTOS_BASE}/black-cube-photo.svg`, alt: 'Black Cube Photo' }],
        helpfulCount: 22,
        reportLabel: 'Report',
    },
    {
        id: 'review-3',
        authorName: 'James R.',
        verifiedPurchase: true,
        date: '2025-01-08',
        location: 'San Francisco, CA',
        rating: 5,
        headline: 'Perfect minimalist accent',
        body: 'The Pure Cube is exactly what I was looking for. The white finish is crisp and clean, and the proportions are spot-on. It sits beautifully on my console table and catches the light perfectly throughout the day.',
        photos: [
            { url: `${REVIEW_PHOTOS_BASE}/home-office-setup.svg`, alt: 'Review Photo 1' },
            { url: `${REVIEW_PHOTOS_BASE}/living-room.svg`, alt: 'Review Photo 2' },
        ],
        helpfulCount: 34,
        reportLabel: 'Report',
    },
    {
        id: 'review-4',
        authorName: 'Maria S.',
        verifiedPurchase: true,
        date: '2024-12-15',
        location: 'New York, NY',
        rating: 5,
        headline: 'Museum quality at home',
        body: "I bought this for my home office and it elevates the entire space. The craftsmanship is impeccable - you can tell this is precision-made. The matte white finish doesn't show fingerprints which is a huge plus.",
        photos: [{ url: `${REVIEW_PHOTOS_BASE}/home-office-setup.svg`, alt: 'Home Office Setup' }],
        helpfulCount: 28,
        reportLabel: 'Report',
    },
    {
        id: 'review-5',
        authorName: 'Rachel M.',
        verifiedPurchase: true,
        date: '2024-12-01',
        location: 'Seattle, WA',
        rating: 4,
        headline: 'Great neutral option',
        body: 'The gray is the perfect middle ground - not too stark like white, not as dramatic as black. Fits seamlessly into my living room.',
        photos: [{ url: `${REVIEW_PHOTOS_BASE}/living-room.svg`, alt: 'Living Room' }],
        helpfulCount: 15,
        reportLabel: 'Report',
    },
    {
        id: 'review-6',
        authorName: 'Thomas K.',
        verifiedPurchase: true,
        date: '2024-11-20',
        location: 'Chicago, IL',
        rating: 4,
        headline: 'Beautiful but smaller than expected',
        body: 'Gorgeous piece with excellent build quality. My only note is that I wish I had ordered the Large size - the Medium is a bit smaller than it appeared in photos. That said, the quality is outstanding.',
        helpfulCount: 19,
        reportLabel: 'Report',
    },
    {
        id: 'review-7',
        authorName: 'Emily W.',
        verifiedPurchase: true,
        date: '2024-10-05',
        location: 'Portland, OR',
        rating: 5,
        headline: 'Bought 3 for my shelving unit',
        body: 'These cubes arranged on my floating shelves create such a sophisticated look. The white color matches my Scandinavian decor perfectly. Already planning to buy more!',
        photos: [
            { url: `${REVIEW_PHOTOS_BASE}/shelf-display.svg`, alt: 'Shelf Display 1' },
            { url: `${REVIEW_PHOTOS_BASE}/shelf-display.svg`, alt: 'Shelf Display 2' },
            { url: `${REVIEW_PHOTOS_BASE}/shelf-display.svg`, alt: 'Shelf Display 3' },
        ],
        helpfulCount: 41,
        reportLabel: 'Report',
    },
];

const MOCK_AI_SUMMARY =
    'Customers love the quality and comfort of this product. Many reviewers highlight the excellent fit and durability, making it a great value for the price.';

const MOCK_WRITE_REVIEW_FORM_DATA: WriteReviewFormData = {
    title: 'Write a Review',
    overallRating: {
        label: 'Overall Rating',
        required: true,
        placeholder: 'Select a rating',
    },
    reviewTitle: {
        label: 'Review Title',
        placeholder: 'Summarize your experience',
        maxCharacters: 250,
    },
    reviewBody: {
        label: 'Your Review',
        placeholder: 'What did you like or dislike about this product?',
        minCharacters: 50,
        maxCharacters: 2000,
    },
    recommend: {
        label: 'Would you recommend this product?',
        yesLabel: 'Yes',
        noLabel: 'No',
    },
    location: {
        label: 'Location',
        placeholder: 'City, State or Country (e.g., Los Angeles, CA)',
        hint: 'Optional - helps other customers',
    },
    addPhotos: {
        label: 'Add Photos (Optional)',
        hint: 'Click to upload or drag and drop',
        accept: 'PNG, JPG',
        maxSize: '5MB',
    },
    termsText: 'By submitting this review, you agree to our Terms of Service and Privacy Policy.',
    cancelLabel: 'Cancel',
    submitLabel: 'Submit Review',
};

/**
 * In-memory store of user-submitted reviews keyed by productId.
 * Replace with a real persistence layer when integrating a backend.
 */
const userAddedReviewsByProduct = new Map<string, ReviewItem[]>();

function buildSummary(reviews: ReviewItem[]): ReviewsData['summary'] {
    const totalCount = reviews.length;
    const distribution: RatingDistribution = {
        oneStar: 0,
        twoStars: 0,
        threeStars: 0,
        fourStars: 0,
        fiveStars: 0,
    };
    let sum = 0;
    for (const r of reviews) {
        if (r.rating >= 1 && r.rating <= 5) {
            const key = (['oneStar', 'twoStars', 'threeStars', 'fourStars', 'fiveStars'] as const)[r.rating - 1];
            distribution[key]++;
            sum += r.rating;
        }
    }
    const averageRating = totalCount > 0 ? sum / totalCount : 0;
    return {
        averageRating: Math.round(averageRating * 10) / 10,
        totalCount,
        basedOnLabel: totalCount === 1 ? 'Based on 1 review' : `Based on ${totalCount} reviews`,
        distribution,
    };
}

function getAllReviewsForProduct(productId?: string): ReviewItem[] {
    const key = productId ?? 'default';
    const userAdded = userAddedReviewsByProduct.get(key) ?? [];
    return [...userAdded, ...MOCK_REVIEWS];
}

/**
 * Lightweight reviews summary for accordion header / rating display.
 * Replace this body with a call to your reviews provider when integrating.
 */
export function getReviewsSummary(productId?: string): Promise<ReviewsSummaryData> {
    const allReviews = getAllReviewsForProduct(productId);
    const summary = buildSummary(allReviews);
    return Promise.resolve({
        ...summary,
        aiSummary: MOCK_AI_SUMMARY,
    });
}

/**
 * Full reviews data (header + reviews list + sort/filter config).
 * Replace this body with a call to your reviews provider when integrating.
 */
export function getReviews(productId?: string): Promise<ReviewsData> {
    const allReviews = getAllReviewsForProduct(productId);
    const summary = buildSummary(allReviews);
    return Promise.resolve({
        heading: 'Customer Reviews',
        subtitle: `${summary.totalCount} reviews for Pure Cube`,
        writeReviewButtonLabel: 'Write a Review',
        summary,
        aiSummary: MOCK_AI_SUMMARY,
        searchPlaceholder: 'Search reviews...',
        sortOptions: ['Most Recent', 'Highest Rating', 'Lowest Rating', 'Most Helpful'],
        defaultSort: 'Most Recent',
        reviews: allReviews,
    });
}

/**
 * Persist a new review for a product.
 * Replace this body with a call to your reviews provider when integrating.
 */
export function addReview(productId: string | undefined, review: ReviewItem): Promise<void> {
    const key = productId ?? 'default';
    const existing = userAddedReviewsByProduct.get(key) ?? [];
    userAddedReviewsByProduct.set(key, [review, ...existing]);
    return Promise.resolve();
}

/**
 * Configuration for the Write a Review form (labels, validation rules).
 * Replace this body with a call to your reviews provider when integrating.
 */
export function getWriteReviewForm(_productId?: string): Promise<WriteReviewFormData> {
    return Promise.resolve(MOCK_WRITE_REVIEW_FORM_DATA);
}
