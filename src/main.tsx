// Must stay the first import: shows a readable error instead of a blank page
// when the Supabase env is missing (see src/configGuard.ts).
import './configGuard';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { applyTheme, readTheme } from './lib/theme';
import './index.css';

// Apply the saved appearance before the first render (no flash of the wrong theme).
applyTheme(readTheme());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
