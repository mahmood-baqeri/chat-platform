// web/src/main.tsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ✅ مدیریت پیام‌های Service Worker
function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    });

    // ✅ گوش دادن به پیام‌های Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data;
      if (data?.type === 'OPEN_CHAT' && data?.chatId) {
        // ارسال رویداد به App برای باز کردن چت
        window.dispatchEvent(new CustomEvent('sw-open-chat', {
          detail: { chatId: data.chatId }
        }));
      }
    });
  }
}

setupServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);