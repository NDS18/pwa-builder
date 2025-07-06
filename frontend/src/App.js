import React, { useState, useEffect, useContext, createContext } from 'react';
import { UploadCloud, Image as ImageIcon, Settings, ArrowRight, CheckCircle, Globe, Link as LinkIcon, BarChart2, MousePointerClick, Download, X, LogOut } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';

// =================================================================
// КОНФИГУРАЦИЯ И СЕРВИСЫ
// =================================================================

// ВАЖНО: Вставьте сюда ваши реальные ключи из настроек проекта Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyBfRoy1n1_X34PKxu0usj2LHtDLqOYc8n0",
  authDomain: "nds18-b2ece.firebaseapp.com",
  projectId: "nds18-b2ece",
  storageBucket: "nds18-b2ece.firebasestorage.app",
  messagingSenderId: "974414485098",
  appId: "1:974414485098:web:3562e4e61ec7c859d7dc13",
  measurementId: "G-PXMDM1PSY0"
};

let auth;
let firebaseInitializationError = null;

try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (error) {
  console.error("КРИТИЧЕСКАЯ ОШИБКА ИНИЦИАЛИЗАЦИИ FIREBASE:", error);
  firebaseInitializationError = error;
}

const API_BASE_URL = 'https://pwa-builder-two.vercel.app';

const getAuthToken = async () => {
    if (!auth || !auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
};

const authenticatedFetch = async (url, options = {}) => {
    const token = await getAuthToken();
    if (!token) throw new Error('Пользователь не авторизован.');
    const headers = { ...options.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
    }
    return response.json();
};

const api = {
    getApps: () => authenticatedFetch('/api/apps'),
    createApp: (data) => authenticatedFetch('/api/apps', { method: 'POST', body: JSON.stringify(data) }),
    updateApp: (appId, data) => authenticatedFetch(`/api/apps/${appId}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// =================================================================
// КОНТЕКСТ АУТЕНТИФИКАЦИИ (НАДЕЖНАЯ АРХИТЕКТУРА)
// =================================================================

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!auth) {
            setIsLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsLoading(false);
        });
        return unsubscribe; // Очистка подписки при размонтировании
    }, []);

    const value = { user, isLoading };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Кастомный хук для доступа к контексту
const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};


// =================================================================
// КОМПОНЕНТЫ UI (ПОЛНАЯ РЕАЛИЗАЦИЯ)
// =================================================================
const FakePlayStoreModal = ({ appConfig, onClose }) => {
  if (!appConfig) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
      <div className="bg-[#f1f3f5] w-full max-w-md mx-auto rounded-2xl shadow-2xl overflow-hidden font-sans">
        <div className="h-40 bg-gray-300 flex items-center justify-center">
          <ImageIcon size={48} className="text-gray-500" />
        </div>
        <div className="p-4 -mt-12">
          <div className="flex items-end space-x-4">
            <div className="w-24 h-24 rounded-2xl bg-white shadow-lg flex items-center justify-center text-5xl border-4 border-[#f1f3f5]">
              {appConfig.icon ? <img src={appConfig.icon} alt="icon" className="w-full h-full object-cover rounded-2xl" /> : '🖼️'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{appConfig.name || 'Название приложения'}</h1>
              <p className="text-sm font-semibold text-blue-600">{appConfig.developerName || 'Ваша компания'}</p>
              <p className="text-xs text-gray-500 mt-1">Содержит рекламу</p>
            </div>
          </div>

          <div className="flex justify-around text-center my-6">
            <div>
              <div className="font-bold text-gray-700">4.7 ★</div>
              <div className="text-xs text-gray-500">1M отзывов</div>
            </div>
            <div>
              <div className="font-bold text-gray-700"><Download size={16} className="inline-block mb-1" /></div>
              <div className="text-xs text-gray-500">50M+</div>
            </div>
            <div>
              <div className="w-6 h-6 mx-auto border-2 border-green-600 text-green-600 font-bold text-sm flex items-center justify-center rounded-sm">3+</div>
              <div className="text-xs text-gray-500">Возраст</div>
            </div>
          </div>

          <button className="w-full bg-[#00875f] text-white py-3 rounded-full text-lg font-semibold hover:bg-[#007a55] transition">
            Установить
          </button>

          <div className="mt-6">
            <h2 className="font-semibold text-gray-800 mb-2">Об этом приложении</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {appConfig.description || 'Здесь будет описание вашего приложения, которое вы ввели в редакторе. Оно поможет пользователям понять, что делает ваше приложение.'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-1">
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

const GeneralStep = ({ config, setConfig }) => (
  <div className="space-y-6">
    <div>
      <label className="text-sm font-medium text-gray-300 block mb-2">Название приложения</label>
      <input
        type="text"
        value={config.name}
        onChange={e => setConfig({...config, name: e.target.value})}
        placeholder="Например, 'Супер Игра'"
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="text-xs text-gray-400 mt-1">Это название будет отображаться под иконкой на главном экране.</p>
    </div>
    <div>
      <label className="text-sm font-medium text-gray-300 block mb-2">URL для открытия</label>
      <input
        type="url"
        value={config.url}
        onChange={e => setConfig({...config, url: e.target.value})}
        placeholder="https://example.com/my-page"
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="text-xs text-gray-400 mt-1">Этот сайт будет открываться при запуске вашего PWA.</p>
    </div>
     <div>
      <label className="text-sm font-medium text-gray-300 block mb-2">Имя разработчика</label>
      <input
        type="text"
        value={config.developerName}
        onChange={e => setConfig({...config, developerName: e.target.value})}
        placeholder="Ваше имя или название компании"
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="text-xs text-gray-400 mt-1">Отображается на странице загрузки.</p>
    </div>
  </div>
);

const AppearanceStep = ({ config, setConfig }) => {
    const handleIconUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setConfig({...config, icon: reader.result});
            };
            reader.readAsDataURL(file);
        }
    };

    return (
      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-300 block mb-2">Иконка приложения (512x512)</label>
          <div className="mt-2 flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-700 rounded-xl flex items-center justify-center">
              {config.icon ? <img src={config.icon} alt="preview" className="w-full h-full object-cover rounded-xl"/> : <ImageIcon size={32} className="text-gray-500"/>}
            </div>
            <label htmlFor="icon-upload" className="cursor-pointer bg-gray-600 hover:bg-gray-500 text-white font-semibold px-4 py-2 rounded-lg transition">
              Загрузить файл
            </label>
            <input id="icon-upload" type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleIconUpload} />
          </div>
           <p className="text-xs text-gray-400 mt-2">Рекомендуется PNG с прозрачным фоном.</p>
        </div>
        <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Цвет темы</label>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={config.themeColor}
                    onChange={e => setConfig({...config, themeColor: e.target.value})}
                    className="w-10 h-10 p-0 border-none rounded cursor-pointer bg-gray-700"
                />
                <span className="text-gray-300">{config.themeColor}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Цвет для адресной строки браузера на мобильных устройствах.</p>
        </div>
      </div>
    );
};

const StoreListingStep = ({ config, setConfig }) => (
    <div className="space-y-6">
        <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Краткое описание</label>
            <textarea
                value={config.description}
                onChange={e => setConfig({...config, description: e.target.value})}
                rows="4"
                placeholder="Расскажите пользователям о вашем приложении..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
            <p className="text-xs text-gray-400 mt-1">Это описание будет показано на странице загрузки.</p>
        </div>
        <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Язык</label>
            <select
                value={config.language}
                onChange={e => setConfig({...config, language: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="ru">Русский</option>
                <option value="en">Английский</option>
                <option value="es">Испанский</option>
                <option value="pt">Португальский</option>
            </select>
        </div>
        <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Целевые страны (не обязательно)</label>
            <input
                type="text"
                value={config.countries}
                onChange={e => setConfig({...config, countries: e.target.value})}
                placeholder="Например: RU, UA, KZ"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Перечислите двухбуквенные коды стран через запятую.</p>
        </div>
    </div>
);

const TrackingStep = ({ config, setConfig }) => (
    <div className="space-y-6">
        <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Facebook Pixel ID</label>
            <input
                type="text"
                value={config.fbPixelId}
                onChange={e => setConfig({...config, fbPixelId: e.target.value})}
                placeholder="1234567890123456"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Для отслеживания конверсий и событий.</p>
        </div>
        <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">URL для Postback (Keitaro, Binom)</label>
            <input
                type="url"
                value={config.postbackUrl}
                onChange={e => setConfig({...config, postbackUrl: e.target.value})}
                placeholder="https://your-tracker.com/postback"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Мы будем отправлять данные о событиях (установка, запуск) на этот URL. Используйте макросы {`{sub_id}`} и {`{event_name}`}.</p>
        </div>
    </div>
);

const PublishStep = ({ config, setConfig, onPublish, onPreview }) => (
    <div className="space-y-6">
        <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Привязать домен</label>
            <input
                type="text"
                value={config.domain}
                onChange={e => setConfig({...config, domain: e.target.value})}
                placeholder="app.your-domain.com"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Укажите CNAME в настройках вашего домена на <span className="font-mono text-blue-400">publish.pwaservice.io</span></p>
        </div>
        <div className="bg-gray-700/50 p-4 rounded-lg">
            <p className="text-sm text-center text-gray-300">Ваша страница загрузки будет доступна по адресу:</p>
            <p className="text-center font-mono text-blue-400 mt-1 break-all">
                https://{config.domain || 'app.your-domain.com'}
            </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
             <button
                onClick={onPreview}
                className="w-full flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2">
                <MousePointerClick size={20}/>
                Предпросмотр
            </button>
            <button
                onClick={onPublish}
                className="w-full flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2">
                <CheckCircle size={20}/>
                Опубликовать
            </button>
        </div>
    </div>
);

const EditorPage = ({ appData, onBack, onSave }) => {
    const [config, setConfig] = useState(appData || {
        name: '', url: '', developerName: '', icon: null, themeColor: '#1f2937',
        description: '', language: 'ru', countries: '', fbPixelId: '', postbackUrl: '', domain: ''
    });
    const [step, setStep] = useState(1);
    const [showPreview, setShowPreview] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const steps = [
        { id: 1, name: 'Основные', icon: Settings },
        { id: 2, name: 'Внешний вид', icon: ImageIcon },
        { id: 3, name: 'Страница', icon: Globe },
        { id: 4, name: 'Трекинг', icon: BarChart2 },
        { id: 5, name: 'Публикация', icon: LinkIcon },
    ];

    const handleSave = async () => {
        setIsLoading(true);
        setError('');
        try {
            await onSave(config);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 bg-gray-900 min-h-screen">
            {showPreview && <FakePlayStoreModal appConfig={config} onClose={() => setShowPreview(false)} />}
            <button onClick={onBack} className="text-blue-400 hover:text-blue-300 mb-6">&larr; Назад к списку</button>
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <h2 className="text-2xl font-bold text-white mb-6">Настройка PWA</h2>
                        <nav className="space-y-2">
                            {steps.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setStep(s.id)}
                                    className={`w-full text-left flex items-center gap-3 p-3 rounded-lg transition ${step === s.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
                                >
                                    <s.icon size={20} />
                                    <span>{s.name}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                    <div className="lg:col-span-2 bg-gray-900 p-6 rounded-xl">
                        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                        {isLoading && <p className="text-center text-gray-400">Сохранение...</p>}
                        {step === 1 && <GeneralStep config={config} setConfig={setConfig} />}
                        {step === 2 && <AppearanceStep config={config} setConfig={setConfig} />}
                        {step === 3 && <StoreListingStep config={config} setConfig={setConfig} />}
                        {step === 4 && <TrackingStep config={config} setConfig={setConfig} />}
                        {step === 5 && <PublishStep config={config} setConfig={setConfig} onPublish={handleSave} onPreview={() => setShowPreview(true)} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DashboardPage = ({ onSelectApp, onCreateNew, onLogout }) => {
    const [apps, setApps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchApps = async () => {
            try {
                const userApps = await api.getApps();
                setApps(userApps);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchApps();
    }, []);

    return (
        <div className="p-4 sm:p-8 bg-gray-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Ваши PWA-приложения</h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onCreateNew}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105 flex items-center gap-2">
                            <UploadCloud size={20}/>
                            Создать новое
                        </button>
                        <button onClick={onLogout} title="Выйти" className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
                {isLoading && <p className="text-center text-gray-400">Загрузка приложений...</p>}
                {error && <p className="text-center text-red-500">{error}</p>}
                <div className="space-y-4">
                    {apps.map(app => (
                        <div key={app.id} onClick={() => onSelectApp(app)} className="bg-gray-800 p-4 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-700 transition shadow-md">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-2xl">{app.icon ? '🖼️' : '...'}</div>
                                <div>
                                    <h3 className="font-semibold text-white">{app.name}</h3>
                                    <p className="text-sm text-blue-400 font-mono">{app.url}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${app.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {app.status === 'published' ? 'Опубликовано' : 'Черновик'}
                                </span>
                                <ArrowRight size={20} className="text-gray-500"/>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-xl shadow-lg">
                <h1 className="text-3xl font-bold text-center text-white">
                    {isLogin ? 'Вход в систему' : 'Регистрация'}
                </h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:bg-gray-500">
                        {isLoading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Создать аккаунт')}
                    </button>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                </form>
                <p className="text-center text-sm text-gray-400">
                    {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                    <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-blue-400 hover:underline ml-1">
                        {isLogin ? 'Зарегистрироваться' : 'Войти'}
                    </button>
                </p>
            </div>
        </div>
    );
};


// =================================================================
// ГЛАВНЫЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ
// =================================================================

function AppContent() {
    const { user, isLoading } = useAuth();
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [selectedApp, setSelectedApp] = useState(null);

    const handleSelectApp = (app) => {
        setSelectedApp(app);
        setCurrentPage('editor');
    };
    const handleCreateNew = () => {
        setSelectedApp(null);
        setCurrentPage('editor');
    };
    const handleBackToDashboard = () => {
        setCurrentPage('dashboard');
        setSelectedApp(null);
    };
    const handleSaveApp = async (appConfig) => {
        if (selectedApp && selectedApp.id) {
            await api.updateApp(selectedApp.id, appConfig);
        } else {
            await api.createApp(appConfig);
        }
        handleBackToDashboard();
    };
    const handleLogout = async () => {
        await signOut(auth);
    };

    if (isLoading) {
        return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">Загрузка...</div>;
    }
    
    if (!user) {
        return <AuthPage />;
    }

    if (currentPage === 'editor') {
        return <EditorPage appData={selectedApp} onBack={handleBackToDashboard} onSave={handleSaveApp} />;
    }

    return <DashboardPage onSelectApp={handleSelectApp} onCreateNew={handleCreateNew} onLogout={handleLogout} />;
}

export default function App() {
    if (firebaseInitializationError) {
        return (
            <div style={{ color: 'white', backgroundColor: '#111827', padding: '40px', minHeight: '100vh', fontFamily: 'monospace' }}>
                <h1>Критическая ошибка: Не удалось инициализировать Firebase.</h1>
                <p>Пожалуйста, убедитесь, что вы правильно скопировали ключи `firebaseConfig` в файл `src/App.js`.</p>
                <pre style={{ color: '#ff8a8a', background: '#2d2d2d', padding: '20px', borderRadius: '8px', whiteSpace: 'pre-wrap', marginTop: '20px' }}>
                    {firebaseInitializationError.toString()}
                </pre>
            </div>
        );
    }

    return <AppContent />;
}
