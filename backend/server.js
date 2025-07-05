/*
 * =================================================================
 * ПОЛНОЦЕННЫЙ БЭКЕНД ДЛЯ СЕРВИСА PWA (Node.js + Express + Firebase)
 * =================================================================
 * * Это структура проекта, представленная в одном файле.
 * * Новые зависимости для установки:
 * > npm install firebase-admin
 *
 * * Что нового:
 * 1. Интеграция с Firebase: Firestore для базы данных, Auth для пользователей, Storage для файлов.
 * 2. Аутентификация: API защищены, и каждое приложение привязано к ID пользователя (uid).
 * 3. Загрузка файлов: Добавлен (но закомментирован) пример роута для загрузки иконок.
 *
 * * Перед запуском:
 * 1. Создайте проект в Firebase Console (https://console.firebase.google.com/).
 * 2. Включите Firestore, Authentication (с методом Email/Password) и Storage.
 * 3. Скачайте ключ сервис-аккаунта (Service Account Key) в формате JSON.
 * 4. Поместите этот файл в корень проекта под именем 'serviceAccountKey.json'.
 */


// =================================================================
// Файл: config/firebase.js (Инициализация Firebase Admin SDK)
// =================================================================
const admin = require('firebase-admin');
// Файл ключа должен быть в корне проекта и добавлен в .gitignore
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Укажите URL вашего Firebase Storage бакета
  storageBucket: "YOUR_STORAGE_BUCKET_URL" // Например: "my-pwa-builder.appspot.com"
});

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage().bucket();

module.exports = { db, auth, storage, admin };


// =================================================================
// Файл: middleware/auth.js (Проверка токена аутентификации)
// =================================================================
const { auth: firebaseAuth } = require('./config/firebase');

const authMiddleware = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).send({ message: 'No token provided' });
    }

    const idToken = header.split('Bearer ')[1];
    try {
        const decodedToken = await firebaseAuth.verifyIdToken(idToken);
        req.user = decodedToken; // Добавляем данные пользователя (включая uid) в запрос
        next();
    } catch (error) {
        console.error('Error while verifying Firebase ID token:', error);
        res.status(403).send({ message: 'Unauthorized' });
    }
};


// =================================================================
// Файл: services/pwaGenerator.js (Без изменений)
// =================================================================
// Этот модуль остается таким же, как и в прошлой версии.
// Он по-прежнему отвечает за генерацию HTML, manifest и service worker.
const generateManifest = (config) => { /* ... код без изменений ... */ };
const generateServiceWorker = (targetUrl) => { /* ... код без изменений ... */ };
const generateHtml = (config) => { /* ... код без изменений ... */ };
module.exports = { generateManifest, generateServiceWorker, generateHtml };


// =================================================================
// Файл: server.js (Главный файл сервера)
// =================================================================
const express = require('express');
const cors = require('cors');
const { db } = require('./config/firebase');
const pwaGenerator = require('./services/pwaGenerator');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- API Роуты для управления приложениями (теперь с аутентификацией) ---

// Получить все приложения текущего пользователя
app.get('/api/apps', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.uid;
        const appsSnapshot = await db.collection('apps').where('userId', '==', userId).get();
        const apps = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(apps);
    } catch (error) {
        console.error("Error fetching user's apps:", error);
        res.status(500).json({ error: 'Failed to fetch apps' });
    }
});

// Создать новое приложение
app.post('/api/apps', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.uid;
        const config = req.body;

        if (!config.domain || !config.url || !config.name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Проверка, не занят ли домен
        const existingApp = await db.collection('apps').where('domain', '==', config.domain).limit(1).get();
        if (!existingApp.empty) {
            return res.status(409).json({ error: 'This domain is already taken' });
        }

        const newApp = { ...config, userId };
        const docRef = await db.collection('apps').add(newApp);
        
        res.status(201).json({ id: docRef.id, ...newApp });
    } catch (error) {
        console.error("Error creating app:", error);
        res.status(500).json({ error: 'Failed to create app' });
    }
});

// Обновить существующее приложение
app.put('/api/apps/:appId', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { appId } = req.params;
        const config = req.body;
        
        const appRef = db.collection('apps').doc(appId);
        const doc = await appRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'App not found' });
        }
        if (doc.data().userId !== userId) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        await appRef.update(config);
        res.status(200).json({ id: appId, ...config });

    } catch (error) {
        console.error("Error updating app:", error);
        res.status(500).json({ error: 'Failed to update app' });
    }
});

/*
// ПРИМЕР: Роут для загрузки файла иконки в Firebase Storage
// Для его работы нужно будет установить 'multer' и 'busboy'
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/apps/:appId/icon', authMiddleware, upload.single('icon'), async (req, res) => {
    // ... здесь будет логика проверки прав доступа ...
    const file = req.file;
    const blob = storage.file(`icons/${req.params.appId}/${file.originalname}`);
    const blobStream = blob.createWriteStream({
        metadata: { contentType: file.mimetype }
    });
    blobStream.on('error', err => res.status(500).json({error: err.message}));
    blobStream.on('finish', () => {
        const publicUrl = `https://storage.googleapis.com/${storage.name}/${blob.name}`;
        // Сохраняем publicUrl в документе приложения в Firestore
        db.collection('apps').doc(req.params.appId).update({ icon: publicUrl });
        res.status(200).json({ iconUrl: publicUrl });
    });
    blobStream.end(file.buffer);
});
*/


// --- Главный роутер, который обслуживает PWA (теперь ищет в Firestore) ---
app.get('*', async (req, res) => {
    const domain = req.hostname;
    
    try {
        const appsSnapshot = await db.collection('apps').where('domain', '==', domain).limit(1).get();

        if (appsSnapshot.empty) {
            return res.status(404).send(`<h1>Сервис для домена ${domain} не настроен.</h1>`);
        }

        const appConfig = appsSnapshot.docs[0].data();

        switch (req.path) {
            case '/manifest.json':
                res.type('application/json');
                res.send(pwaGenerator.generateManifest(appConfig));
                break;
            case '/service-worker.js':
                res.type('application/javascript');
                res.send(pwaGenerator.generateServiceWorker(appConfig.url));
                break;
            default:
                res.type('text/html');
                res.send(pwaGenerator.generateHtml(appConfig));
                break;
        }
    } catch (error) {
        console.error(`Error processing request for domain ${domain}:`, error);
        res.status(500).send('<h1>Ошибка сервера</h1>');
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
