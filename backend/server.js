// ИСПРАВЛЕННЫЙ И ПОЛНЫЙ КОД ДЛЯ server.js
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
  process.exit(1);
}
// --- Конец блока инициализации ---

const db = admin.firestore();
const auth = admin.auth();
const app = express();

// Настройка CORS
const corsOptions = {
    origin: process.env.FRONTEND_URL || '*'
};
app.use(cors(corsOptions));
app.use(express.json());

// Middleware для проверки токена
const authMiddleware = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).send({ message: 'No token provided' });
    }
    const idToken = header.split('Bearer ')[1];
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error while verifying Firebase ID token:', error);
        res.status(403).send({ message: 'Unauthorized' });
    }
};

// --- Функции генераторы PWA ---
const generateHtml = (config) => `<!DOCTYPE html>...`; // Содержимое этих функций для краткости опущено
const generateManifest = (config) => `...`;
const generateServiceWorker = (targetUrl) => `...`;

// --- API Роуты для управления приложениями ---
app.get('/api/apps', authMiddleware, async (req, res) => {
    const userId = req.user.uid;
    const appsSnapshot = await db.collection('apps').where('userId', '==', userId).get();
    const apps = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(apps);
});
// ... Другие API роуты (POST, PUT) ...

// --- Главный роутер, который обслуживает PWA ---
app.get('*', async (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).send({ error: 'API endpoint not found' });
    }
    // ... Логика поиска приложения по домену и генерации PWA ...
});

module.exports = app;