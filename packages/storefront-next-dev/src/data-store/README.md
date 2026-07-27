## Local data-store provider

`local-provider.ts` supplies an in-memory data-store implementation for development workflows. It emulates MRT data-store entries using either explicit defaults or environment-driven defaults so local development can run without MRT infrastructure.

This file lives in `storefront-next-dev` because it is only meant for development and local testing. The runtime package dynamically imports it when MRT is unavailable and the environment is in development mode, keeping production bundles free of dev-only logic.

### Configuration

- `SFNEXT_DATA_STORE_DEFAULTS` (optional): JSON map of entry keys to preference objects.
- `SFNEXT_DATA_STORE_WARN_ON_MISSING` (optional): Set to `"false"` to silence missing-key warnings.
