import 'reflect-metadata';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'jotai';
import { bootstrap } from './application/di/bootstrap';
import { App } from './App';
import { ToastProvider } from './presentation/components/ui';
import './index.css';

// Initialize DI Container
bootstrap();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </Provider>
  </React.StrictMode>
);
