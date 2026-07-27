# Cookie Domain Configuration

By default every cookie Storefront Next writes is **host-only** — scoped to the exact host that
served the response. Set a **cookie domain** when you need cookies to be shared across subdomains:

- A storefront spread across subdomains (e.g. `www.`, `shop.`, `account.` on `example.com`).
- A **hybrid** deployment where Storefront Next and SFRA serve different paths under one parent
  domain (auth/session continuity relies on shared `dwsid` / `cc-*` cookies — see
  [Hybrid Proxy](./README-HYBRID-PROXY.md)).

Sharing cookies across subdomains requires the domain to be set on **both** sides, and the two
**must agree**:

1. **Storefront Next** — `app.cookies.domain` (with optional per-site overrides). [§1](#1-configure-the-cookie-domain-in-storefront-next)
2. **B2C Commerce (Business Manager)** — the Hybrid Auth cookie-domain level. [§2](#2-configure-the-cookie-domain-in-business-manager-b2c-commerce)

---

## 1. Configure the cookie domain in Storefront Next

The cookie domain resolves from one of two config values, highest precedence first; if neither is
set, cookies stay host-only (setting a domain is opt-in):

| Precedence | Setting | Scope |
| --- | --- | --- |
| 1 (highest) | `commerce.sites[].cookies.domain` | Per-site override |
| 2 | `app.cookies.domain` | Global default for all sites |
| 3 (default) | _(unset)_ | Host-only — no `Domain` attribute |

The resolved domain is applied to **every** cookie Storefront Next writes — both the auth/session
cookies and the site-context cookies (site, locale, and currency). See
[Authentication & Session Management](./README-AUTH.md#cookie-architecture) for the full, current
cookie inventory.

```typescript
// config.server.ts
app: {
    // Global default — applies to every site that has no per-site override.
    cookies: { domain: '.example.com' },
    commerce: {
        sites: [
            {
                id: 'RefArchCanada',
                cookies: { domain: '.example.ca' }, // per-site override wins for this site
                defaultLocale: 'en-CA',
                // …
            },
        ],
    },
},
```

Set the global default with an environment variable instead — a single value that covers the whole
storefront without redeclaring the `commerce.sites` array:

```bash
PUBLIC__app__cookies__domain=.example.com
```

### Rules

- **The domain must be a parent of the serving host.** A `Domain` that does not match the request
  host is silently rejected by the browser, so cookies fail to persist and login won't stick. This
  can't be validated at build time — the serving host isn't known then.
- **The leading dot is optional.** Per [RFC 6265bis](https://httpwg.org/specs/rfc6265bis.html#cookie-domain),
  `.example.com` and `example.com` behave identically — both also match subdomains.

---

## 2. Configure the cookie domain in Business Manager (B2C Commerce)

In a hybrid deployment, Storefront Next shares session cookies with SFRA/B2C Commerce. B2C Commerce
applies its own cookie-domain scope to the cookies it sets, so it must be configured to match the
storefront. These are the same Business Manager settings PWA Kit uses.

**Business Manager → Merchant Tools → Site Preferences → Hybrid Auth Settings.** Set the
cookie-domain level:

| Level | Meaning | Use when |
| --- | --- | --- |
| `0` (default) | Host name only | Single-host storefront (storefront `cookies.domain` unset) |
| `2` | First-level parent domain (e.g. `.example.com`) | Cross-subdomain / hybrid (storefront `cookies.domain` set to that parent) |

Level `1` scopes the cookie to the top-level domain (e.g. `.com`) and is **rejected** for security
reasons. For Salesforce-managed (SI) sites, file a request with the team that manages your Business
Manager.

### Matching the two sides

The storefront and Business Manager values must describe the same scope:

| Storefront `cookies.domain` | Business Manager level | Result |
| --- | --- | --- |
| _(unset)_ | `0` | ✅ Host-only on both sides |
| `.example.com` | `2` | ✅ Shared across `*.example.com` |
| `.example.com` | `0` | ❌ Mismatch — cross-subdomain session breaks |
| _(unset)_ | `2` | ❌ Mismatch — duplicate/host-only vs domain-scoped cookies |

---

## 3. Verification checklist

After configuring both sides, load the storefront and inspect the response:

```bash
curl -sI https://www.example.com/ | grep -i '^set-cookie:'
```

- [ ] Every auth/session and site-context cookie carries the same `Domain=` attribute.
- [ ] No duplicate cookies of the same name (one host-only **and** one `Domain`-scoped) — duplicates
      cause non-deterministic reads.
- [ ] A session started on one subdomain persists when navigating to another (`www.` → `account.`).
- [ ] In hybrid mode, `dwsid` is shared between Storefront Next and SFRA pages.
- [ ] Logout / 401-recovery clears the `Domain`-scoped cookies (not a stale host-only copy).
- [ ] The configured domain is a parent of the production hostname (cookies are not silently dropped).

---

## Rollout & limitations

- **Expect a short settling period.** Changing `app.cookies.domain` on a live storefront (unset→set,
  or a value change) leaves the previously-scoped cookies in the browser alongside the newly-scoped
  ones until the old ones expire. A host-only cookie shadows a `Domain`-scoped cookie of the same
  name, and cookie ordering is UA-dependent, so shoppers may see transient session or site-selection
  glitches during the transition. Roll out in a low-traffic window.
- **A per-site empty string inherits the global default**, not host-only. With a global
  `app.cookies.domain` set, there is no way to force one site back to host-only scoping.

---

## See also

- [Authentication & Session Management](./README-AUTH.md) — the full cookie inventory and the
  `secure` / `isRemote()` behavior.
- [Configuration](./README-CONFIG.md) — the `PUBLIC__` env-override system.
- [Hybrid Proxy](./README-HYBRID-PROXY.md) — running Storefront Next + SFRA together.
- [PWA Kit: Hybrid Cookie Domain Configuration](https://github.com/SalesforceCommerceCloud/pwa-kit/blob/develop/docs/hybrid-cookie-domain-configuration.md) — the analogous PWA Kit guide.
