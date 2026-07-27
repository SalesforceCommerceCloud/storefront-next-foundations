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
 * Rewrites `?$staticlink$` placeholders in Page Designer markup attributes
 * into fully-qualified static-content URLs using the caller-supplied
 * {@link AttributeResolutionContext}.
 *
 * Pipeline-action placeholders (`$link-...$`, `$url(...)$`, `$httpUrl(...)$`,
 * `$httpsUrl(...)$`, `$include(...)$`) are intentionally NOT rewritten.
 * Storefront-next components use React composition for navigation rather than
 * ECOM pipeline routing, so these placeholders pass through as-is.
 */
import type { AttributeResolutionContext } from './attribute-resolution';

const STATICLINK_PATTERN = /\?\$staticlink\$/gi;

const STATICLINK_DELIMITERS_SINGLE = '":=\'(>';
const STATICLINK_DELIMITERS_DOUBLE = ['"[', '=[', ',[', ' [', ' ,', ', '];

let warnedStaticlink = false;

function rewriteImages(source: string, ctx: AttributeResolutionContext): string {
    const domain = ctx.pageLibraryDomain;

    if (!domain) {
        // Fire once per process via the module-level dedup flag, then
        // route the structured warning to the consumer's onWarn handler.
        // typeId / attrId / attrType are intentionally empty — the
        // pageLibraryDomain miss is a manifest-level configuration issue
        // and not attributable to a specific component attribute.
        if (!warnedStaticlink) {
            warnedStaticlink = true;
            ctx.onWarn?.({
                kind: 'staticlink-rewrite-skipped',
                message: '?$staticlink$ rewrite skipped: ctx.pageLibraryDomain is not set',
                typeId: '',
                attrId: '',
                attrType: 'markup',
            });
        }
        return source;
    }

    const resolveStaticUrl = ctx.staticLinkFor ?? ctx.resolveMediaUrl;

    let result = '';
    let lastPos = -1;

    STATICLINK_PATTERN.lastIndex = 0;
    let match = STATICLINK_PATTERN.exec(source);

    if (!match) {
        return source;
    }

    while (match) {
        const pos = match.index;
        const newPos = STATICLINK_PATTERN.lastIndex;

        // Walk backwards to find the start of the filename
        let startPos = pos - 1;

        while (true) {
            if (startPos <= lastPos) {
                break;
            }

            const ch = source.charAt(startPos);

            if (STATICLINK_DELIMITERS_SINGLE.indexOf(ch) !== -1) {
                // ECOM exception: '=' followed by '.' is not a delimiter (CMS images with encoded paths)
                if (!(ch === '=' && startPos + 1 < source.length && source.charAt(startPos + 1) === '.')) {
                    break;
                }
            }

            if (startPos > 0) {
                const doubleChar = source.substring(startPos - 1, startPos + 1);
                if (STATICLINK_DELIMITERS_DOUBLE.includes(doubleChar)) {
                    break;
                }
            }

            startPos--;
        }

        // Append left part (between last match end and filename start)
        const leftStart = lastPos === -1 ? 0 : lastPos;
        result += source.substring(leftStart, startPos + 1);

        // Extract path
        const path = source.substring(startPos + 1, pos);

        if (path.trim().length !== 0) {
            let url = resolveStaticUrl({
                libraryDomain: domain,
                path: path.trim(),
                locale: ctx.locale,
            });

            if (path.startsWith(' ')) {
                url = ` ${url}`;
            }
            if (path.endsWith(' ')) {
                url += ' ';
            }

            result += url;
        }

        lastPos = newPos;
        match = STATICLINK_PATTERN.exec(source);
    }

    // Append remainder
    const tailStart = lastPos === -1 ? 0 : lastPos;
    result += source.substring(tailStart);

    return result;
}

/**
 * Rewrites `?$staticlink$` placeholders in markup to fully-qualified
 * static-content URLs. Pipeline-action placeholders pass through unchanged.
 */
export function rewriteMarkup(source: string, ctx: AttributeResolutionContext): string {
    if (!source) {
        return '';
    }

    return rewriteImages(source, ctx);
}

/** @internal Test-only: resets the staticlink warning flag. */
export function _resetStaticLinkWarningForTesting(): void {
    warnedStaticlink = false;
}
