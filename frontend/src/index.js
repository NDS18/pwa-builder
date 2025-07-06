import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App, { auth } from './App'; // Импортируем auth
import { AuthProvider } from './AuthContext'; // Импортируем из нового файла

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider auth={auth}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);