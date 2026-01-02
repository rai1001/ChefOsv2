import 'reflect-metadata';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { bootstrap } from './application/di/bootstrap';
import { App } from './App';
import { ToastProvider } from './presentation/components/ui';
import './index.css';

import { AuthWrapper } from './presentation/components/auth/AuthWrapper';

// Initialize DI Container
bootstrap();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthWrapper>
        <App />
      </AuthWrapper>
    </ToastProvider>
  </React.StrictMode>
);
