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
 * Parse a max file size string (e.g. "5MB", "500KB") to bytes.
 * Falls back to 5MB if the string cannot be parsed.
 */
export function parseMaxSizeToBytes(maxSize: string): number {
    const m = maxSize
        .trim()
        .toUpperCase()
        .match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)?$/);
    if (!m) return 5 * 1024 * 1024;
    const n = Number(m[1]);
    const unit = m[2] ?? 'MB';
    if (unit === 'KB') return n * 1024;
    if (unit === 'MB') return n * 1024 * 1024;
    if (unit === 'GB') return n * 1024 * 1024 * 1024;
    return n * 1024 * 1024;
}

export interface AcceptConfig {
    /** Value for <input accept="..."> */
    acceptAttr: string;
    /** MIME types for validation (e.g. ["image/png", "image/jpeg"]) */
    allowedTypes: string[];
}

/**
 * Map an accept string (e.g. "PNG, JPG" or "image/png, image/jpeg") to an input accept attribute
 * and a list of allowed MIME types for validation.
 */
export function getAcceptConfig(accept: string): AcceptConfig {
    const parts = accept.split(/[,/]+/).map((p) => p.trim().toUpperCase());
    const mimeMap: Record<string, string> = {
        PNG: 'image/png',
        JPG: 'image/jpeg',
        JPEG: 'image/jpeg',
        GIF: 'image/gif',
        WEBP: 'image/webp',
    };
    const allowed = [...new Set(parts.map((p) => mimeMap[p] ?? `image/${p.toLowerCase()}`).filter(Boolean))];
    return { acceptAttr: allowed.join(','), allowedTypes: allowed };
}

/** Options for filtering accepted files by type and size */
export interface FileUploadFilterOptions {
    allowedTypes: string[];
    maxBytes: number;
}

/**
 * Filter a FileList to only files that pass type and size checks.
 * Returns an array of accepted File objects (skips invalid type or over-size).
 */
export function filterAcceptedFiles(fileList: FileList | null, options: FileUploadFilterOptions): File[] {
    if (!fileList?.length) return [];
    const { allowedTypes, maxBytes } = options;
    const result: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (!file.type || !allowedTypes.includes(file.type)) continue;
        if (file.size > maxBytes) continue;
        result.push(file);
    }
    return result;
}

/** Config for file upload derived from form addPhotos (accept + maxSize) */
export interface FileUploadConfig {
    maxBytes: number;
    acceptAttr: string;
    allowedTypes: string[];
}

const DEFAULT_FILE_UPLOAD_CONFIG: FileUploadConfig = {
    maxBytes: 5 * 1024 * 1024,
    acceptAttr: 'image/png,image/jpeg',
    allowedTypes: ['image/png', 'image/jpeg'],
};

/**
 * Build full file upload config from form addPhotos (accept + maxSize).
 * Use for &lt;input accept&gt;, validation, and filterAcceptedFiles.
 */
export function getFileUploadConfig(addPhotos?: { accept?: string; maxSize?: string }): FileUploadConfig {
    if (!addPhotos?.accept || !addPhotos?.maxSize) return DEFAULT_FILE_UPLOAD_CONFIG;
    const { acceptAttr, allowedTypes } = getAcceptConfig(addPhotos.accept);
    const maxBytes = parseMaxSizeToBytes(addPhotos.maxSize);
    return { acceptAttr, allowedTypes, maxBytes };
}
