import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Automatically update the service worker
const updateSW = registerSW({
  onNeedRefresh() {
    // Optionally alert the user
  },
  onOfflineReady() {
    // Ready to work offline
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
