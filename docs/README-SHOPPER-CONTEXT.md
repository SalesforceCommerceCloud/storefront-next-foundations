# Shopper Context

Shopper Context enables personalized commerce experiences by associating session-level attributes — such as source codes, customer groups, custom qualifiers, and assignment qualifiers — with a shopper's session. These attributes influence pricing, promotions, product sorting, and other backend behaviors without requiring changes to individual API calls.

This integration wraps the [Shopper Context API](https://developer.salesforce.com/docs/commerce/commerce-api/references/shopper-context?meta=Summary) and manages qualifier state through server middleware, cookies, and a React hook.

## Feature Flag

Shopper Context is **disabled by default**. Enable it via environment variable or config:

```bash
PUBLIC__app__features__shopperContext__enabled=true
```

When disabled, the middleware short-circuits and no SCAPI calls are made.

## How It Works

Qualifiers enter the system through two paths:

1. **URL query parameters** — A server middleware extracts qualifiers from the URL on every request (e.g., `?src=spring-sale&deviceType=mobile`)
2. **React hook** — The `useShopperContext` hook lets components update qualifiers from UI interactions (e.g., store selector, coupon input)

Both paths merge new qualifiers with the current state stored in cookies, then send the full merged context to SCAPI via PUT (full replace). Updated state is written back to cookies for subsequent requests.

## Qualifier Support

The template supports the following qualifiers from the [Shopper Context API](https://developer.salesforce.com/docs/commerce/commerce-api/references/shopper-context?meta=type%3AShopperContext) out of the box:

| API Field | URL Parameter | Notes |
|-----------|---------------|-------|
| `sourceCode` | `src` | Campaign/source code for attribution and promotion targeting |
| `couponCodes` | `couponCodes` | Comma-separated list of coupon codes |
| `customQualifiers` | `deviceType` | e.g., `?deviceType=mobile` |
| `assignmentQualifiers` | `store` | e.g., `?store=boston` |

`effectiveDateTime`, `customerGroupIds`, `clientIp`, and `geoLocation` are not enabled by default. To enable them, update `SHOPPER_CONTEXT_SEARCH_PARAMS` in `src/lib/shopper-context-constants.ts`. Make sure the qualifier is supported by the API — see the [ShopperContext type reference](https://developer.salesforce.com/docs/commerce/commerce-api/references/shopper-context?meta=type%3AShopperContext). `geoLocation` is a structured object and may require additional handling.

To add a validation layer on commerce API requests, consider the [Shopper Context Hooks](https://github.com/SalesforceCommerceCloud/shopper_context_hooks) cartridge. It intercepts calls to create/update context and validates the body against a predefined scope for a given client ID.

## Cookies

Shopper Context uses two `httpOnly` cookies to persist qualifier state on the server. This avoids re-reading context from SCAPI on every request and enables the middleware to include qualifiers in subsequent GET calls without additional API round-trips.

| Cookie | Base Name | Default Expiry | Format | Purpose |
|--------|-----------|---------------|--------|---------|
| Shopper Context | `storefront-next-context` | 6 hours | JSON object | All qualifiers except source code |
| Source Code | `dwsourcecode` | 30 days | Bare string | Source code qualifier |

The `dwsourcecode_*` cookie stores the bare source-code string (e.g. `email`) rather than a JSON object so SFRA storefronts running side-by-side can read the same cookie name and value format directly.

On each request the middleware reads current state from cookies, merges in any new qualifiers, sends the merged context to SCAPI if anything changed, and writes updated cookies back. New values overwrite existing keys; unmentioned keys are preserved.

## Customization

To add a new qualifier, edit `SHOPPER_CONTEXT_SEARCH_PARAMS` in `src/lib/shopper-context-constants.ts`. Once added, it is automatically supported in both URL query parameters and the `useShopperContext` hook.

To update qualifiers programmatically from a component, use the `useShopperContext` hook. It accepts the same qualifier keys used in URL parameters and updates SCAPI and cookies without a full page navigation.

```typescript
import { useShopperContext } from '@/hooks/use-shopper-context';

function StoreSelector() {
    const { updateQualifiers, isLoading, error, success } = useShopperContext();

    const handleStoreChange = (storeId: string) => {
        updateQualifiers({ store: storeId });
    };

    return (
        <select onChange={(e) => handleStoreChange(e.target.value)} disabled={isLoading}>
            <option value="boston">Boston</option>
            <option value="nyc">New York</option>
        </select>
    );
}
```

## Expiry

- **Browser cookies** — Cleared automatically on logout or auth failure. The shopper context cookie expires after 6 hours and the source code cookie after 30 days. Cookie expiry values are defined in `src/lib/shopper-context-constants.ts`.
- **API-side context** — Scoped to the USID. There is currently no API notification when context is cleared from the backend, so the storefront cannot detect this change. The context will be re-created on the next request when new qualifiers are being set.
