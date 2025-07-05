import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App, { ErrorBoundary } from './App'; // ИСПРАВЛЕНИЕ: Импортируем App и ErrorBoundary

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
