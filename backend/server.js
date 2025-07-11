// ФИНАЛЬНЫЙ И ИСПРАВЛЕННЫЙ КОД V3 ДЛЯ server.js
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

let db, auth;

// --- Блок инициализации с самодиагностикой и проверкой ---
if (!admin.apps.length) {
  try {
    if (!process.env.SERVICE_ACCOUNT) {
      throw new Error('Переменная окружения SERVICE_ACCOUNT не найдена.');
    }
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error("КРИТИЧЕСКАЯ ОШИБКА ИНИЦИАЛИЗАЦИИ FIREBASE:", error.message);
  }
}

if (admin.apps.length > 0) {
    db = admin.firestore();
    auth = admin.auth();
}

const app = express();

const corsOptions = {
    origin: process.env.FRONTEND_URL || '*'
};
app.use(cors(corsOptions));
app.use(express.json());

// --- Middleware для проверки токена ---
const authMiddleware = async (req, res, next) => {
    if (!auth) return res.status(500).send({ message: 'Сервис аутентификации не инициализирован.' });
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).send({ message: 'No token provided' });
    const idToken = header.split('Bearer ')[1];
    try {
        req.user = await auth.verifyIdToken(idToken);
        next();
    } catch (error) {
        res.status(403).send({ message: 'Unauthorized' });
    }
};

// --- Функции-генераторы PWA ---
const generateManifest = (config) => {
    return JSON.stringify({
        short_name: config.name || "App",
        name: config.name || "PWA Application",
        icons: [{ src: config.icon || 'icon.png', type: 'image/png', sizes: '512x512' }],
        start_url: '.',
        display: 'standalone',
        theme_color: config.themeColor || '#ffffff',
        background_color: '#ffffff'
    }, null, 2);
};

const generateServiceWorker = (targetUrl) => {
    return `
        const targetUrl = '${targetUrl || '/'}';
        self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
        self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
        self.addEventListener('fetch', event => {
            if (event.request.mode === 'navigate') {
                event.respondWith(Response.redirect(targetUrl));
            }
        });
    `;
};

const generateHtml = (config) => {
    return `
        <!DOCTYPE html>
        <html lang="${config.language || 'ru'}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Установить ${config.name || 'Приложение'}</title>
            <link rel="manifest" href="/manifest.json">
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${config.fbPixelId || ''}');
                fbq('track', 'PageView');
            </script>
        </head>
        <body>
            <div class="p-4"><h1>${config.name || 'Приложение'}</h1><p>${config.description || 'Описание отсутствует.'}</p></div>
            <script>
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.register('/service-worker.js');
                }
            </script>
        </body>
        </html>
    `;
};

// --- API Роуты ---
app.get('/api/test', (req, res) => {
    res.status(200).json({ message: 'Бэкенд работает!', firebase: admin.apps.length > 0 ? 'инициализирован' : 'не инициализирован' });
});

app.get('/api/apps', authMiddleware, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Сервис базы данных не инициализирован.' });
    try {
        const appsSnapshot = await db.collection('apps').where('userId', '==', req.user.uid).get();
        const apps = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(apps);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch apps' });
    }
});

app.post('/api/apps', authMiddleware, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Сервис базы данных не инициализирован.' });
    try {
        const newApp = { ...req.body, userId: req.user.uid };
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