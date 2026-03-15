# MyBoo — Ecommerce Landing

Односторінковий інтернет-магазин (лендінг): HTML, CSS, Vanilla JS + Node.js (Express).

## Можливості

- **Карточки товарів** — додавання в кошик
- **Форма замовлення** — ім'я, email, телефон, адреса; відправка на API
- **API замовлень** — `POST /api/orders` приймає замовлення
- **Адаптивна верстка**

## Запуск

```bash
# Встановити залежності
npm install

# Запустити сервер (порт 3000)
npm start
```

Відкрийте в браузері: **http://localhost:3000**

## API

- **POST /api/orders** — створити замовлення  
  Body: `{ "customer": { "name", "email", "phone", "address" }, "items": [ { "id", "name", "price", "quantity" } ] }`  
  Відповідь: `{ "success": true, "orderId", "total" }`

- **GET /api/orders** — список замовлень (для перевірки)

## Структура

- `index.html` — головна сторінка (hero, товари, форма замовлення, контакти)
- `css/styles.css` — стилі
- `js/main.js` — кошик, підсумок замовлення, відправка на API
- `server.js` — Express: статика + `/api/orders`
