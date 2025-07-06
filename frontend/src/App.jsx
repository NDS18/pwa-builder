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
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("YOUR_API_KEY")) {
    throw new Error("Ключи Firebase не настроены. Пожалуйста, вставьте ваши реальные ключи в firebaseConfig.");
  }
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
// КОНТЕКСТ АУТЕНТИФИКАЦИИ
// =================================================================

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
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
        return unsubscribe;
    }, []);

    const value = { user, isLoading };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const useAuth = () => {
    return useContext(AuthContext);
};


// =================================================================
// КОМПОНЕНТЫ UI
// =================================================================
const FakePlayStoreModal = ({ appConfig, onClose }) => {
  if (!appConfig) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
      <div className="bg-[#f1f3f5] w-full max-w-md mx-auto rounded-2xl shadow-2xl overflow-hidden font-sans">
        <div className="h-40 bg-gray-300 flex items-center justify-center"><ImageIcon size={48} className="text-gray-500" /></div>
        <div className="p-4 -mt-12">
          <div className="flex items-end space-x-4">
            <div className="w-24 h-24 rounded-2xl bg-white shadow-lg flex items-center justify-center text-5xl border-4 border-[#f1f3f5]">
              {appConfig.icon ? <img src={appConfig.icon} alt="icon" className="w-full h-full object-cover rounded-2xl" /> : '🖼️'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{appConfig.name || 'Название'}</h1>
              <p className="text-sm font-semibold text-blue-600">{appConfig.developerName || 'Компания'}</p>
            </div>
          </div>
          <button className="w-full mt-6 bg-[#00875f] text-white py-3 rounded-full text-lg font-semibold hover:bg-[#007a55] transition">Установить</button>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-1"><X size={20} /></button>
      </div>
    </div>
  );
};

const EditorPage = ({ appData, onBack, onSave }) => {
    const [config, setConfig] = useState(appData || {});
    return (
        <div className="p-8 text-white">
            <h1 className="text-3xl font-bold mb-4">Редактор</h1>
            <p className="mb-4">Здесь будет редактор для приложения: {appData?.name || "Новое приложение"}</p>
            <button onClick={onBack} className="bg-gray-600 px-4 py-2 rounded-lg">Назад</button>
        </div>
    );
};

const DashboardPage = ({ onSelectApp, onCreateNew, onLogout }) => {
    const [apps, setApps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        api.getApps().then(setApps).finally(() => setIsLoading(false));
    }, []);

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Ваши PWA</h1>
                    <div className="flex items-center gap-4">
                        <button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><UploadCloud size={20}/>Создать</button>
                        <button onClick={onLogout} title="Выйти" className="p-2 text-gray-400 hover:text-white"><LogOut size={20} /></button>
                    </div>
                </div>
                {isLoading ? <p className="text-gray-400">Загрузка...</p> : (
                    <div className="space-y-4">
                        {apps.map(app => (
                            <div key={app.id} onClick={() => onSelectApp(app)} className="bg-gray-800 p-4 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-700">
                                <div>
                                    <h3 className="font-semibold text-white">{app.name}</h3>
                                    <p className="text-sm text-blue-400">{app.url}</p>
                                </div>
                                <ArrowRight size={20} className="text-gray-500"/>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const AuthPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            try {
                await createUserWithEmailAndPassword(auth, email, password);
            } catch (createErr) {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-xl shadow-lg">
                <h1 className="text-3xl font-bold text-center text-white">Вход или Регистрация</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:bg-gray-500">
                        {isLoading ? 'Загрузка...' : 'Войти / Создать аккаунт'}
                    </button>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                </form>
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

    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
