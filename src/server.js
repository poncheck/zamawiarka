require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const itemsRouter = require('./routes/items');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Pliki statyczne (frontend)
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/items', itemsRouter);
app.use('/api/categories', itemsRouter);  // deleguje do tego samego routera
app.use('/api/orders', ordersRouter);
app.use('/api/payment-methods', ordersRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// SPA fallback - wszystkie inne GET-y zwracają index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Zamawiarka działa na http://localhost:${PORT}`);
  console.log(`Środowisko: ${process.env.NODE_ENV || 'development'}`);
  console.log(`GoPOS organization: ${process.env.GOPOS_ORGANIZATION_ID || '(nie ustawiono)'}`);
});
