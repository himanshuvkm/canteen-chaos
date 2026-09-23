# Canteen Chaos — base app (v1-clean)

The working version of the Hostel Canteen ordering site. This is the
**clean** build. Bugs get planted on top of this for the BYTE recruitment
debugging stage — see `BUGS.md`.

## Run it

```bash
cd backend
npm install
npm start
```

Open http://localhost:3000 — the server also serves the frontend, so there
is nothing else to start.

## What's in it

```
backend/
  server.js        Express routes
  logic.js         calculateTotal / validateOrder / findDish  (pure functions)
  data/menu.json   24 dishes, 5 categories, 2 sold out
  data/orders.json orders are appended here
frontend/
  index.html       one page: header, filters, menu grid, cart panel, modal
  style.css        ~430 lines, no framework
  app.js           rendering + cart state
  api.js           every fetch call
  img/             8 placeholder images with different aspect ratios
```

## API

| Method | Route | Notes |
|---|---|---|
| GET | `/api/menu` | supports `?veg=true`, `?q=dosa`, `?category=Snacks` |
| GET | `/api/menu/:id` | 404 when the dish does not exist |
| POST | `/api/orders` | body `{ items: [{ dishId, qty }] }`, returns a token |
| GET | `/api/orders/:token` | order + status |
| PATCH | `/api/orders/:token/status` | body `{ status }` — placed / preparing / ready / picked |
| GET | `/api/health` | returns the build tag |

Prices always come from `menu.json`. A `price` sent in the request body is
ignored — that behaviour is what Level 6 breaks and candidates restore.

## Features that work in this build

- Menu grid: 4 columns desktop, 3 tablet, 2 small tablet, 1 phone
- Search with a 300ms debounce, plus Veg / Non-veg filters
- Quantity steppers, add to cart, cart saved in localStorage
- Subtotal + Rs. 10 packing + total, rounded correctly
- Place order, token modal with focus trap and Esc to close
- Loading, error (with retry), empty and success states
- Hamburger nav below 480px
- Sold-out dishes disabled

## Before you plant bugs

Tag this commit:

```bash
git tag v1-clean
```

Write the tests against this version first, then break things.
# canteen-chaos
