# Розміщення проекту MyBoo на хостингу

Проект — Node.js (Express): віддає статику та приймає замовлення на `/api/orders`, відправляє їх у Telegram.

## Що потрібно перед деплоєм

1. **Репозиторій Git**  
   Закомітьте проект у GitHub/GitLab (без папки `node_modules` і без файлу `.env` — вони в `.gitignore`).

2. **Змінні середовища на хостингу**  
   У панелі хостингу додайте:
   - `TELEGRAM_BOT_TOKEN` — токен бота від @BotFather
   - `TELEGRAM_CHAT_ID` — ID чату, куди летять замовлення  
   Файл `.env` на хостинг не завантажуйте — тільки ці змінні в налаштуваннях.

---

## Варіант 1: Render.com (безкоштовний тариф)

1. Зареєструйтесь на [render.com](https://render.com).
2. **New → Web Service**, підключіть репозиторій з проєктом.
3. Налаштування:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** додайте змінні `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (і за потреби `PORT` — Render сам задає порт).
4. Натисніть **Create Web Service**. Після збірки сайт буде доступний за посиланням типу `https://myboo-xxxx.onrender.com`.

---

## Варіант 2: Railway.app

1. Зареєструйтесь на [railway.app](https://railway.app).
2. **New Project → Deploy from GitHub**, оберіть репозиторій.
3. У проєкті відкрийте **Variables** і додайте `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
4. Railway сам визначить `npm start`. Після деплою видасть URL типу `https://xxx.up.railway.app`.

---

## Варіант 3: VPS (DigitalOcean, Timeweb, тощо)

1. На сервері встановіть Node.js (версія 18+).
2. Завантажте код (git clone або FTP).
3. У папці проєкту виконайте:
   ```bash
   npm install --production
   ```
4. Створіть файл `.env` з `PORT=3000`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
5. Запуск через **PM2** (щоб сервер не падав і перезапускався після перезавантаження):
   ```bash
   npm install -g pm2
   pm2 start server.js --name myboo
   pm2 save
   pm2 startup
   ```
6. Налаштуйте Nginx як зворотний проксі на порт 3000 і SSL (наприклад, Let's Encrypt).

---

## Перевірка після деплою

- Відкрийте головну сторінку — має відображатись сайт.
- Додайте товар у кошик, заповніть форму й надішліть замовлення — у Telegram має прийти повідомлення.
- Якщо замовлення не приходить — перевірте змінні `TELEGRAM_BOT_TOKEN` і `TELEGRAM_CHAT_ID` на хостингу.

---

## Важливо

- **Не публікуйте файл `.env`** у репозиторій — у ньому секрети. Використовуйте лише змінні середовища на хостингу.
- На безкоштовних тарифах (Render тощо) сервіс може “засинати” після простою; перше відкриття може бути повільним.
