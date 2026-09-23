# Canteen Chaos — base app (v3-clean)

The working version of the Hostel Canteen ordering site. This is the
**clean** build; bugs get planted on top of it for the BYTE recruitment
debugging stage.

## Run it

```bash
cd backend
npm install
npm start
```

Open http://localhost:3000 — the server serves the frontend too.

The canteen has opening hours (7:00 AM – 10:00 PM) and time-based menu
slots, so outside those hours most dishes show as "not served now". To
work at any hour:

```bash
TZ=Pacific/Auckland npm start    # any zone where it is daytime
```

Useful environment variables:

| Variable | Default | What it does |
|---|---|---|
| `LATENCY_MS` | 250 | Random delay on every API call. Set 0 for instant. |
| `AUTO_COOK` | true | The kitchen moves orders along by itself. |
| `KITCHEN_TICK_MS` | 10000 | How often it checks. |
| `ORDER_RATE_MAX` | 40 | Orders per minute per IP. |
| `QUIET` | false | Turn off request logging. |

## Test it

```bash
cd backend
node smoke.js      # 90 checks against a running server
```

All 90 pass on the clean build. Every planted bug should break at least one.

## Structure

```
backend/
  server.js                wiring only
  store.js                 JSON store: mtime cache, atomic writes, update()
  smoke.js                 90 end-to-end API checks
  middleware/
    requestId.js           request ids, timing log, fake latency
    rateLimit.js           fixed-window limiter with headers
    validate.js            shape checking + list query parsing
    errors.js              HttpError, asyncHandler, one error handler
  routes/
    menu.routes.js         list, search, suggest, categories, picks, detail
    orders.routes.js       quote, place, track, status, rate
    coupons.routes.js      coupons, pickup slots, loyalty wallet
    staff.routes.js        stock, availability, stats
  logic/
    pricing.js             lines, packing, combo, coupons, rush, tip, GST
    validation.js          order rules, stock reserve/release
    availability.js        opening hours, meal slots, blocked reasons
    scheduling.js          15-min pickup slots, capacity, cutoff, rush hour
    search.js              tokenise, score, rank, suggest, sort, paginate
    status.js              state machine, ETA, stalled orders, auto-cook
    loyalty.js             points earn/redeem, tiers, caps
    ratings.js             weighted averages, distribution
    recommend.js           also-bought pairs, personal picks, top dishes
  data/
    menu.json              37 dishes: stock, prep time, slot, tags
    coupons.json           5 coupons, one expired on purpose
    orders.json            orders land here
    ratings.json           running rating totals
    members.json           loyalty wallets, one per device

frontend/
  index.html               3 views, 4 modals, one page
  style.css                ~1000 lines, light + dark
  js/
    dom.js                 $, $$, html`` escaping, delegate(), render()
    utils.js               rupees, debounce, throttle, safe storage, ids
    validate.js            shared form rules, bindField
    api.js                 fetch layer: abort, timeout, cache, headers
    state.js               all state + an event bus
    ui.js                  toasts with undo, modal stack, skeletons
    menu.js                grid, search + suggestions, filters, paging
    dish.js                dish detail modal, ratings, also-bought
    cart.js                cart panel, coupons, live bill
    checkout.js            pickup slot, tip, points, idempotent ordering
    orders.js              tracking with backoff, My Orders, rating
    staff.js               counter dashboard, stats, stock
    router.js              hash router with enter/leave hooks
    app.js                 routes, theme, shortcuts, boot
  img/                     8 images with different aspect ratios
```

## What the app does

**Student**
- 37 dishes: ranked search with a suggestions dropdown, veg filter,
  category tabs, price slider, 7 sort orders, "load more" plus infinite scroll
- "Served now" — breakfast is not orderable at 4 PM, and the *server* decides
- Dish detail: rating breakdown, stock left, and what people buy with it
- Cart with undo on remove, stock limits, favourites, recently viewed
- Coupons: percent and flat, minimum order, veg-only, slot-limited, capped, expiring
- Combo offer, packing capped at Rs. 20, 5% GST, lunch-rush surcharge
- Checkout: 15-minute pickup slots with capacity, tip, loyalty points,
  room validated as `B-204`, kitchen note
- Ordering is idempotent, so a double tap never makes two orders
- Live tracking with backoff polling: placed → accepted → preparing → ready → picked
- Cancel while it is still cancellable; rate the dishes once collected
- Dark mode, keyboard shortcuts (`/` search, `c` cart), offline handling

**Counter** (`#/staff`)
- Live queue, filterable by status, auto-refreshing
- Move orders along, or cancel them; hand-moved orders are pinned so the
  auto-kitchen leaves them alone
- Stalled orders highlighted
- Stats: queue, revenue, average order, tips, sold out, orders per hour
- Edit stock, or take a dish off the menu entirely

## API

| Method | Route | Notes |
|---|---|---|
| GET | `/api/health` | build, open/closed, slot, rush hour, queue |
| GET | `/api/menu` | `veg`, `q`, `category`, `sort`, `servedOnly`, `maxPrice`, `tag`, `page`, `limit` |
| GET | `/api/menu/suggest` | up to 6 ranked names |
| GET | `/api/menu/categories` | names + counts |
| GET | `/api/menu/picks` | personalised strip (uses `X-Member-Id`) |
| GET | `/api/menu/:id` | detail + rating breakdown + also-bought |
| PATCH | `/api/menu/:id/stock` | staff |
| PATCH | `/api/menu/:id/availability` | staff, take off the menu |
| GET | `/api/coupons` | only what is usable in this slot |
| GET | `/api/pickup-slots` | 15-min slots with capacity left |
| GET | `/api/members/:id` | loyalty wallet and tier |
| POST | `/api/cart/quote` | the live bill, without ordering |
| POST | `/api/orders` | honours `Idempotency-Key` |
| GET | `/api/orders` | staff queue; `status`, `active`, `limit` |
| GET | `/api/orders/:token` | one order + allowed next states |
| PATCH | `/api/orders/:token/status` | 409 on an illegal move |
| POST | `/api/orders/:token/rate` | only after it is picked, once |
| GET | `/api/stats` | queue, revenue, top dishes, orders per hour |

## How the bill is worked out

```
subtotal
- combo discount        Rs. 15 when a combo dish meets a beverage
- coupon discount       capped per coupon
- points redeemed       50-point blocks, max half the food bill
= food total
+ packing               Rs. 5 per item, capped at Rs. 20
+ rush surcharge        5% between 12:30 and 2:00
= taxable
+ GST 5%                on the discounted amount, never the list price
+ tip
= total
```

Prices always come from `menu.json`. A `price` in the request body is ignored.

## Deliberate design choices

- **The API is slow on purpose** (250ms of jitter) so loading states and
  race conditions are real. `LATENCY_MS=0` turns it off.
- **The server clock decides** what is served, which slots are bookable and
  whether it is rush hour. A candidate who trusts the browser clock gets it wrong.
- **Logic is pure functions** under `logic/`, so tests can call them
  without starting a server.
- **Rounding is centralised** in `round2()` on both sides, so a decimal bug
  shows up in several places at once.
- **The kitchen advances orders on a timer**, so the tracking screen has
  something to show without anyone clicking. `AUTO_COOK=false` stops it.

## Debugging hints for selected planted backend bugs

These hints are written for students who may not know the backend words yet.

### Bug 1 — Stock quantity not checked

- **Meaning of words:**
  - **Stock** = how many plates/items are available.
  - **Quantity / qty** = how many the user is trying to buy.
  - **Validation** = checks that reject bad input before an order is created.
- **Hint:** if a dish says `In stock: 2`, try putting `3` or more in the cart.
- **Where to look:** order validation and stock reservation logic.
- **Question to ask:** does the backend check stock both before pricing and immediately before subtracting stock?

### Bug 2 — Cancelled order stock restored incorrectly

- **Meaning of words:**
  - **Reserve stock** = subtract stock when an order is placed.
  - **Release stock** = add stock back when an order is cancelled.
  - **Inventory drift** = stock slowly becomes wrong after actions.
- **Hint:** write down stock, place an order, cancel it, then check stock again.
- **Where to look:** the function that runs when an order is cancelled.
- **Question to ask:** is cancellation adding the quantity back, or subtracting it again?

### Bug 3 — Expired coupon still applies

- **Meaning of words:**
  - **Expired** = past the coupon's `expiresAt` date.
  - **Manual submission** = typing/sending a coupon code even if it is not shown as a suggestion.
  - **Server-side validation** = backend must reject invalid coupons even if frontend allows typing them.
- **Hint:** type `FRESHERS24` manually in the coupon box.
- **Where to look:** coupon validation in billing/pricing logic.
- **Question to ask:** does the backend check the coupon expiry at the point where the discount is calculated?

### Bug 4 — Menu limit parameter ignored

- **Meaning of words:**
  - **Limit** = requested page size, e.g. `limit=5` means return 5 items.
  - **Pagination** = splitting a long list into pages.
  - **Slice** = the selected part of the list for one page.
- **Hint:** the menu says requested page size is `5`; count how many dish cards are actually shown.
- **Where to look:** menu search/pagination logic, not the card rendering.
- **Question to ask:** does the backend calculate a sliced page but accidentally return the full list?

### Bug 5 — Member order filter broken

- **Meaning of words:**
  - **Member ID** = this browser/device's user identity, sent as `memberId`.
  - **Order token** = public order code like `CC-1234` saved in browser localStorage.
  - **Filter** = returning only rows that match a condition.
  - **localStorage** = browser storage that can keep old order tokens from earlier tests.
- **Hint:** use a private window or clear localStorage, place one order, then open My Orders.
- **What to compare:** My Orders shows requested member, server returned count, and saved token count.
- **Where to look:** `GET /api/orders` query filtering.
- **Question to ask:** frontend sends `memberId`; is backend reading `memberId` or a different query name?

## Before you plant bugs

```bash
git tag v3-clean
cd backend && node smoke.js     # 90/90 must pass
```

See `BUGS.md` for where each bug goes.
