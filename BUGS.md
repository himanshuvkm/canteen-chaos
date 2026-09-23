# Where to plant each bug

One branch per level. Break the clean build, confirm that level's tests
fail, fix it back, confirm they pass. Keep 2–3 red herrings per level, no more.

The app now has 9 frontend modules and 4 backend logic modules, so a bug
can sit a long way from where it shows up. That is the point.

---

## Level 1 — CSS basics (`style.css`)

| # | Bug | How to plant it | What the candidate sees |
|---|---|---|---|
| 1 | Stretched images | Remove `object-fit: cover` from `.dish-card img` | Dishes squashed; images have different aspect ratios on purpose |
| 2 | Hidden things visible | Delete the `[hidden] { display: none !important }` rule | The cart panel covers the page and blocks every click |
| 3 | Long name overflows | Remove `overflow-wrap: break-word` from `.dish-name` | Dish 11's long name breaks its card |
| 4 | Badge sits behind image | Give `.dish-card img` `position: relative; z-index: 2` | "Sold out" invisible, but only on some cards |

Bug 2 is the good one: the symptom ("nothing is clickable") is nowhere
near the cause.

## Level 2 — Responsive + theming (`style.css`)

| # | Bug | How to plant it |
|---|---|---|
| 5 | Mobile nav never opens | Keep `.site-nav { display: none }` but delete `.site-nav.open { display: flex }` |
| 6 | Grid wrong on phones | Change the 480px block to `repeat(4, 1fr)` |
| 7 | Dark mode unreadable | Remove `--ink` and `--card` from `html[data-theme="dark"]` so text stays dark on dark |
| 8 | Sticky header overlaps | Drop `z-index` on `.site-header` |

Vary the breakpoint per candidate: 420 / 480 / 520 / 560px.

## Level 3 — JS basics and state (`js/utils.js`, `js/state.js`, `js/menu.js`)

| # | Bug | How to plant it |
|---|---|---|
| 9 | `Rs. undefined` | In `dishCard()` use `dish.prce` |
| 10 | Wrong cart badge | `cartCount()` returns `Object.keys(state.cart).length` |
| 11 | `Rs. 74.550000001` | Strip the rounding out of `round2()` — prices in menu.json already have decimals |
| 12 | Favourites reset on reload | `storage.set` in `toggleFavourite()` writes to the wrong key |
| 13 | Max-10 rule broken | In `addToCart()` compare `current > 10` instead of `next > 10` (off by one) |

## Level 4 — Events, re-render and listeners (`js/menu.js`, `js/cart.js`)

| # | Bug | How to plant it |
|---|---|---|
| 14 | Buttons die after re-render | Move the grid listener inside `renderMenu()` and attach per card |
| 15 | Cart lost on refresh | Make `loadCart` read a key nothing ever writes |
| 16 | Steppers keyboard-dead | Replace `.qty-btn` buttons with `<span onclick>` |
| 17 | Modal traps nothing | Delete the `Tab` branch in `modalKeydown` — the dialog still looks fine |
| 18 | Cart badge goes stale | Remove the `onChange` subscriber at the bottom of `cart.js` |

Bug 18 is subtle: the cart is right, the number on screen is not.

## Level 5 — Async, races and errors (`js/api.js`, `js/menu.js`, `js/orders.js`)

| # | Bug | How to plant it |
|---|---|---|
| 19 | Search shows old results | Drop the `key` option so requests are never aborted, and delete the `menuRequestId` guard. With the built-in latency, typing "mo" then "momos" shows the wrong list |
| 20 | Blank page on failure | Remove the `try/catch` in `loadMenu()` |
| 21 | Spinner forever | Delete the `finally` block |
| 22 | 200 OK that is really an error | Make one dish id return `res.json({ status: 'error' })` in `server.js`, and delete the `looksWrong` check in `api.js` |
| 23 | Polling never stops | Remove `stopTracking()` from `closeModal()` — timers stack up, and every open order is polled forever |
| 24 | Offline is silent | Delete the `AbortError` / network branch in `request()` so it throws a raw TypeError |

Bug 23 only shows in the Network tab, which is exactly the skill being tested.
Vary the poisoned dish id per candidate.

## Level 6 — Backend logic (`backend/logic/*`)

| # | File | Bug | How to plant it |
|---|---|---|---|
| 25 | `pricing.js` | Rs. 1 thali | In `buildLines()` use `item.price` instead of `dish.price` |
| 26 | `pricing.js` | GST charged on the wrong base | Compute `gst` from `subtotal` instead of `discounted + packing` |
| 27 | `pricing.js` | Coupon cap ignored | Drop the `Math.min(discount, coupon.maxDiscount)` line — BYTE10 then gives 10% with no ceiling |
| 28 | `pricing.js` | Packing cap ignored | Remove `Math.min(..., PACKING_CAP)` |
| 29 | `validation.js` | Negative qty accepted | Delete the `qty < 1` and integer checks |
| 30 | `validation.js` | Stock never checked | Remove the `qty > dish.stock` branch — orders succeed, stock goes negative |
| 31 | `validation.js` | Stock never returns | `releaseStock()` subtracts instead of adds |
| 32 | `availability.js` | Breakfast served at midnight | Make `isServedNow()` return `true` for every slot |
| 33 | `availability.js` | Off-by-one at the boundary | Use `<=` instead of `<` on the window end, so 11:00 counts as both breakfast and lunch |
| 34 | `status.js` | Any status jump allowed | Make `canTransition()` always return `{ ok: true }` — placed orders can jump to picked |
| 35 | `status.js` | Cancel after cooking | Add `'cancelled'` to `allowedNext()` for every status |
| 36 | `status.js` | ETA always 8 minutes | Make `estimateMinutes()` ignore the queue and the slowest dish |

These are all pure functions, so the tests call them directly. No server
needs to run inside the browser editor.

---

## Red herrings (keep to 2–3 per level)

- `frontend/js/NavFix.js` — exists, is never loaded, looks important
- README documenting an old `/api/dishes` route that no longer exists
- A commented-out `calculateTotalOld()` in `pricing.js` with a different formula
- A handover note from the "senior" blaming the wrong file
- `LEGACY.css` — 80 lines of dead rules, none of them applied
- A `// TODO: fix rounding here` comment sitting somewhere harmless

## Per-candidate variants

Generate everything from the roll number:

- mobile breakpoint: 420 / 480 / 520 / 560
- the poisoned dish id
- which 3 bugs of each level they receive
- 4 dish prices, so a copied total is wrong
- the coupon code that is expected to work
- the GST rate (5% or 12%), so a copied bill fails

Keep expected values on the server. Never ship them to the browser.

## Before you start

```bash
git tag v2-clean
cd backend && node smoke.js   # 32 checks, all must pass
```

`smoke.js` runs against the clean build. Every bug above should make at
least one of those checks fail — if it does not, the bug is not worth
planting, because you cannot grade it automatically.
