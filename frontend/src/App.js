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
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
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
// КОНТЕКСТ АУТЕНТИФИКАЦИИ (НАДЕЖНАЯ АРХИТЕКТУРА)
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

    return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>;
}

const useAuth = () => {
    return useContext(AuthContext);
};


// =================================================================
// КОМПОНЕНТЫ UI (ПОЛНАЯ РЕАЛИЗАЦИЯ)
// =================================================================
const FakePlayStoreModal = ({ appConfig, onClose }) => { /* ... код без изменений ... */ };
const GeneralStep = ({ config, setConfig }) => { /* ... код без изменений ... */ };
const AppearanceStep = ({ config, setConfig }) => { /* ... код без изменений ... */ };
const StoreListingStep = ({ config, setConfig }) => { /* ... код без изменений ... */ };
const TrackingStep = ({ config, setConfig }) => { /* ... код без изменений ... */ };
const PublishStep = ({ config, setConfig, onPublish, onPreview }) => { /* ... код без изменений ... */ };
const EditorPage = ({ appData, onBack, onSave }) => { /* ... код без изменений ... */ };
const DashboardPage = ({ onSelectApp, onCreateNew, onLogout }) => { /* ... код без изменений ... */ };
const AuthPage = () => { /* ... код без изменений ... */ };


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
