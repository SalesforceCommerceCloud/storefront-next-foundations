---
title: Gift Message for Cart Items
domain: Checkout
status: active
version: 1.0
created: 2026-04-08
last_updated: 2026-04-08
author: checkout-team
changelog:
  - version: 1.0
    date: 2026-04-08
    change: Initial spec for gift message feature
    author: checkout-team
---

# Gift Message for Cart Items

## Overview

Shoppers need to add personalized gift messages to individual cart items when purchasing gifts for others.
This feature enables shoppers to add, edit, and view gift messages throughout the purchase flow from cart to order confirmation.
Gift messages are stored at the item level (not order level), allowing different messages for different items in the same cart.

## Acceptance Criteria

### AC28: Gift message input, display, and persistence

- [ ] Shopper can add gift message to cart item on cart page
- [ ] Gift message is auto-saved after user stops typing (debounced)
- [ ] Gift message is displayed (read-only) in checkout review (MyCart component)
- [ ] Gift message is displayed (read-only) on order confirmation page
- [ ] Gift message persists across page navigations and browser refreshes
- [ ] Gift message is limited to 256 characters with validation
- [ ] Character counter shows remaining characters as shopper types
- [ ] Validation error displays when exceeding character limit

**Details:**
- Gift message field appears below each cart item (not at order level)
- Field is a textarea (multi-line input) for better readability
- Field is optional (shopper can leave blank)
- Updates are auto-saved 1.5 seconds after user stops typing (no explicit save button)
- Empty/cleared gift messages remove the gift message from SCAPI

## Feature Logic

### User Experience

**Cart page - Input:**
- Gift message textarea appears below each cart item's secondary actions (Remove/Edit buttons)
- Label: "Gift Message (Optional)"
- Placeholder: "Add a personal message to this item"
- 3 rows tall, non-resizable textarea
- Character counter: "X characters remaining" (updates on every keystroke, no debounce)
- Max length: 256 characters (enforced by textarea maxLength and validator)
- Validation error: "Gift message cannot exceed 256 characters" (shown when limit exceeded)
- Save behavior: 
  - Triggers 1.5 seconds after user stops typing (debounced)
  - Only saves after user has typed something (not on component mount/re-render)
  - Prevents automatic clearing of existing gift messages when component re-renders
- No loading indicators (saves are transparent to user)
- Validation errors prevent save (user must fix before auto-save triggers)

**Checkout review - Display:**
- Gift message displays below variation attributes (Color, Size, etc.)
- Format: Two-column flex layout
  - Column 1 (label): "Gift Message:" (bold, muted color, no shrinking)
  - Column 2 (message): Actual gift message text (foreground color)
- Only shown when gift message exists (conditional rendering)
- Read-only (no editing in checkout)

**Order confirmation - Display:**
- Gift message displays in product item card, below variation attributes
- Same two-column flex layout as checkout
- Same label and formatting
- Only shown when gift message exists (conditional rendering)
- Read-only (no editing after order placed)

### Data & State

**Storage:**
- SCAPI basket's `productItem.giftMessage` field (string)
- SCAPI basket's `productItem.gift` field (boolean, true when message exists)
- Persists in SCAPI basket (survives page refresh, browser close/reopen)

**Synchronization:**
- Cart page: Basket synced into basket context provider on mount
- Checkout: Reads from basket API response via checkout loader
- Order confirmation: Reads from order API response via order loader
- No separate client-side state management needed

### Platform Constraints

**SCAPI updateItemInBasket requirements:**

1. **Quantity field is required**: All PATCH requests to `updateItemInBasket` must include the current item's `quantity` field, even when only updating gift-related fields. SCAPI returns 400 Bad Request if `quantity` is omitted.

2. **Gift flag required**: When setting `giftMessage`, the `gift` boolean field must also be set:
   - `gift: true` when `giftMessage` is non-empty
   - `gift: false` when `giftMessage` is empty

3. **Request body structure**:
   ```json
   {
     "quantity": 1,              // Required - current item quantity from basket
     "gift": true,               // Required - true if giftMessage exists
     "giftMessage": "Happy Birthday!"
   }
   ```

4. **Fetching item quantity**: Server action must fetch current basket first to get item's `quantity` value before making the PATCH request.

**Why this matters**: This is a platform constraint, not a design choice. Developers must account for this when implementing the save action.

### Server Action Implementation Requirements

**Critical: Follow these steps in order. Skipping any step will cause 400 errors.**

**Step 1: Fetch current basket**
```typescript
const basketResource = await getBasket(context);
const basket = basketResource.current;
```

**Step 2: Find item and extract quantity**
```typescript
const item = basket.productItems?.find((i: any) => i.itemId === itemId);
const quantity = item.quantity ?? 1;
```

**Step 3: Compute gift fields**
```typescript
const hasGiftMessage = giftMessage.length > 0;
```

**Step 4: Call SCAPI with all required fields**
```typescript
await clients.shopperBasketsV2.updateItemInBasket({
    params: { path: { basketId: basket.basketId, itemId } },
    body: {
        quantity,        // Required - SCAPI returns 400 if missing
        gift: hasGiftMessage,
        giftMessage: hasGiftMessage ? giftMessage : '',
    },
});
```

**Step 5: Update basket cache**
```typescript
updateBasketResource(context, updatedBasket);
```

**Common Mistakes to Avoid:**
- ❌ Using `ensureBasketId()` alone — doesn't give you item quantity
- ❌ Omitting `quantity` field — SCAPI returns 400 Bad Request
- ❌ Not setting `gift` boolean — message won't save properly
- ❌ Forgetting to update basket cache — checkout won't see changes

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Component mount/re-render | **Don't save on mount** - only save after user has typed something. Prevents auto-clearing existing gift messages. |
| Empty gift message | Save as empty string with `gift: false`, message doesn't display in checkout/confirmation |
| Exceeded character limit | Show validation error, prevent save until under 256 characters |
| Item removed from cart | Gift message deleted with item (no orphaned messages) |
| Quantity updated | Gift message persists unchanged (independent of quantity) |
| Variant changed | Gift message persists to new variant (same itemId) |
| Page refresh during typing | Last saved value restored (keystrokes within 1.5 second debounce window lost) |
| User navigates away during debounce window | Last edits (within 1.5 seconds) not saved |
| Concurrent tab editing | Last write wins (no conflict resolution) |
| SCAPI save failure | Silent failure (no error message to user, retry on next edit when debounce fires again) |
| Basket API timeout | Gift message input remains functional, saves on next successful request |

## Implementation Validation

**Generated server action must pass these checks:**

- [ ] Imports `getBasket` from `@/middlewares/basket.server`
- [ ] Calls `await getBasket(context)` to fetch current basket
- [ ] Finds item: `basket.productItems?.find((i) => i.itemId === itemId)`
- [ ] Extracts quantity: `item.quantity ?? 1`
- [ ] Request body includes all three fields: `quantity`, `gift`, `giftMessage`
- [ ] Calls `updateBasketResource(context, updatedBasket)` after save
- [ ] Returns `BasketActionResponse` type

**Generated component must pass these checks:**

- [ ] Uses `useState` for value tracking
- [ ] Uses `useRef` for `hasUserInteracted` guard
- [ ] Uses `useRef` for debounce timer tracking
- [ ] `handleChange` sets `hasUserInteracted.current = true`
- [ ] `useEffect` checks `hasUserInteracted.current` before saving
- [ ] Debounce timer is 1500ms (1.5 seconds)
- [ ] Character counter updates on every keystroke (no debounce)
- [ ] Only calls `onUpdate` when validation passes

## Test Requirements

Must validate:

**E2E (End-to-End)**:
- [ ] Shopper can add gift message to cart item (textarea input)
- [ ] Character counter updates on every keystroke (no debounce)
- [ ] Gift message auto-saves after shopper stops typing (debounced)
- [ ] Gift message does NOT save on component mount (prevents auto-clearing existing messages)
- [ ] Gift message persists after page refresh
- [ ] Gift message displays in checkout review (read-only, correct format)
- [ ] Gift message displays on order confirmation (read-only, correct format)
- [ ] Validation error displays when exceeding 256 characters
- [ ] Invalid gift message (>256 chars) prevents save
- [ ] Clearing gift message removes it from checkout/confirmation

**Unit**:
- [ ] Validator accepts valid messages (empty, 1 char, 256 chars)
- [ ] Validator rejects invalid messages (257+ chars)
- [ ] Validator handles null/undefined input
- [ ] Validator calculates remaining characters correctly

## Translation Keys

Add to all locale files (`src/locales/{locale}/translations.json`):

**en-US / en-GB**:
```json
{
  "myCart": {
    "giftMessage": "Gift Message"
  },
  "checkout": {
    "confirmation": {
      "giftMessage": "Gift Message"
    }
  }
}
```

**it-IT**:
```json
{
  "myCart": {
    "giftMessage": "Messaggio regalo"
  },
  "checkout": {
    "confirmation": {
      "giftMessage": "Messaggio regalo"
    }
  }
}
```

## Related Features

- [Cart Management](./cart.spec.md) — Gift message appears below cart items
- [Checkout Flow](./checkout-flow.spec.md) — Gift message displayed in checkout review
- [Order Confirmation](./order-confirmation.spec.md) — Gift message displayed in order summary

## Risks & Dependencies

**Risks:**
- **SCAPI failures** → Gift messages lost. *Mitigation*: Silent failures with automatic retry on next edit.
- **Navigation during debounce window** → Last 1.5 seconds of edits lost. *Mitigation*: 1.5 seconds is short enough that this is rare.
- **Concurrent editing** → Last write wins. *Mitigation*: Acceptable for low-stakes gift message data.

**Dependencies:**
- SCAPI `updateItemInBasket` endpoint must accept `gift` and `giftMessage` fields
- Basket context provider must sync basket state
- `ProductItemsList` component must support `additionalContent` render prop
- Cart must be functional (gift message is item-level)

## Decision Records

**Why item-level (not order-level)?**
→ Allows different messages for different recipients in same cart. More flexible UX.

**Why auto-save (no explicit save button)?**
→ Reduces friction. Shoppers expect auto-save in modern UIs. No cognitive load to remember to save.

**Why 256 character limit?**
→ Matches SCAPI field constraint. Enough for meaningful message without allowing essays.

**Why debounce (1.5 seconds)?**
→ Balance between data persistence and performance. Prevents API spam while still protecting against data loss. 1.5 seconds is long enough to batch keystrokes but short enough that users won't notice delay.

**Why don't save on component mount?**
→ Prevents auto-clearing existing gift messages when component re-renders. Without this guard, mounting the component with empty initial state would trigger a save after 1.5 seconds, clearing any previously saved message. Only save when user has explicitly typed something.

**Why silent save failures?**
→ Don't interrupt shopper flow. Retries on next edit. Gift message is optional, low-stakes data.

**Why read-only in checkout/confirmation?**
→ Editing past cart page increases complexity. Shoppers can go back to cart to edit if needed.

**Why SCAPI requires quantity field?**
→ SCAPI design constraint. All `updateItemInBasket` PATCH requests validate quantity field. Omitting it returns 400 Bad Request. This is a platform limitation, not a feature design choice.

## Open Questions for Product/Design

- [ ] Should we add a visual indicator when gift message is being saved?
- [ ] Should we show error message when SCAPI save fails?
- [ ] Should we allow editing gift message in checkout (not just cart)?
- [ ] Should we support rich text formatting (bold, italic, emoji)?
- [ ] Should gift message have a minimum length requirement?
