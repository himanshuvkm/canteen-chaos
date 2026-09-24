# Planted bugs

Internal notes. This file is the answer key — it must not be in the
repo candidates receive.

Two categories. Backend is done; frontend is still to be planted.

---

## Frontend

*Nothing planted yet.*

| # | Bug | File | Effect | Listed to candidates? |
|---|---|---|---|---|
| | | | | |

Ideas when you get to it: CSS specificity, a breakpoint that hides the
nav, listeners lost on re-render, a spinner that never clears, a stale
search result overwriting a newer one.

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
