# Planted bugs — answer key

Internal notes. This file must not be in the repo candidates receive.

Ten bugs: five frontend (all CSS), five backend, plus three backend bonus
bugs that are deliberately left out of the candidate's bug log.

---

## Frontend

All five live in `frontend/style.css`; nothing else in `frontend/` was
changed. None appears on first load in the light theme — each needs an
action: typing, clicking or resizing.

`style.css` line 1 is `/* CANTEEN-CHAOS-DEBUG-V3 */`. If DevTools does not
show it, the browser cached the clean CSS; hard-reload.

| # | Bug | Where | Symptom | Verify at |
|---|---|---|---|---|
| 1 | Dropdown trapped in a low stacking context | `.search-wrap` | Search suggestions sit behind the page and mostly cannot be clicked | 1440×900, type `ch` |
| 2 | Hard-coded colour ignores the theme | `.dish-body` | Dish names and prices unreadable in dark mode | any width, click **Dark** |
| 3 | Grid tracks cannot shrink below card content | `.name-btn`, `.dish-card`, `.dish-card img` | Menu wider than the screen, right column cut off | 500×900 |
| 4 | Invisible layer over card controls | `.dish-card::after`, `.img-wrap::after` | Add to Cart and ★ do nothing | 761–900px wide |
| 5 | Ancestor overflow breaks sticky positioning | `.view` | Category/filter tabs scroll away instead of staying visible | 375×800, scroll menu |

### 1 — Stacking context

`.suggest-box` has `z-index: 100`, but `.search-wrap` has `position:
relative; z-index: 1`, creating a stacking context — so the 100 applies
only inside it. On the page the dropdown sits at level 1 and loses to
`#menu` (2) and `.cat-tabs` (40).

- **Fix:** remove `.search-wrap`'s z-index, or raise it above 40.
- **Trap:** raising `.suggest-box` to 9999 changes nothing.

### 2 — Theming

`.dish-body` sets `color: #2b2118` instead of `var(--ink)`. The card
background follows the theme; the text does not. Contrast falls from
14.4:1 to 1.1:1. The grey category line keeps its own colour and stays
readable — that is the clue.

- **Fix:** `color: var(--ink)`.
- A second hard-coded dark override works but duplicates the token system;
  score lower.
- If the candidate's OS is in dark mode they see this on first load, and
  the header button reads **Light**.

### 3 — Grid intrinsic sizing

All inside `@media (max-width: 760px)`. Two rules give each card a floor
it cannot go below: `.name-btn { width: max-content }` stops names
wrapping, and `.dish-card img` at a fixed 170px height with
`aspect-ratio: 3/2` is always 255px wide. Two more pass that floor to the
grid: `.dish-card { overflow: clip }` (the clean build uses `hidden`, and
only a scroll container zeroes a grid item's automatic minimum) and `1fr`,
which means `minmax(auto, 1fr)`.

- **Fix:** `minmax(0, 1fr)` or `min-width: 0` on the card; let names wrap;
  restore `width: 100%` on the image.
- **Trap:** `overflow: hidden` stops the sideways scroll but cuts ~100px
  off the long Paneer name. Hiding information is not a fix.

### 4 — Hit-testing

Inside `@media (min-width: 761px) and (max-width: 900px)`, two transparent
pseudo-elements cover the controls: `.dish-card::after` over Add to Cart,
`.img-wrap::after` over ★. Clicks land on them, so the JS sees no
`data-action`. The buttons still look normal; only the hand cursor goes.

- **Fix:** `pointer-events: none`, or scope both to `.dish-card.blocked`.
- Raising the buttons' z-index treats the symptom.

### 5 — Sticky positioning & ancestor overflow

Inside `@media (max-width: 480px)`, `.view { overflow-x: hidden }` was added as a responsive layout rule. In CSS, setting `overflow` to any value other than `visible` on an ancestor creates a scroll/clipping container. Because the ancestor `.view` does not scroll internally (the page viewport scrolls), `.filters` (which has `position: sticky; top: 0; z-index: 40;`) is trapped inside `.view`'s static context and scrolls off-screen instead of sticking to the viewport.

- **Candidate symptom:** "On smaller screens, the category/filter bar scrolls away instead of staying visible while I scroll through the menu."
- **Reproduce:**
  - Viewport: <= 480px wide (e.g. 375×800)
  - Action: Scroll down through the menu dishes
  - Broken behavior: The category/filter bar (`.filters`) scrolls out of view rather than remaining sticky at the top.
- **Root cause:**
  - Ancestor `.view` has `overflow-x: hidden` in `@media (max-width: 480px)`.
  - An ancestor with non-visible overflow acts as the containing scroll context for sticky descendants. Since `.view` itself is not the scrolling element, `.filters` cannot stick relative to window scroll.
- **Selectors affected:**
  - Ancestor: `.view` under `@media (max-width: 480px)`
  - Sticky element: `.filters` (`position: sticky; top: 0; z-index: 40;`)
- **Concept:**
  - `position: sticky`
  - Scrolling containers & containing context
  - Ancestor overflow clipping
- **Correct fix:**
  - Remove `overflow-x: hidden` from `.view` in `@media (max-width: 480px)` (or set `overflow-x: visible`).
- **Incorrect fixes:**
  - Changing `.filters` to `position: fixed` (breaks document flow and overlaps subsequent content without manual margin compensation).
  - Removing `position: sticky` from `.filters` (removes the feature instead of fixing it).
  - Adding `!important` to `position: sticky` on `.filters` (does not bypass ancestor overflow context).
- **Hidden test:**
  - Set viewport to 375×800.
  - Scroll window down: `window.scrollTo(0, 400)`.
  - Check `document.querySelector('.filters').getBoundingClientRect().top`. On clean/fixed build it is pinned at `0` (or top offset). On broken build it is negative (scrolled away with the page).

### Notes

- These write no data, so there is nothing to reset. Theme and favourites
  live in localStorage; clear it or use a private window.
- Outside 7 AM–10 PM the JS disables Add to Cart, so test bug 4 with ★,
  which is never disabled, or run `TZ=Pacific/Auckland npm start`.
- Bug 5 is independent of Bugs 1–4; desktop sticky behavior functions normally while breaking only at responsive mobile viewports (<= 480px).
- Mobile navigation `.site-nav.open` was corrected and functions normally (it is not a planted bug).
- Search and category filters sometimes render the whole menu plus the
  matches. That is in the clean build too — not one of the five. A solid
  write-up earns a brownie point.

---

## Backend

| # | Bug | File | Symptom |
|---|---|---|---|
| 1 | Stock quantity not checked | `logic/validation.js` | The cart can exceed stock and the order is still accepted |
| 2 | Cancelled order restores stock wrongly | `logic/validation.js` | Cancelling drops stock again instead of returning it |
| 3 | Expired coupon still applies | `logic/pricing.js` | `FRESHERS24` works despite being expired |
| 4 | `limit` ignored | `logic/search.js` | The menu asks for 5 dishes and renders more |
| 5 | `price-asc` / `price-desc` swapped | `logic/search.js` | Both sort options do the opposite of their label |

**Bug 1 has two halves.** The check is missing in `validateLine` *and* in
`reserveStock`. Fixing only the first still oversells when two orders
arrive together. Decide whether that is full or partial marks.

### Bonus — not in the candidate's bug log

| # | Bug | File | Symptom |
|---|---|---|---|
| A | Coupon `usesLeft` never decrements | `routes/orders.routes.js` | A coupon can be used forever |
| B | Member filter reads the wrong query name | `routes/orders.routes.js` | My Orders returns nothing, or unrelated orders |
| C | `ready` listed as terminal | `logic/status.js` | A ready order counts as done before pickup |

Bug C also makes order rating unreachable, so do not set any task that
depends on it.

### Notes

- `FRESHERS24` uses were set to 10, otherwise bug 3 cannot be reached.
- The client-side stock guard was removed from `js/state.js` so the request
  actually reaches the server.
- Several frontend labels were added to make these visible in the UI
  (stock warnings, coupon uses, page size, printed member id). Consider
  removing them and having candidates test the API directly.

### Verifying

```bash
cd backend && node smoke.js
```

Coverage is partial — stock oversell, member filtering, coupon counts and
terminal status need checking by hand.

Bugs 1 and 2 drive stock negative, so reset afterwards:

```bash
git checkout -- backend/data/menu.json
echo "[]" > backend/data/orders.json
```
