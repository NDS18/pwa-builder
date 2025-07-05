// ФИНАЛЬНЫЙ И ИСПРАВЛЕННЫЙ КОД V2 ДЛЯ server.js
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

let db, auth;

// --- Блок инициализации с самодиагностикой и проверкой ---
if (!admin.apps.length) {
  try {
    console.log("Проверка переменных окружения...");
    if (!process.env.SERVICE_ACCOUNT) {
      throw new Error('Переменная окружения SERVICE_ACCOUNT не найдена.');
    }
    console.log("Парсинг SERVICE_ACCOUNT...");
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);

    console.log("Инициализация Firebase Admin SDK...");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log("Firebase Admin SDK успешно инициализирован.");
  } catch (error) {
    console.error("КРИТИЧЕСКАЯ ОШИБКА ИНИЦИАЛИЗАЦИИ FIREBASE:", error.message);
  }
}

// Инициализируем сервисы Firebase только если приложение было успешно создано
if (admin.apps.length > 0) {
    db = admin.firestore();
    auth = admin.auth();
}

const app = express();

// Настройка CORS
const corsOptions = {
    origin: process.env.FRONTEND_URL || '*'
};
app.use(cors(corsOptions));
app.use(express.json());

// --- Middleware для проверки токена ---
const authMiddleware = async (req, res, next) => {
    if (!auth) {
        return res.status(500).send({ message: 'Сервис аутентификации не инициализирован.' });
    }
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
        res.status(403).send({ message: 'Unauthorized' });
    }
};

// --- Функции-генераторы PWA (для краткости опущены, скопируйте их из предыдущей версии) ---
const generateManifest = (config) => { /* ... */ };
const generateServiceWorker = (targetUrl) => { /* ... */ };
const generateHtml = (config) => { /* ... */ };


// --- API Роуты ---
app.get('/api/test', (req, res) => {
    res.status(200).json({ message: 'Бэкенд работает!', firebase: admin.apps.length > 0 ? 'инициализирован' : 'не инициализирован' });
});

app.get('/api/apps', authMiddleware, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Сервис базы данных не инициализирован.' });
    try {
        const userId = req.user.uid;
        const appsSnapshot = await db.collection('apps').where('userId', '==', userId).get();
        const apps = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(apps);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch apps' });
    }
});

app.post('/api/apps', authMiddleware, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Сервис базы данных не инициализирован.' });
    try {
        const userId = req.user.uid;
        const config = req.body;
        const newApp = { ...config, userId };
        const docRef = await db.collection('apps').add(newApp);
        res.status(201).json({ id: docRef.id, ...newApp });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create app' });
    }
});


// --- Главный роутер для обслуживания PWA ---
app.get('*', async (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).send({ error: `API endpoint not found: ${req.path}` });
    }
    if (!db) return res.status(500).send('Сервис базы данных не инициализирован.');

    const domain = req.hostname;
    try {
        const appsSnapshot = await db.collection('apps').where('domain', '==', domain).limit(1).get();
        if (appsSnapshot.empty) {
            return res.status(404).send(`Сервис для домена ${domain} не настроен.`);
        }
        const appConfig = appsSnapshot.docs[0].data();

        switch (req.path) {
            case '/manifest.json':
                res.type('application/json').send(generateManifest(appConfig));
                break;
            case '/service-worker.js':
                res.type('application/javascript').send(generateServiceWorker(appConfig.url));
                break;
            default:
                res.type('text/html').send(generateHtml(appConfig));
                break;
        }
    } catch (error) {
        res.status(500).send('Ошибка сервера при поиске приложения.');
    }
});


module.exports = app;
