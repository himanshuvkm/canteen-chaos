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

Planted in PR #1, plus one data fix afterwards.

### Listed to candidates (5)

| # | Bug | File | What the candidate sees |
|---|---|---|---|
| 1 | Stock never checked | `logic/validation.js` | Ordering 5 of a dish with stock 3 succeeds; stock goes negative |
| 2 | Cancel subtracts stock instead of restoring | `logic/validation.js` | Cancelling an order makes stock fall further |
| 3 | Expired coupon still applies | `logic/pricing.js` | `FRESHERS24` works despite being expired |
| 4 | `limit` ignored | `logic/search.js` | Menu asks for 5 dishes, gets all 37 |
| 5 | Member filter reads the wrong query name | `routes/orders.routes.js` | My Orders is always empty |

**Bug 1 has two halves.** The check is missing in `validateLine` *and* in
`reserveStock`. Fixing only the first still oversells when two orders
arrive together. Decide whether that is full marks or partial.

### Not listed — bonus (3)

| # | Bug | File | What the candidate sees |
|---|---|---|---|
| A | `price-asc` and `price-desc` swapped | `logic/search.js` | Both sort options do the opposite of their label |
| B | Coupon `usesLeft` never decrements | `routes/orders.routes.js` | A coupon can be used forever; cancelling even *adds* uses |
| C | `ready` listed as terminal | `logic/status.js` | An order can never reach `picked`; rating is unreachable |

Bug C also hides the rating feature, so do not set any task that
depends on rating an order.

### Supporting changes (not bugs)

- `FRESHERS24` uses set to 10, so bug 3 is reachable at all
- Client-side stock guard removed in `frontend/js/state.js`, so the
  request actually reaches the server
- Menu page size set to 5 in `frontend/js/menu.js`, so bug 4 is visible

### Checking they are all still live

```bash
cd backend && node smoke.js
```

On the current build: **86 passed, 4 failed**. The four failures are
bugs 2, 3, 4 and A. Bugs 1, 5, B and C are not covered by smoke and have
to be checked by hand — see the notes above for how each one shows up.

### Resetting between test runs

Bug 1 and bug 2 drive stock negative. `data/menu.json` is a tracked
file, so restore it after testing:

```bash
git checkout -- backend/data/menu.json
echo "[]" > backend/data/orders.json
```
