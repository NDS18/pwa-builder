// УЛУЧШЕННЫЙ КОД ДЛЯ server.js
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// --- Блок инициализации с самодиагностикой ---
try {
  if (!process.env.SERVICE_ACCOUNT) {
    throw new Error('Переменная окружения SERVICE_ACCOUNT не найдена.');
  }

  const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log("Firebase Admin SDK успешно инициализирован.");

} catch (error) {
  console.error("КРИТИЧЕСКАЯ ОШИБКА ИНИЦИАЛИЗАЦИИ FIREBASE:", error.message);
  // Завершаем процесс, если Firebase не может быть инициализирован
  // Это предотвратит запуск сервера в нерабочем состоянии.
  process.exit(1);
}
// --- Конец блока инициализации ---

const db = admin.firestore();
const app = express();

// Настройка CORS
const corsOptions = {
    origin: process.env.FRONTEND_URL || '*' // Используем переменную окружения или разрешаем всем
};
app.use(cors(corsOptions));
app.use(express.json());

// Middleware для проверки токена (пример)
const authMiddleware = async (req, res, next) => {
  // ... здесь будет ваша логика проверки токена
  next();
};

// --- API Роуты ---
app.get('/api/test', (req, res) => {
  res.status(200).send({ message: 'Бэкенд работает и отвечает!' });
});

// ... здесь будут ваши остальные роуты (/api/apps и т.д.)

// Экспортируем приложение для Vercel
module.exports = app;
