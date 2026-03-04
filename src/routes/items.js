const express = require('express');
const router = express.Router();
const gopos = require('../services/gopos');

// GET /api/items?category_id=...
router.get('/', async (req, res) => {
  try {
    const params = {};
    if (req.query.category_id) params.category_id = req.query.category_id;

    const data = await gopos.getItems(params);
    res.json(data);
  } catch (err) {
    console.error('Błąd pobierania produktów:', err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// GET /api/categories
router.get('/categories', async (req, res) => {
  try {
    const data = await gopos.getCategories();
    res.json(data);
  } catch (err) {
    console.error('Błąd pobierania kategorii:', err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
