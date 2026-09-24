# Planted bugs

Internal notes. This file is the answer key — it must not be in the
repo candidates receive.

Two categories: frontend and backend. Both are planted.

---

## Frontend

All five are in `frontend/style.css`. Nothing else in `frontend/` was
changed: `index.html` and every file in `js/` are identical to the clean
build. None of them shows on first load in the default light theme; each
needs an action (typing, clicking, resizing). One exception: the app starts
in dark mode when the computer's OS is set to dark and no theme has been
chosen yet, so bug 2 is visible immediately for those candidates (see bug 2).

Line 1 of `style.css` is `/* CANTEEN-CHAOS-DEBUG-V3 */`. If DevTools →
Sources doesn't show it, the browser has cached the clean CSS:
hard-reload with Ctrl+Shift+R.

### Listed to candidates (5)

| # | Bug | File | What the candidate sees |
|---|---|---|---|
| 1 | Search dropdown trapped in a low stacking context | `style.css` → `.search-wrap` | Typing `ch` opens suggestions that sit behind the page; most can't be clicked |
| 2 | Hard-coded text colour ignores the theme | `style.css` → `.dish-body` | In dark mode, dish names and prices are dark-on-dark and unreadable |
| 3 | Grid tracks can't shrink below card content | `style.css` → `.name-btn`, `.dish-card`, `.dish-card img` | At phone width (e.g. 500px) the menu is wider than the screen; the right column is cut off |
| 4 | Invisible layer over card controls | `style.css` → `.dish-card::after`, `.img-wrap::after` | Between 761 and 900px wide, Add to Cart and ★ on menu cards do nothing |
| 5 | Descendant selector instead of compound | `style.css` → `.site-nav .open` | On a phone (≤480px), the ☰ menu button opens nothing |

Suggested bug-log wording (symptoms only, like the backend entries):

1. "When I type in the search box, the suggestions appear behind other things and I can't click most of them."
2. "When I switch to dark mode I can't read the dish names or prices."
3. "On my phone the menu is wider than the screen and part of it is cut off."
4. "On my tablet, Add to Cart and the star button on the menu don't do anything."
5. "On my phone the ☰ menu button doesn't open anything."

### Details

**1 — Stacking context.**
- `.suggest-box` has `z-index: 100`, but its parent `.search-wrap` has `position: relative; z-index: 1`. That creates a stacking context, so the dropdown's 100 only counts inside `.search-wrap`.
- On the page as a whole, the dropdown sits at level 1. It loses to `#menu` (`position: relative; z-index: 2`) and `.cat-tabs` (`position: relative; z-index: 40`).
- At 1440×900, only about 9% of the dropdown can be clicked (clean build: 100%).
- **Fix:** remove `.search-wrap`'s z-index (or set it to `auto`). Giving it a value above 40 also works; accept it if the candidate can explain why.
- **Trap:** raising `.suggest-box` to `z-index: 9999` changes nothing (verified). Removing only `#menu`'s z-index is partial: the dropdown stays behind the category tabs.
- Concept: stacking contexts, z-index scope, paint order.

**2 — Dark mode.**
- `.dish-body` sets `color: #2b2118`, a hard-coded copy of the light theme's ink colour, instead of `var(--ink)`.
- The dish name (`color: inherit`) and the price inherit it. When `html[data-theme="dark"]` redefines `--ink` and `--card`, the card background follows but this text doesn't.
- Contrast drops from 14.4:1 (clean build) to 1.1:1.
- The grey category/rating line has its own colour and stays readable, which is a clue.
- With no saved theme, the app follows the OS setting (`js/state.js`, `prefers-color-scheme`). A candidate whose computer is in dark mode sees this bug on first load, and the header button then reads **Light** instead of **Dark**. Verified with Chromium's dark-scheme emulation. It's the same bug and the same fix; just don't be surprised when they report it without clicking anything.
- **Fix:** `color: var(--ink)`, or remove the declaration.
- A separate `[data-theme="dark"]` override with another hard-coded value works, but duplicates the token system; score lower.
- Concept: custom properties / theming, inheritance.

**3 — Grid intrinsic sizing.** Everything is inside `@media (max-width: 760px)`, so desktop is unaffected (four equal 265px columns).

What goes wrong at 500px:
- The two columns come out unequal (339px vs 257px).
- The page scrolls sideways by 92–128px, depending on the font.
- The right column's Add to Cart buttons are cut off.
- "Paneer Butter Masala with Butter Naan" stays fully readable.

Cause — two rules give every card a minimum width it can't go below:
- `.name-btn { width: max-content }`: names can't wrap, so a card is at least as wide as its one-line name.
- `.dish-card img { width: auto; min-width: 100%; height: 170px; aspect-ratio: 3 / 2 }`: every photo is 170 × 1.5 = 255px wide, however narrow the screen. This keeps the bug reproducible whatever the system font.
- The same block also sets `.dish-name { font-size: 17px }`.

Two more rules pass that minimum on to the grid:
- `.dish-card { overflow: clip }` (clean build: `hidden`). The automatic minimum size of a grid item is zeroed only when the item is a scroll container; `hidden` makes one and `clip` does not.
- `.menu-grid` uses `1fr`, which means `minmax(auto, 1fr)`, so the tracks refuse to shrink below the cards.

**Fix:**
- Let the tracks shrink: `minmax(0, 1fr)`, or `min-width: 0` on the card.
- Let names wrap: remove `max-content`, optionally adding `overflow-wrap: anywhere`.
- Restore `width: 100%` on the image.

**Trap:** `overflow: hidden` on the card "fixes" the overflow but cuts off about 100px of the Paneer name (verified). That hides information, so it doesn't count.

The dish name itself is unchanged: it lives in `backend/data/menu.json`.

Concept: grid intrinsic sizing, `min-width: auto` vs `0`, min-content / max-content.

**4 — Invisible overlay.**
- Inside `@media (min-width: 761px) and (max-width: 900px)`, two transparent, absolutely positioned pseudo-elements sit over the card controls:
  - `.dish-card::after`: the bottom 58px of every card, `z-index: 3`, over Add to Cart / the +/- stepper.
  - `.img-wrap::after`: 52×52px at the image's top-right, over ★.
- They win hit-testing. The click's target becomes the card or image wrapper, which has no `data-action`, so the JS ignores it.
- Buttons still look normal (orange, enabled, full opacity). The hand cursor and hover effect disappear in that range.
- Add to Cart inside the dish popup still works.
- Exact transition: 760 works, 761 / 800 / 900 fail, 901 works.
- It looks like a veil meant only for unavailable cards: `.dish-card.blocked::after` gets a faint tint, but the base selectors match every card.
- **Fix:** `pointer-events: none` on both, and/or scope them to `.dish-card.blocked`. Raising the buttons' z-index works but treats the symptom.
- Concept: hit-testing, pseudo-elements, `pointer-events`.

**5 — Mobile nav.**
- Inside `@media (max-width: 480px)`, the rule that should show the open menu is `.site-nav .open { display: flex }`.
- The space makes it a descendant selector ("an `.open` element inside `.site-nav`"), and no such element exists. The intended selector is `.site-nav.open`.
- The JS does its job: `#siteNav` gets class `open` and the button gets `aria-expanded="true"`. But the nav stays `display: none`. That split is the clue to look at CSS, not JS.
- At 481px and wider the links show inline and there is no ☰.
- **Fix:** remove the space. Making the nav always visible on mobile, or forcing it with `!important` / JS, is not a fix.
- Concept: compound vs descendant selectors; how JS state classes connect to CSS.

### Supporting notes (not bugs)

- **Bug 4 and opening hours.** Outside 7:00 AM – 10:00 PM the JS disables every Add to Cart button (a disabled button never fires clicks, and CSS can't change that). So the overlay also covers ★, which is never disabled, and bug 4 can be tested at any hour. To test Add to Cart late, use the README's `TZ=Pacific/Auckland npm start`.
- **Bugs 1 and 4 overlap harmlessly.** Between 761 and 900px the invisible bug 4 layer also sits over the (still trapped) search dropdown. No visible effect.
- **Not planted, present in the clean build too.** Search and category filters sometimes render the whole menu plus the matches (e.g. "paneer" shows the dish twice). It looks like the "stale search result overwriting a newer one" idea, so a candidate may report it as an unlisted bug. Treat a well-proven write-up as a brownie point; it is not one of the five CSS bugs.

### Checking they are all still live

There is no smoke script for these; they are visual. In Chrome, DevTools device toolbar (Ctrl+Shift+M), Responsive, zoom 100%. Reload after each width change.

| # | Viewport | Action | Bug is live if |
|---|---|---|---|
| 1 | 1440×900 | Type `ch` in search | Suggestions are mostly hidden behind the page |
| 2 | Any | Click **Dark** in the header (it already reads **Light** if the OS is in dark mode) | Card names and prices are unreadable |
| 3 | 500×900 | Look at the menu | The page scrolls sideways; the right column is cut off |
| 4 | 760, 761, 800, 900, 901 | Click ★ on the first card (and Add to Cart, 7 AM–10 PM) | Works at 760 and 901, nothing at 761 / 800 / 900 |
| 5 | 375×800 | Tap ☰ | No menu opens |

Verified in Chromium on this build, in three runs: during opening hours, during closed hours, and with a narrow font. The same checks run against the clean build show none of the five failures.

### Resetting between test runs

Nothing to reset. These bugs don't write data. Toggling dark mode and
favourites is stored in the browser's localStorage. Clear it with
DevTools → Application → Local storage → Clear, or use a private window.

---

## Backend

Planted in PR #1, plus frontend/data visibility changes afterwards.

### Listed to candidates (5)

| # | Bug | File | What the candidate sees |
|---|---|---|---|
| 1 | Stock quantity not checked | `logic/validation.js` | Cart can exceed available stock and the backend still accepts the order |
| 2 | Cancelled order stock restored incorrectly | `logic/validation.js` | Cancelling an order makes stock drop again instead of returning |
| 3 | Expired coupon still applies | `logic/pricing.js` | `FRESHERS24` works despite being expired |
| 4 | `limit` ignored | `logic/search.js` | Menu asks for 5 dishes, but more than 5 cards render |
| 5 | `price-asc` and `price-desc` swapped | `logic/search.js` | Both sort options do the opposite of their label |

**Bug 1 has two halves.** The check is missing in `validateLine` *and* in
`reserveStock`. Fixing only the first still oversells when two orders
arrive together. Decide whether that is full marks or partial.


### Not listed — bonus (3)

| # | Bug | File | What the candidate sees |
|---|---|---|---|
| A | Coupon `usesLeft` never decrements | `routes/orders.routes.js` | Coupon count stays the same after successful use, so a coupon can be used forever |
| B | Member filter reads the wrong query name | `routes/orders.routes.js` | My Orders shows saved token(s), but the server returns 0 or unrelated orders |
| C | `ready` listed as terminal | `logic/status.js` | A ready order is treated as past/done before pickup |


### Supporting changes (not bugs)

- `FRESHERS24` uses set to 10, so bug 3 is reachable at all
- Client-side stock guard removed in `frontend/js/state.js`, so the
  request actually reaches the server
- Cart now shows stock warnings in `frontend/js/cart.js`, so bug 1 is
  visible before checkout
- Coupon chips show remaining uses in `frontend/js/cart.js`, and
  `frontend/js/checkout.js` clears the coupon cache after placing an order
- Menu page size set to 5 in `frontend/js/menu.js`, so bug 4 is visible
- Menu result text shows first/last visible prices in `frontend/js/menu.js`,
  so bug 5 is easier to see
- My Orders calls the backend with `memberId` and shows requested member,
  server count and saved token count in `frontend/js/orders.js`, so bonus bug B is easier to see
- My Orders active/past grouping trusts backend `allowedNext`, so bonus
  bug C is visible earlier

### Checking they are all still live

```bash
cd backend && node smoke.js
```

Smoke coverage is not complete. Stock oversell, member-order filtering,
coupon-use counts and terminal-status behavior may need to be checked by
hand using the notes above.

### Resetting between test runs

Bug 1 and bug 2 drive stock negative. `data/menu.json` is a tracked
file, so restore it after testing:

```bash
git checkout -- backend/data/menu.json
echo "[]" > backend/data/orders.json
```