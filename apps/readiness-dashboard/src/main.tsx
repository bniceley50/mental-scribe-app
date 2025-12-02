import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress React DevTools message in production
if (import.meta.env.PROD) {
  // React DevTools suppression removed to satisfy no-console rule
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
