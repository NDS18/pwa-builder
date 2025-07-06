import React, { useState, useEffect, useContext, createContext } from 'react';
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

// =================================================================
// КОНТЕКСТ АУТЕНТИФИКАЦИИ (НАДЕЖНАЯ АРХИТЕКТУРА)
// =================================================================

const AuthContext = createContext();

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
export const useAuth = () => {
    return useContext(AuthContext);
};


// =================================================================
// КОМПОНЕНТЫ СТРАНИЦ (УПРОЩЕННЫЕ)
// =================================================================

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

const WelcomePage = () => {
    const { user } = useAuth();
    const handleLogout = async () => {
        await signOut(auth);
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-8">
            <h1 className="text-4xl font-bold mb-4">Добро пожаловать!</h1>
            <p className="text-lg text-gray-400 mb-8">Вы успешно вошли как {user.email}</p>
            <p className="text-center max-w-md mb-8">Это базовый рабочий шаблон. Следующим шагом мы добавим сюда дашборд и редактор PWA.</p>
            <button 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition"
            >
                Выйти
            </button>
        </div>
    );
};


// =================================================================
// ГЛАВНЫЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ
// =================================================================

export default function App() {
    const { user, isLoading } = useAuth();

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

    if (isLoading) {
        return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">Загрузка...</div>;
    }

    return user ? <WelcomePage /> : <AuthPage />;
}
