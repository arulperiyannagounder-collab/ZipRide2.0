import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './components/ThemeContext.tsx';
import { ToastProvider } from './components/ToastNotification.tsx';

// Override global dialog mechanisms to prevent Maps warning popups
if (typeof window !== 'undefined') {
  const originalAlert = window.alert;
  window.alert = function (message) {
    if (String(message).includes('Google Maps') || String(message).includes('Google')) {
      console.warn('[ZipRide Maps Alert Suppressed]:', message);
      window.dispatchEvent(new CustomEvent('google-maps-warning', { detail: { message } }));
      return;
    }
    return originalAlert.apply(this, arguments as any);
  };
  (window as any).gm_authFailure = function () {
    console.warn('[ZipRide Console Warning]: Google Maps Auth Failure - Map service temporarily unavailable.');
    window.dispatchEvent(new CustomEvent('google-maps-auth-failure'));
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
);

