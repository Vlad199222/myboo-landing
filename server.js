require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const compression = require('compression');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json());

// У production віддавати мініфіковані CSS/JS для кращого PageSpeed
if (process.env.NODE_ENV === 'production') {
  app.get('/css/styles.css', (req, res, next) => {
    const minPath = path.join(__dirname, 'css', 'styles.min.css');
    if (fs.existsSync(minPath)) {
      return res.sendFile(minPath, { maxAge: '1d' });
    }
    next();
  });
  app.get('/js/main.js', (req, res, next) => {
    const minPath = path.join(__dirname, 'js', 'main.min.js');
    if (fs.existsSync(minPath)) {
      return res.sendFile(minPath, { maxAge: '1d' });
    }
    next();
  });
}

app.use(express.static(path.join(__dirname), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true
}));

// In-memory store for orders (replace with DB later)
const orders = [];

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendOrderToTelegram(order) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram: TELEGRAM_BOT_TOKEN або TELEGRAM_CHAT_ID не задані в .env');
    return;
  }
  const confirmLabel = order.confirmType === 'nocall'
    ? 'Дані введено вірно, відправка без дзвінка'
    : 'Зателефонуйте мені';
  const lines = [
    '🛒 Нове замовлення',
    '',
    `📋 № ${order.id}`,
    `👤 ${order.customer.name}`,
    `📞 ${order.customer.phone}`,
    `📍 ${order.customer.address}`,
    '',
    `✅ Підтвердження: ${confirmLabel}`,
    '',
    'Товари:',
    ...order.items.map((i) => `• ${i.name} × ${i.quantity} — ${(i.price * i.quantity).toFixed(0)} грн`),
    '',
    `💰 Разом: ${order.total.toFixed(0)} грн`,
  ];
  const text = lines.join('\n');
  const body = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text,
  });
  const url = new URL(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`);
  const opts = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body, 'utf8'),
    },
  };
  const req = https.request(opts, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode !== 200) console.error('Telegram API:', res.statusCode, data);
    });
  });
  req.on('error', (err) => console.error('Telegram send error:', err.message));
  req.write(body);
  req.end();
}

// API: submit order
app.post('/api/orders', (req, res) => {
  try {
    const { customer, items } = req.body;

    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Потрібні дані клієнта та список товарів.',
      });
    }

    const { name, phone, address } = customer;
    const hasName = name && String(name).trim();
    const hasPhone = phone && String(phone).trim();
    const hasAddress = address && String(address).trim();
    if (!hasName || !hasPhone || !hasAddress) {
      return res.status(400).json({
        success: false,
        error: 'Заповніть усі обов’язкові поля: ім’я, телефон, адреса доставки.',
      });
    }

    const confirmType = (req.body.confirmType === 'nocall') ? 'nocall' : 'call';
    const order = {
      id: String(Date.now()),
      customer: { name: hasName, phone: hasPhone, address: hasAddress },
      confirmType,
      items: items.map(({ id, name, price, quantity }) => ({
        id,
        name,
        price: Number(price),
        quantity: Number(quantity) || 1,
      })),
      total: items.reduce(
        (sum, item) => sum + Number(item.price) * (Number(item.quantity) || 1),
        0
      ),
      createdAt: new Date().toISOString(),
    };

    orders.push(order);
    sendOrderToTelegram(order);

    res.status(201).json({
      success: true,
      orderId: order.id,
      total: order.total,
    });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({
      success: false,
      error: 'Помилка сервера. Спробуйте пізніше.',
    });
  }
});

// Optional: get orders (for admin / debugging)
app.get('/api/orders', (req, res) => {
  res.json({ orders });
});

// SPA fallback: serve index for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


