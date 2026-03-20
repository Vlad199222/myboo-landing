/**
 * Vercel Serverless function: POST /api/orders
 * Используется фронтендом через fetch('/api/orders')
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function buildTelegramText(order) {
  const confirmLabel =
    order.confirmType === 'nocall'
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

  return lines.join('\n');
}

async function sendOrderToTelegram(order) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error('TELEGRAM_BOT_TOKEN або TELEGRAM_CHAT_ID не задані');
  }

  const text = buildTelegramText(order);
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
    }),
  });

  // Telegram возвращает JSON вида { ok: true/false, ... }
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Telegram HTTP error: ${res.status} ${txt}`);
  }

  const data = await res.json().catch(() => null);
  if (data && data.ok === false) {
    throw new Error(`Telegram API error: ${data.description || 'unknown error'}`);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const rawBody = req.body;
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : (rawBody || {});

    const { customer, items, confirmType: confirmTypeRaw } = body;

    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'Потрібні дані клієнта та список товарів.' });
      return;
    }

    const { name, phone, address } = customer;
    const hasName = name && String(name).trim();
    const hasPhone = phone && String(phone).trim();
    const hasAddress = address && String(address).trim();
    if (!hasName || !hasPhone || !hasAddress) {
      res.status(400).json({
        success: false,
        error: 'Заповніть усі обов’язкові поля: ім’я, телефон, адреса доставки.',
      });
      return;
    }

    const confirmType = (confirmTypeRaw === 'nocall') ? 'nocall' : 'call';
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

    await sendOrderToTelegram(order);

    res.status(201).json({ success: true, orderId: order.id, total: order.total });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ success: false, error: 'Помилка сервера. Спробуйте пізніше.' });
  }
};

