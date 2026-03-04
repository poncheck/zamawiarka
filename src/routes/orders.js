const express = require('express');
const router = express.Router();
const gopos = require('../services/gopos');

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const { type, items, customer_name, phone, notes } = req.body;

    if (!type || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Wymagane pola: type (DINE_IN|DELIVERY|PICK_UP) oraz niepusta tablica items',
      });
    }

    for (const item of items) {
      if (!item.item_id || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          error: 'Każdy element musi zawierać item_id oraz quantity >= 1',
        });
      }
    }

    const orderPayload = {
      type,
      items: items.map(({ item_id, quantity }) => ({ item_id, quantity })),
    };

    if (customer_name) orderPayload.customer_name = customer_name;
    if (phone) orderPayload.phone = phone;
    if (notes) orderPayload.notes = notes;

    const result = await gopos.createOrder(orderPayload);
    res.status(201).json(result);
  } catch (err) {
    console.error('Błąd tworzenia zamówienia:', err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// GET /api/payment-methods
router.get('/payment-methods', async (req, res) => {
  try {
    const data = await gopos.getPaymentMethods();
    res.json(data);
  } catch (err) {
    console.error('Błąd pobierania metod płatności:', err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
