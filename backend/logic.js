// logic.js
// Pure functions used by the API. These are the functions the Level 6
// (backend) tests call directly, without starting a server.

const PACKING_CHARGE = 10;

/**
 * Find one dish by id.
 * Returns the dish object, or null when it does not exist.
 */
function findDish(id, menu) {
  const dishId = Number(id);
  if (!Number.isInteger(dishId)) return null;
  const dish = menu.find((d) => d.id === dishId);
  return dish || null;
}

/**
 * Check an incoming order before it is saved.
 * Returns { valid, errors }.
 *
 * An order looks like: { items: [{ dishId: 1, qty: 2 }, ...] }
 */
function validateOrder(order, menu) {
  const errors = [];

  if (!order || typeof order !== 'object') {
    return { valid: false, errors: ['Order must be an object'] };
  }
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return { valid: false, errors: ['Order must contain at least one item'] };
  }
  if (order.items.length > 20) {
    errors.push('An order cannot contain more than 20 different dishes');
  }

  const seen = new Set();

  order.items.forEach((item, index) => {
    const where = `items[${index}]`;

    const dish = findDish(item && item.dishId, menu);
    if (!dish) {
      errors.push(`${where}: dish ${item && item.dishId} does not exist`);
      return;
    }
    if (!dish.available) {
      errors.push(`${where}: ${dish.name} is sold out`);
    }
    if (seen.has(dish.id)) {
      errors.push(`${where}: dish ${dish.id} is listed more than once`);
    }
    seen.add(dish.id);

    const qty = item.qty;
    if (typeof qty !== 'number' || !Number.isInteger(qty)) {
      errors.push(`${where}: qty must be a whole number`);
      return;
    }
    if (qty < 1) {
      errors.push(`${where}: qty must be at least 1`);
    }
    if (qty > 10) {
      errors.push(`${where}: qty cannot be more than 10`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Work out what the order costs.
 * Prices always come from the menu, never from the request body.
 * Returns { subtotal, packing, total, lines }.
 */
function calculateTotal(items, menu) {
  let subtotal = 0;
  const lines = [];

  items.forEach((item) => {
    const dish = findDish(item.dishId, menu);
    if (!dish) return;

    const qty = Number(item.qty) || 0;
    const lineTotal = dish.price * qty;
    subtotal += lineTotal;

    lines.push({
      dishId: dish.id,
      name: dish.name,
      price: dish.price,
      qty,
      lineTotal: round2(lineTotal),
    });
  });

  subtotal = round2(subtotal);
  const packing = lines.length > 0 ? PACKING_CHARGE : 0;
  const total = round2(subtotal + packing);

  return { subtotal, packing, total, lines };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

module.exports = { findDish, validateOrder, calculateTotal, PACKING_CHARGE };
